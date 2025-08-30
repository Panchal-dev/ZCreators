import { ethers } from 'ethers'
import logger from './logger.js'

// Contract ABI for Green Hydrogen Subsidy Contract
export const CONTRACT_ABI = [
  // Project Management
  {
    "inputs": [
      {"name": "_projectId", "type": "string"},
      {"name": "_producer", "type": "address"},
      {"name": "_totalSubsidy", "type": "uint256"},
      {"name": "_metadata", "type": "string"}
    ],
    "name": "createProject",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Milestone Management
  {
    "inputs": [
      {"name": "_projectId", "type": "string"},
      {"name": "_milestoneId", "type": "string"},
      {"name": "_subsidyAmount", "type": "uint256"},
      {"name": "_dueDate", "type": "uint256"}
    ],
    "name": "createMilestone",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Subsidy Release
  {
    "inputs": [
      {"name": "_milestoneId", "type": "string"},
      {"name": "_producer", "type": "address"}
    ],
    "name": "releaseSubsidy",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "projectId", "type": "string"},
      {"indexed": true, "name": "producer", "type": "address"},
      {"indexed": false, "name": "totalSubsidy", "type": "uint256"}
    ],
    "name": "ProjectCreated",
    "type": "event"
  },
  
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "milestoneId", "type": "string"},
      {"indexed": true, "name": "producer", "type": "address"},
      {"indexed": false, "name": "amount", "type": "uint256"}
    ],
    "name": "SubsidyReleased",
    "type": "event"
  }
]

// Blockchain service class
export class BlockchainService {
  constructor() {
    this.provider = null
    this.wallet = null
    this.contract = null
    this.initialized = false
    this.init()
  }

  async init() {
    try {
      // Initialize provider
      if (process.env.BLOCKCHAIN_NETWORK === 'localhost') {
        this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545')
      } else {
        this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL)
      }

      // Initialize wallet
      if (process.env.PRIVATE_KEY) {
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider)
        logger.info('Blockchain wallet initialized:', this.wallet.address)
      } else {
        logger.warn('No private key provided for blockchain operations')
      }

      // Initialize contract
      if (process.env.CONTRACT_ADDRESS && this.wallet) {
        this.contract = new ethers.Contract(
          process.env.CONTRACT_ADDRESS,
          CONTRACT_ABI,
          this.wallet
        )
        logger.info('Smart contract initialized:', process.env.CONTRACT_ADDRESS)
      }

