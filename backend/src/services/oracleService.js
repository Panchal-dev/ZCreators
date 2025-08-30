import { Project, Milestone, User, Audit } from '../models/index.js'
import { blockchainService } from '../utils/blockchain.js'
import logger from '../utils/logger.js'

class OracleService {
  constructor() {
    this.dataProviders = new Map()
    this.verificationThreshold = 0.75 // 75% consensus required
    this.initialize()
  }

  initialize() {
    // Initialize data providers
    this.dataProviders.set('weather', {
      name: 'Weather Oracle',
      endpoint: process.env.WEATHER_API_URL,
      apiKey: process.env.WEATHER_API_KEY,
      weight: 0.3
    })

    this.dataProviders.set('energy', {
      name: 'Energy Oracle',
      endpoint: process.env.ENERGY_API_URL,
      apiKey: process.env.ENERGY_API_KEY,
      weight: 0.4
    })

    this.dataProviders.set('certification', {
      name: 'Certification Oracle',
      endpoint: process.env.CERT_API_URL,
      apiKey: process.env.CERT_API_KEY,
      weight: 0.3
    })

    logger.info('Oracle service initialized with data providers')
  }

  // Fetch external data for milestone verification
  async fetchMilestoneData(milestone, project) {
    try {
      const results = []

      // Fetch data from multiple sources
      for (const [providerId, provider] of this.dataProviders) {
        try {
          const data = await this.fetchFromProvider(providerId, milestone, project)
          if (data) {
            results.push({
              providerId,
              providerName: provider.name,
              data,
              weight: provider.weight,
              timestamp: new Date(),
              verified: true
            })
          }
        } catch (error) {
          logger.error(`Failed to fetch data from ${provider.name}:`, error)
          results.push({
            providerId,
            providerName: provider.name,
            error: error.message,
            weight: provider.weight,
            timestamp: new Date(),
            verified: false
          })
        }
      }

      // Aggregate and verify data
      const aggregatedData = this.aggregateOracleData(results)
      
      // Store oracle data in milestone
      milestone.oracleData = {
        dataSource: 'Multiple Oracles',
        lastUpdated: new Date(),
        verificationHash: this.generateVerificationHash(aggregatedData),
        data: aggregatedData
      }

      await milestone.save()

      // Log oracle data update
      await Audit.createAuditLog({
        eventType: 'oracle_data_update',
        resource: {
          type: 'milestone',
          id: milestone._id.toString(),
          name: milestone.title
        },
        action: 'update',
        description: `Oracle data updated for milestone: ${milestone.title}`,
        category: 'system',
        severity: 'low',
        context: {
          providersUsed: results.length,
          verificationScore: aggregatedData.verificationScore
        }
      })

      return aggregatedData

    } catch (error) {
      logger.error('Failed to fetch milestone oracle data:', error)
      throw error
    }
  }

