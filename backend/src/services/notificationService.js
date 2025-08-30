import cron from 'node-cron'
import { Milestone, Project, User } from '../models/index.js'
import { sendEmail, emailTemplates } from '../utils/email.js'
import logger from '../utils/logger.js'

class NotificationService {
  constructor() {
    this.jobs = new Map()
    this.initialize()
  }

  initialize() {
    // Check for overdue milestones every day at 9 AM
    this.scheduleJob('overdue-check', '0 9 * * *', this.checkOverdueMilestones)
    
    // Send milestone due reminders every day at 8 AM
    this.scheduleJob('due-reminders', '0 8 * * *', this.sendDueReminders)
    
    // Weekly project status summary (Sundays at 10 AM)
    this.scheduleJob('weekly-summary', '0 10 * * 0', this.sendWeeklySummary)

    logger.info('Notification service initialized with scheduled jobs')
  }

  scheduleJob(name, cronExpression, jobFunction) {
    const job = cron.schedule(cronExpression, async () => {
      try {
        logger.info(`Running scheduled job: ${name}`)
        await jobFunction.call(this)
        logger.info(`Completed scheduled job: ${name}`)
      } catch (error) {
        logger.error(`Error in scheduled job ${name}:`, error)
      }
    }, {
      scheduled: true,
      timezone: process.env.TIMEZONE || 'Asia/Kolkata'
    })

    this.jobs.set(name, job)
    logger.info(`Scheduled job '${name}' with expression: ${cronExpression}`)
  }

  // Check for overdue milestones and update status
  async checkOverdueMilestones() {
    try {
      const today = new Date()
      
      const overdueMilestones = await Milestone.find({
        plannedEndDate: { $lt: today },
        status: { $in: ['pending', 'in_progress'] },
        isActive: true
      }).populate('project', 'name producer')

      for (const milestone of overdueMilestones) {
        // Update milestone status
        milestone.status = 'overdue'
        await milestone.save()

        // Send notification to producer
        if (milestone.project.producer) {
          const producer = await User.findById(milestone.project.producer)
          if (producer && producer.email) {
            await this.sendOverdueNotification(producer, milestone, milestone.project)
          }
        }
      }

      if (overdueMilestones.length > 0) {
        logger.info(`Updated ${overdueMilestones.length} overdue milestones`)
      }

    } catch (error) {
      logger.error('Error checking overdue milestones:', error)
    }
  }

  // Send due date reminders
  async sendDueReminders() {
    try {
      const today = new Date()
      const reminderDate = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000)) // 3 days ahead
      
      const upcomingMilestones = await Milestone.find({
        plannedEndDate: { $gte: today, $lte: reminderDate },
        status: { $in: ['pending', 'in_progress'] },
        isActive: true
      })
        .populate('project', 'name producer')
        .populate('project.producer', 'name email')

      for (const milestone of upcomingMilestones) {
        if (milestone.project?.producer?.email) {
          const daysUntilDue = Math.ceil((milestone.plannedEndDate - today) / (1000 * 60 * 60 * 24))
          await this.sendDueReminder(milestone.project.producer, milestone, milestone.project, daysUntilDue)
        }
      }

