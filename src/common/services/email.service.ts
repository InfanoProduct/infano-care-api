import nodemailer from "nodemailer";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (!env.GMAIL_USER || !env.GMAIL_PASS) {
      logger.warn("GMAIL_USER or GMAIL_PASS is not set. Email service is disabled.");
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: env.GMAIL_USER,
        pass: env.GMAIL_PASS,
      },
    });

    // Verify connection configuration
    this.transporter.verify((error) => {
      if (error) {
        logger.error("Error configuring email transporter:", error);
      } else {
        logger.info("Email transporter is ready to send messages");
      }
    });
  }

  async sendEmail({
    to,
    subject,
    html,
  }: {
    to: string;
    subject: string;
    html: string;
  }): Promise<boolean> {
    if (!this.transporter) {
      logger.warn("Email service is disabled. Cannot send email to: " + to);
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"Infano Care" <${env.GMAIL_USER}>`,
        to,
        subject,
        html,
      });

      logger.info(`Email sent successfully to ${to}. Message ID: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error(`Error sending email to ${to}:`, error);
      return false;
    }
  }

  async sendEnquiryConfirmation(email: string, name?: string) {
    const userName = name || "User";
    const subject = "Thank you for reaching out to Infano Care";
    const html = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <h2>Hi ${userName},</h2>
        <p>Thank you for getting in touch with us! We have received your enquiry.</p>
        <p>Our team will review your message and get back to you shortly.</p>
        <p>Best regards,<br>The Infano Care Team</p>
      </div>
    `;
    const formattedTo = name ? `"${name}" <${email}>` : email;
    return this.sendEmail({ to: formattedTo, subject, html });
  }

  async sendNewsletterWelcome(email: string, name?: string) {
    const userName = name || "there";
    const subject = "Welcome to the Infano Care Newsletter!";
    const html = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <h2>Hi ${userName},</h2>
        <p>Thank you for subscribing to our newsletter!</p>
        <p>You'll now receive our latest updates, articles, and insights directly in your inbox.</p>
        <p>Best regards,<br>The Infano Care Team</p>
      </div>
    `;
    const formattedTo = name ? `"${name}" <${email}>` : email;
    return this.sendEmail({ to: formattedTo, subject, html });
  }
}

export const emailService = new EmailService();