  // Fetch data from specific provider
  async fetchFromProvider(providerId, milestone, project) {
    const provider = this.dataProviders.get(providerId)
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`)
    }

    switch (providerId) {
      case 'weather':
        return await this.fetchWeatherData(milestone, project, provider)
      
      case 'energy':
        return await this.fetchEnergyData(milestone, project, provider)
      
      case 'certification':
        return await this.fetchCertificationData(milestone, project, provider)
      
      default:
        throw new Error(`Unknown provider: ${providerId}`)
    }
  }

  // Fetch weather data for renewable energy verification
  async fetchWeatherData(milestone, project, provider) {
    try {
      if (!provider.endpoint || !project.location?.coordinates) {
        return null
      }

      const { latitude, longitude } = project.location.coordinates
      const response = await fetch(
        `${provider.endpoint}/weather?lat=${latitude}&lon=${longitude}&appid=${provider.apiKey}`
      )

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`)
      }

      const data = await response.json()
      
      return {
        temperature: data.main?.temp,
        humidity: data.main?.humidity,
        windSpeed: data.wind?.speed,
        cloudiness: data.clouds?.all,
        solarIrradiance: this.calculateSolarIrradiance(data),
        weatherCondition: data.weather?.[0]?.main,
        timestamp: new Date(data.dt * 1000)
      }

    } catch (error) {
      logger.error('Weather data fetch failed:', error)
      return null
    }
  }

  // Fetch energy production/consumption data
  async fetchEnergyData(milestone, project, provider) {
    try {
      if (!provider.endpoint) {
        return null
      }

      // Mock energy data - in production, integrate with actual energy meters
      const response = await fetch(
        `${provider.endpoint}/energy/${project.projectId}?apiKey=${provider.apiKey}`
      )

      if (!response.ok) {
        throw new Error(`Energy API error: ${response.status}`)
      }

      const data = await response.json()
      
      return {
        energyProduced: data.production?.total,
        energyConsumed: data.consumption?.total,
        efficiency: data.efficiency,
        carbonOffset: data.carbonMetrics?.offset,
        renewablePercentage: data.renewablePercentage,
        timestamp: new Date(data.timestamp)
      }

    } catch (error) {
      logger.error('Energy data fetch failed:', error)
      return null
    }
  }

  // Fetch certification and compliance data
  async fetchCertificationData(milestone, project, provider) {
    try {
      if (!provider.endpoint) {
        return null
      }

      // Mock certification data - integrate with actual certification bodies
      const response = await fetch(
        `${provider.endpoint}/certifications/${project.projectId}?apiKey=${provider.apiKey}`
      )

      if (!response.ok) {
        throw new Error(`Certification API error: ${response.status}`)
      }

      const data = await response.json()
      
      return {
        certificationStatus: data.status,
        certificationNumber: data.certNumber,
        issuedBy: data.issuer,
        validUntil: new Date(data.validUntil),
        complianceScore: data.complianceScore,
        violations: data.violations || [],
        timestamp: new Date()
      }

    } catch (error) {
      logger.error('Certification data fetch failed:', error)
      return null
    }
  }

  // Aggregate data from multiple oracle sources
  aggregateOracleData(results) {
    const validResults = results.filter(r => r.verified && r.data)
    
    if (validResults.length === 0) {
      return {
        verificationScore: 0,
        consensus: false,
        aggregatedData: null,
        sources: results
      }
    }

    // Calculate weighted average for numerical values
    const aggregatedData = {}
    const totalWeight = validResults.reduce((sum, r) => sum + r.weight, 0)

    // Aggregate weather data
    if (validResults.some(r => r.data.temperature !== undefined)) {
      const weatherData = validResults
        .filter(r => r.data.temperature !== undefined)
        .reduce((acc, r) => {
          acc.temperature += (r.data.temperature * r.weight) / totalWeight
          acc.humidity += (r.data.humidity * r.weight) / totalWeight
          acc.windSpeed += (r.data.windSpeed * r.weight) / totalWeight
          return acc
        }, { temperature: 0, humidity: 0, windSpeed: 0 })
      
      aggregatedData.weather = weatherData
    }

    // Aggregate energy data
    if (validResults.some(r => r.data.energyProduced !== undefined)) {
      const energyData = validResults
        .filter(r => r.data.energyProduced !== undefined)
        .reduce((acc, r) => {
          acc.energyProduced += (r.data.energyProduced * r.weight) / totalWeight
          acc.efficiency += (r.data.efficiency * r.weight) / totalWeight
          return acc
        }, { energyProduced: 0, efficiency: 0 })
      
      aggregatedData.energy = energyData
    }

    // Calculate verification score
    const verificationScore = totalWeight / this.getTotalPossibleWeight()
    const consensus = verificationScore >= this.verificationThreshold

    return {
      verificationScore,
      consensus,
      aggregatedData,
      sources: results,
      lastUpdated: new Date()
    }
  }

  // Calculate solar irradiance from weather data
  calculateSolarIrradiance(weatherData) {
    if (!weatherData.clouds) return null

    // Simplified calculation - in production, use more sophisticated models
    const cloudiness = weatherData.clouds.all || 0
    const maxIrradiance = 1000 // W/m² (typical peak solar irradiance)
    
    return maxIrradiance * (1 - (cloudiness / 100) * 0.8)
  }

  // Generate verification hash for data integrity
  generateVerificationHash(data) {
    const crypto = require('crypto')
    const dataString = JSON.stringify(data, null, 0)
    return crypto.createHash('sha256').update(dataString).digest('hex')
  }

  // Get total possible weight from all providers
  getTotalPossibleWeight() {
    return Array.from(this.dataProviders.values())
      .reduce((sum, provider) => sum + provider.weight, 0)
  }

  // Verify milestone completion using oracle data
  async verifyMilestoneCompletion(milestoneId) {
    try {
      const milestone = await Milestone.findById(milestoneId).populate('project')
      
      if (!milestone) {
        throw new Error('Milestone not found')
      }

      // Fetch latest oracle data
      const oracleData = await this.fetchMilestoneData(milestone, milestone.project)
      
      // Apply verification rules based on milestone category
      const verificationResult = this.applyVerificationRules(milestone, oracleData)
      
      return {
        milestoneId: milestone._id,
        verified: verificationResult.passed,
        confidence: oracleData.verificationScore,
        details: verificationResult.details,
        oracleData: oracleData.aggregatedData,
        timestamp: new Date()
      }

    } catch (error) {
      logger.error('Milestone verification failed:', error)
      throw error
    }
  }

  // Apply verification rules based on milestone type
  applyVerificationRules(milestone, oracleData) {
    const rules = []
    let passed = true
    const details = []

    switch (milestone.category) {
      case 'Performance Milestone':
        // Check energy production targets
        if (milestone.technicalSpecs?.performanceTargets) {
          for (const target of milestone.technicalSpecs.performanceTargets) {
            const actualValue = this.extractActualValue(oracleData.aggregatedData, target.parameter)
            
            if (actualValue !== null) {
              const achieved = actualValue >= target.targetValue
              rules.push({
                parameter: target.parameter,
                target: target.targetValue,
                actual: actualValue,
                achieved
              })
              
              if (!achieved) {
                passed = false
                details.push(`${target.parameter} target not met: ${actualValue} < ${target.targetValue}`)
              }
            }
          }
        }
        break

      case 'Construction':
        // Verify construction progress through documentation
        if (!oracleData.consensus) {
          passed = false
          details.push('Insufficient oracle consensus for construction verification')
        }
        break

      case 'Testing & Commissioning':
        // Verify test results and compliance
        if (oracleData.aggregatedData?.certification?.complianceScore < 0.8) {
          passed = false
          details.push('Compliance score below required threshold')
        }
        break

      default:
        // Default verification based on consensus
        if (!oracleData.consensus) {
          passed = false
          details.push('Oracle verification consensus not achieved')
        }
    }

    return {
      passed: passed && oracleData.consensus,
      rules,
      details,
      consensusScore: oracleData.verificationScore
    }
  }

  // Extract actual value from oracle data for comparison
  extractActualValue(oracleData, parameter) {
    if (!oracleData) return null

    const parameterMap = {
      'energy_production': oracleData.energy?.energyProduced,
      'efficiency': oracleData.energy?.efficiency,
      'renewable_percentage': oracleData.energy?.renewablePercentage,
      'carbon_offset': oracleData.energy?.carbonOffset,
      'temperature': oracleData.weather?.temperature,
      'solar_irradiance': oracleData.weather?.solarIrradiance
    }

    return parameterMap[parameter.toLowerCase()] || null
  }

  // Health check for oracle services
  async healthCheck() {
    const results = {}
    
    for (const [providerId, provider] of this.dataProviders) {
      try {
        if (provider.endpoint) {
          const response = await fetch(`${provider.endpoint}/health`, {
            timeout: 5000
          })
          results[providerId] = {
            status: response.ok ? 'healthy' : 'unhealthy',
            responseTime: Date.now() - startTime
          }
        } else {
          results[providerId] = {
            status: 'not_configured',
            message: 'No endpoint configured'
          }
        }
      } catch (error) {
        results[providerId] = {
          status: 'error',
          error: error.message
        }
      }
    }

    return {
      overall: Object.values(results).every(r => r.status === 'healthy') ? 'healthy' : 'degraded',
      providers: results,
      timestamp: new Date()
    }
  }
}

// Create singleton instance
export const oracleService = new OracleService()

export default OracleService