      if (upcomingMilestones.length > 0) {
        logger.info(`Sent due date reminders for ${upcomingMilestones.length} milestones`)
      }

    } catch (error) {
      logger.error('Error sending due reminders:', error)
    }
  }

  // Send weekly project status summary
  async sendWeeklySummary() {
    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      
      // Get government users for summary reports
      const governmentUsers = await User.find({ 
        role: 'government', 
        isActive: true,
        'preferences.notifications.weeklyReports': { $ne: false }
      })

      for (const user of governmentUsers) {
        const summary = await this.generateWeeklySummary(oneWeekAgo)
        await this.sendWeeklySummaryEmail(user, summary)
      }

      logger.info(`Sent weekly summaries to ${governmentUsers.length} government users`)

    } catch (error) {
      logger.error('Error sending weekly summaries:', error)
    }
  }

  // Generate weekly summary data
  async generateWeeklySummary(sinceDate) {
    try {
      const [
        newProjects,
        completedMilestones,
        releasedSubsidies,
        overdueCount
      ] = await Promise.all([
        Project.countDocuments({ 
          createdAt: { $gte: sinceDate },
          isActive: true
        }),
        
        Milestone.countDocuments({
          actualEndDate: { $gte: sinceDate },
          status: 'completed',
          isActive: true
        }),
        
        Milestone.aggregate([
          {
            $match: {
              releaseDate: { $gte: sinceDate },
              released: true,
              isActive: true
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$subsidyAmount' },
              count: { $sum: 1 }
            }
          }
        ]),
        
        Milestone.countDocuments({
          status: 'overdue',
          isActive: true
        })
      ])

      return {
        newProjects,
        completedMilestones,
        releasedSubsidies: releasedSubsidies[0] || { total: 0, count: 0 },
        overdueCount,
        weekStarting: sinceDate.toISOString().split('T')[0]
      }

    } catch (error) {
      logger.error('Error generating weekly summary:', error)
      throw error
    }
  }

  // Send individual notification emails
  async sendOverdueNotification(user, milestone, project) {
    try {
      await sendEmail({
        to: user.email,
        subject: `⚠️ Milestone Overdue: ${milestone.title}`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <h2 style="color: #dc3545;">⚠️ Milestone Overdue</h2>
            <p>Dear ${user.name},</p>
            <p>The following milestone is now <strong>overdue</strong>:</p>
            
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #721c24; margin-top: 0;">Milestone Details:</h3>
              <p><strong>Title:</strong> ${milestone.title}</p>
              <p><strong>Project:</strong> ${project.name}</p>
              <p><strong>Due Date:</strong> ${new Date(milestone.plannedEndDate).toLocaleDateString()}</p>
              <p><strong>Subsidy Amount:</strong> ₹${milestone.subsidyAmount.toLocaleString()}</p>
            </div>

            <p>Please take immediate action to complete this milestone to avoid further delays in subsidy release.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}/milestones/${milestone._id}" 
                 style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Milestone
              </a>
            </div>

            <p>Best regards,<br>Green Hydrogen Platform Team</p>
          </div>
        `
      })

      logger.info(`Sent overdue notification to ${user.email} for milestone ${milestone._id}`)

    } catch (error) {
      logger.error(`Failed to send overdue notification to ${user.email}:`, error)
    }
  }

  async sendDueReminder(user, milestone, project, daysUntilDue) {
    try {
      const template = emailTemplates.milestoneDue(user, milestone, project, daysUntilDue)
      await sendEmail({
        to: user.email,
        ...template
      })

      logger.info(`Sent due reminder to ${user.email} for milestone ${milestone._id}`)

    } catch (error) {
      logger.error(`Failed to send due reminder to ${user.email}:`, error)
    }
  }

  async sendWeeklySummaryEmail(user, summary) {
    try {
      await sendEmail({
        to: user.email,
        subject: `Weekly Platform Summary - Week of ${summary.weekStarting}`,
        html: `
          <div style="max-width: 700px; margin: 0 auto; font-family: Arial, sans-serif;">
            <h2 style="color: #2c5530;">📊 Weekly Platform Summary</h2>
            <p>Dear ${user.name},</p>
            <p>Here's your weekly summary for the Green Hydrogen Platform:</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0;">
              <div style="background: #d4edda; padding: 20px; border-radius: 8px; text-align: center;">
                <h3 style="color: #155724; margin: 0;">${summary.newProjects}</h3>
                <p style="margin: 5px 0;">New Projects</p>
              </div>
              <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; text-align: center;">
                <h3 style="color: #0c5460; margin: 0;">${summary.completedMilestones}</h3>
                <p style="margin: 5px 0;">Completed Milestones</p>
              </div>
              <div style="background: #fff3cd; padding: 20px; border-radius: 8px; text-align: center;">
                <h3 style="color: #856404; margin: 0;">₹${summary.releasedSubsidies.total.toLocaleString()}</h3>
                <p style="margin: 5px 0;">Subsidies Released</p>
              </div>
              <div style="background: #f8d7da; padding: 20px; border-radius: 8px; text-align: center;">
                <h3 style="color: #721c24; margin: 0;">${summary.overdueCount}</h3>
                <p style="margin: 5px 0;">Overdue Milestones</p>
              </div>
            </div>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>📈 Key Highlights:</h3>
              <ul style="margin: 10px 0;">
                <li>${summary.newProjects} new projects added to the platform</li>
                <li>${summary.completedMilestones} milestones completed by producers</li>
                <li>₹${summary.releasedSubsidies.total.toLocaleString()} released across ${summary.releasedSubsidies.count} subsidies</li>
                ${summary.overdueCount > 0 ? `<li style="color: #dc3545;">${summary.overdueCount} milestones requiring attention</li>` : ''}
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}/dashboard" 
                 style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Dashboard
              </a>
            </div>

            <p style="color: #666; font-size: 12px;">
              To unsubscribe from weekly reports, update your notification preferences in your profile settings.
            </p>
          </div>
        `
      })

      logger.info(`Sent weekly summary to ${user.email}`)

    } catch (error) {
      logger.error(`Failed to send weekly summary to ${user.email}:`, error)
    }
  }

  // Manual notification methods
  async notifyProjectApproval(project) {
    try {
      const producer = await User.findById(project.producer)
      if (producer?.email) {
        const template = emailTemplates.projectApproved(producer, project)
        await sendEmail({
          to: producer.email,
          ...template
        })
        
        logger.info(`Sent project approval notification to ${producer.email}`)
      }
    } catch (error) {
      logger.error('Error sending project approval notification:', error)
    }
  }

  async notifySubsidyRelease(milestone, project, txHash) {
    try {
      const producer = await User.findById(project.producer)
      if (producer?.email) {
        const template = emailTemplates.subsidyReleased(producer, milestone, project, txHash)
        await sendEmail({
          to: producer.email,
          ...template
        })
        
        logger.info(`Sent subsidy release notification to ${producer.email}`)
      }
    } catch (error) {
      logger.error('Error sending subsidy release notification:', error)
    }
  }

  // Job management methods
  startJob(name) {
    const job = this.jobs.get(name)
    if (job) {
      job.start()
      logger.info(`Started job: ${name}`)
    } else {
      logger.warn(`Job not found: ${name}`)
    }
  }

  stopJob(name) {
    const job = this.jobs.get(name)
    if (job) {
      job.stop()
      logger.info(`Stopped job: ${name}`)
    } else {
      logger.warn(`Job not found: ${name}`)
    }
  }

  stopAllJobs() {
    for (const [name, job] of this.jobs) {
      job.stop()
      logger.info(`Stopped job: ${name}`)
    }
  }

  getJobStatus() {
    const status = {}
    for (const [name, job] of this.jobs) {
      status[name] = {
        running: job.running || false,
        scheduled: job.scheduled || false
      }
    }
    return status
  }
}

// Create singleton instance
export const notificationService = new NotificationService()

export default NotificationService