      // Test connection
      await this.testConnection()
      this.initialized = true
      logger.info('Blockchain service initialized successfully')

    } catch (error) {
      logger.error('Blockchain service initialization failed:', error)
      this.initialized = false
    }
  }

  async testConnection() {
    try {
      if (this.provider) {
        const network = await this.provider.getNetwork()
        logger.info('Connected to blockchain network:', {
          name: network.name,
          chainId: network.chainId.toString()
        })

        if (this.wallet) {
          const balance = await this.provider.getBalance(this.wallet.address)
          logger.info('Wallet balance:', ethers.formatEther(balance), 'ETH')
        }
      }
    } catch (error) {
      logger.error('Blockchain connection test failed:', error)
      throw error
    }
  }

  // Create project on blockchain
  async createProject(projectId, producerAddress, totalSubsidy, metadata = '') {
    try {
      if (!this.initialized || !this.contract) {
        throw new Error('Blockchain service not initialized')
      }

      logger.info('Creating project on blockchain:', { projectId, producerAddress, totalSubsidy })

      const tx = await this.contract.createProject(
        projectId,
        producerAddress,
        ethers.parseEther(totalSubsidy.toString()),
        metadata,
        {
          gasLimit: 500000 // Adjust based on contract complexity
        }
      )

      logger.info('Project creation transaction sent:', tx.hash)
      const receipt = await tx.wait()
      logger.info('Project creation confirmed:', receipt.hash)

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      }

    } catch (error) {
      logger.error('Project creation failed:', error)
      throw error
    }
  }

  // Create milestone on blockchain
  async createMilestone(projectId, milestoneId, subsidyAmount, dueDate) {
    try {
      if (!this.initialized || !this.contract) {
        throw new Error('Blockchain service not initialized')
      }

      logger.info('Creating milestone on blockchain:', { projectId, milestoneId, subsidyAmount })

      const tx = await this.contract.createMilestone(
        projectId,
        milestoneId,
        ethers.parseEther(subsidyAmount.toString()),
        Math.floor(new Date(dueDate).getTime() / 1000),
        {
          gasLimit: 300000
        }
      )

      logger.info('Milestone creation transaction sent:', tx.hash)
      const receipt = await tx.wait()
      logger.info('Milestone creation confirmed:', receipt.hash)

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      }

    } catch (error) {
      logger.error('Milestone creation failed:', error)
      throw error
    }
  }

  // Release subsidy for milestone
  async releaseSubsidy(milestoneId, producerAddress) {
    try {
      if (!this.initialized || !this.contract) {
        throw new Error('Blockchain service not initialized')
      }

      logger.info('Releasing subsidy on blockchain:', { milestoneId, producerAddress })

      const tx = await this.contract.releaseSubsidy(
        milestoneId,
        producerAddress,
        {
          gasLimit: 200000
        }
      )

      logger.info('Subsidy release transaction sent:', tx.hash)
      const receipt = await tx.wait()
      logger.info('Subsidy release confirmed:', receipt.hash)

      // Parse events from the transaction
      const subsidyReleasedEvent = receipt.logs.find(log => {
        try {
          const parsed = this.contract.interface.parseLog(log)
          return parsed.name === 'SubsidyReleased'
        } catch {
          return false
        }
      })

      let eventData = null
      if (subsidyReleasedEvent) {
        const parsed = this.contract.interface.parseLog(subsidyReleasedEvent)
        eventData = {
          milestoneId: parsed.args.milestoneId,
          producer: parsed.args.producer,
          amount: ethers.formatEther(parsed.args.amount)
        }
      }

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        eventData
      }

    } catch (error) {
      logger.error('Subsidy release failed:', error)
      throw error
    }
  }

  // Get transaction details
  async getTransaction(txHash) {
    try {
      if (!this.provider) {
        throw new Error('Blockchain provider not initialized')
      }

      const tx = await this.provider.getTransaction(txHash)
      const receipt = await this.provider.getTransactionReceipt(txHash)

      return {
        transaction: {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: ethers.formatEther(tx.value),
          gasPrice: tx.gasPrice.toString(),
          gasLimit: tx.gasLimit.toString(),
          nonce: tx.nonce,
          blockNumber: tx.blockNumber
        },
        receipt: receipt ? {
          status: receipt.status,
          gasUsed: receipt.gasUsed.toString(),
          blockNumber: receipt.blockNumber,
          logs: receipt.logs
        } : null
      }

    } catch (error) {
      logger.error('Failed to get transaction details:', error)
      throw error
    }
  }

  // Verify wallet signature
  async verifySignature(message, signature, expectedAddress) {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature)
      return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase()
    } catch (error) {
      logger.error('Signature verification failed:', error)
      return false
    }
  }

  // Get current gas price
  async getGasPrice() {
    try {
      if (!this.provider) {
        throw new Error('Blockchain provider not initialized')
      }

      const gasPrice = await this.provider.getFeeData()
      return {
        gasPrice: gasPrice.gasPrice.toString(),
        maxFeePerGas: gasPrice.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas?.toString()
      }
    } catch (error) {
      logger.error('Failed to get gas price:', error)
      throw error
    }
  }

  // Get account balance
  async getBalance(address) {
    try {
      if (!this.provider) {
        throw new Error('Blockchain provider not initialized')
      }

      const balance = await this.provider.getBalance(address)
      return ethers.formatEther(balance)
    } catch (error) {
      logger.error('Failed to get balance:', error)
      throw error
    }
  }

  // Listen to contract events
  setupEventListeners() {
    if (!this.contract) {
      logger.warn('Cannot setup event listeners: contract not initialized')
      return
    }

    // Listen for ProjectCreated events
    this.contract.on('ProjectCreated', (projectId, producer, totalSubsidy, event) => {
      logger.info('ProjectCreated event:', {
        projectId,
        producer,
        totalSubsidy: ethers.formatEther(totalSubsidy),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      })
    })

    // Listen for SubsidyReleased events
    this.contract.on('SubsidyReleased', (milestoneId, producer, amount, event) => {
      logger.info('SubsidyReleased event:', {
        milestoneId,
        producer,
        amount: ethers.formatEther(amount),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      })
    })

    logger.info('Blockchain event listeners setup complete')
  }

  // Cleanup resources
  cleanup() {
    if (this.contract) {
      this.contract.removeAllListeners()
    }
    this.initialized = false
    logger.info('Blockchain service cleanup complete')
  }
}

// Create singleton instance
export const blockchainService = new BlockchainService()

// Utility functions
export const isValidAddress = (address) => {
  return ethers.isAddress(address)
}

export const isValidTxHash = (hash) => {
  return /^0x[a-fA-F0-9]{64}$/.test(hash)
}

export const formatEther = (value) => {
  return ethers.formatEther(value)
}

export const parseEther = (value) => {
  return ethers.parseEther(value.toString())
}
