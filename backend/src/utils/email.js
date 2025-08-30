import nodemailer from 'nodemailer'
import logger from './logger.js'

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
})

// Verify email configuration on startup
transporter.verify((error, success) => {
  if (error) {
    logger.warn('Email service configuration error:', error.message)
  } else {
    logger.info('Email service is ready')
  }
})

// Send email function
export const sendEmail = async (options) => {
  try {
    const message = {
      from: `${process.env.EMAIL_FROM_NAME || 'Green Hydrogen Platform'} <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments
    }

    const info = await transporter.sendMail(message)
    
    logger.info('Email sent successfully:', {
      messageId: info.messageId,
      to: options.to,
      subject: options.subject
    })

    return {
      success: true,
      messageId: info.messageId
    }
  } catch (error) {
    logger.error('Email sending failed:', error)
    throw new Error(`Email could not be sent: ${error.message}`)
  }
}

// Email templates
export const emailTemplates = {
  // Welcome email template
  welcome: (user, verificationToken) => ({
    subject: 'Welcome to Green Hydrogen Platform',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="color: #2c5530;">Welcome to Green Hydrogen Platform!</h2>
        <p>Dear ${user.name},</p>
        <p>Thank you for joining the Green Hydrogen Subsidy Management Platform. Your account has been created successfully.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Account Details:</h3>
          <p><strong>Name:</strong> ${user.name}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Role:</strong> ${user.role}</p>
          ${user.walletAddress ? `<p><strong>Wallet:</strong> ${user.walletAddress}</p>` : ''}
        </div>

        <p>To complete your registration, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL}/verify-email/${verificationToken}" 
             style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">This verification link will expire in 1 hour.</p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          If you didn't create this account, please ignore this email or contact our support team.
        </p>
      </div>
    `
  }),

  // Password reset template
  passwordReset: (user, resetToken) => ({
    subject: 'Password Reset Request - Green Hydrogen Platform',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="color: #dc3545;">Password Reset Request</h2>
        <p>Dear ${user.name},</p>
        <p>You requested a password reset for your Green Hydrogen Platform account.</p>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>⚠️ Security Notice:</strong> If you didn't request this reset, please ignore this email and your password will remain unchanged.
        </div>

        <p>Click the button below to reset your password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL}/reset-password/${resetToken}" 
             style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">This reset link will expire in 10 minutes.</p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          For security reasons, this link can only be used once. If you need another reset link, please request a new one.
        </p>
      </div>
    `
  }),

  // Project approval notification
  projectApproved: (user, project) => ({
    subject: `Project Approved: ${project.name}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="color: #28a745;">🎉 Project Approved!</h2>
        <p>Dear ${user.name},</p>
        <p>Congratulations! Your project has been approved and is now active in the system.</p>
        
        <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #155724; margin-top: 0;">Project Details:</h3>
          <p><strong>Project Name:</strong> ${project.name}</p>
          <p><strong>Project ID:</strong> ${project.projectId}</p>
          <p><strong>Total Subsidy:</strong> ₹${project.totalSubsidy.toLocaleString()}</p>
          <p><strong>Location:</strong> ${project.location.city}, ${project.location.state}</p>
          <p><strong>Approved On:</strong> ${new Date().toLocaleDateString()}</p>
        </div>

        <p>You can now start creating milestones and tracking progress for your project.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL}/projects/${project._id}" 
             style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Project
          </a>
        </div>

        <p>Best regards,<br>Green Hydrogen Platform Team</p>
      </div>
    `
  }),

  // Milestone due notification
  milestoneDue: (user, milestone, project, daysUntilDue) => ({
    subject: `Milestone Due: ${milestone.title}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="color: #ffc107;">⏰ Milestone Due Reminder</h2>
        <p>Dear ${user.name},</p>
        <p>This is a reminder that the following milestone is due ${daysUntilDue > 0 ? `in ${daysUntilDue} days` : 'today'}:</p>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #856404; margin-top: 0;">Milestone Details:</h3>
          <p><strong>Title:</strong> ${milestone.title}</p>
          <p><strong>Project:</strong> ${project.name}</p>
          <p><strong>Due Date:</strong> ${new Date(milestone.plannedEndDate).toLocaleDateString()}</p>
          <p><strong>Subsidy Amount:</strong> ₹${milestone.subsidyAmount.toLocaleString()}</p>
          <p><strong>Current Status:</strong> ${milestone.status}</p>
        </div>

        <p>Please ensure all requirements are completed before the due date to avoid delays in subsidy release.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL}/milestones/${milestone._id}" 
             style="background: #ffc107; color: #212529; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Milestone
          </a>
        </div>

        <p>Best regards,<br>Green Hydrogen Platform Team</p>
      </div>
    `
  }),

  // Subsidy released notification
  subsidyReleased: (user, milestone, project, txHash) => ({
    subject: `Subsidy Released: ₹${milestone.subsidyAmount.toLocaleString()}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="color: #28a745;">💰 Subsidy Released!</h2>
        <p>Dear ${user.name},</p>
        <p>Great news! The subsidy for your completed milestone has been released.</p>
        
        <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #155724; margin-top: 0;">Payment Details:</h3>
          <p><strong>Amount:</strong> ₹${milestone.subsidyAmount.toLocaleString()}</p>
          <p><strong>Milestone:</strong> ${milestone.title}</p>
          <p><strong>Project:</strong> ${project.name}</p>
          <p><strong>Transaction Hash:</strong> <code style="background: #f8f9fa; padding: 2px 4px;">${txHash}</code></p>
          <p><strong>Release Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>

        <p>The funds have been transferred to your registered wallet address. You can verify the transaction on the blockchain using the transaction hash provided above.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL}/projects/${project._id}" 
             style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Project
          </a>
        </div>

        <p>Congratulations on completing this milestone!</p>
        <p>Best regards,<br>Green Hydrogen Platform Team</p>
      </div>
    `
  })
}

// Bulk email function
export const sendBulkEmail = async (recipients, template, data) => {
  const results = []
  
  for (const recipient of recipients) {
    try {
      const emailContent = template(recipient, data)
      const result = await sendEmail({
        to: recipient.email,
        ...emailContent
      })
      results.push({ email: recipient.email, success: true, messageId: result.messageId })
    } catch (error) {
      results.push({ email: recipient.email, success: false, error: error.message })
    }
  }
  
  return results
}
