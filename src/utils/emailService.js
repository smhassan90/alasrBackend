const nodemailer = require('nodemailer');
const logger = require('./logger');

/**
 * Create email transporter
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body
 * @returns {Promise<Object>}
 */
exports.sendEmail = async ({ to, subject, text, html }) => {
  // Check if email sending is disabled
  if (process.env.ENABLE_EMAIL === 'false' || process.env.ENABLE_EMAIL === '0') {
    logger.info(`Email sending is disabled. Would have sent to ${to} with subject: ${subject}`);
    return { success: true, messageId: 'disabled', disabled: true };
  }

  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error.message}`);
    throw error;
  }
};

/**
 * Send welcome email
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 */
exports.sendWelcomeEmail = async (email, name) => {
  const subject = 'Welcome to SalaahManager';
  const text = `Hello ${name},\n\nWelcome to SalaahManager! Thank you for registering.\n\nBest regards,\nSalaahManager Team`;
  const html = `
    <h1>Welcome to SalaahManager</h1>
    <p>Hello ${name},</p>
    <p>Thank you for registering with SalaahManager. We're excited to have you!</p>
    <p>Best regards,<br/>SalaahManager Team</p>
  `;

  return this.sendEmail({ to: email, subject, text, html });
};

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} resetToken - Password reset token
 */
exports.sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.BASE_URL}/reset-password?token=${resetToken}`;
  const subject = 'Password Reset Request';
  const text = `You requested a password reset. Click this link to reset your password: ${resetUrl}\n\nIf you didn't request this, please ignore this email.`;
  const html = `
    <h1>Password Reset Request</h1>
    <p>You requested a password reset. Click the button below to reset your password:</p>
    <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
    <p>If you didn't request this, please ignore this email.</p>
    <p>This link will expire in 1 hour.</p>
  `;

  return this.sendEmail({ to: email, subject, text, html });
};

/**
 * Send email verification email
 * @param {string} email - Recipient email
 * @param {string} verificationToken - Email verification token
 */
exports.sendEmailVerification = async (email, verificationToken) => {
  const verifyUrl = `${process.env.BASE_URL}/verify-email?token=${verificationToken}`;
  const subject = 'Verify Your Email Address';
  const text = `Please verify your email address by clicking this link: ${verifyUrl}`;
  const html = `
    <h1>Verify Your Email Address</h1>
    <p>Please click the button below to verify your email address:</p>
    <a href="${verifyUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
  `;

  return this.sendEmail({ to: email, subject, text, html });
};

/**
 * Send question reply notification
 * @param {string} email - Recipient email
 * @param {string} questionTitle - Question title
 * @param {string} reply - Reply text
 */
exports.sendQuestionReplyEmail = async (email, questionTitle, reply) => {
  const subject = `Your question "${questionTitle}" has been answered`;
  const text = `Your question has been answered:\n\nReply: ${reply}`;
  const html = `
    <h1>Your Question Has Been Answered</h1>
    <p><strong>Question:</strong> ${questionTitle}</p>
    <p><strong>Reply:</strong></p>
    <p>${reply}</p>
  `;

  return this.sendEmail({ to: email, subject, text, html });
};

/**
 * Send masjid invitation email
 * @param {string} email - Recipient email
 * @param {string} masjidName - Masjid name
 * @param {string} role - User role (imam/admin)
 * @param {string} invitedBy - Name of person who invited
 */
exports.sendMasjidInvitationEmail = async (email, masjidName, role, invitedBy) => {
  const subject = `You've been added to ${masjidName}`;
  const text = `${invitedBy} has added you as ${role} to ${masjidName}.`;
  const html = `
    <h1>Masjid Invitation</h1>
    <p>${invitedBy} has added you as <strong>${role}</strong> to <strong>${masjidName}</strong>.</p>
    <p>You can now manage this masjid through the SalaahManager app.</p>
  `;

  return this.sendEmail({ to: email, subject, text, html });
};

/**
 * Send masjid removal notification
 * @param {string} email - Recipient email
 * @param {string} masjidName - Masjid name
 * @param {string} removedBy - Name of person who removed
 */
exports.sendMasjidRemovalEmail = async (email, masjidName, removedBy) => {
  const subject = `You've been removed from ${masjidName}`;
  const text = `${removedBy} has removed you from ${masjidName}.`;
  const html = `
    <h1>Masjid Access Removed</h1>
    <p>${removedBy} has removed your access to <strong>${masjidName}</strong>.</p>
  `;

  return this.sendEmail({ to: email, subject, text, html });
};

