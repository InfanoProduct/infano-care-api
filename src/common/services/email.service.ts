import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

export const sendEmail = async (to: string, subject: string, html: string, text?: string) => {
  const brevoUser = process.env.BREVO_SMTP_USER;
  const brevoKey = process.env.BREVO_SMTP_KEY;
  const mailjetApiKey = process.env.MAILJET_API_KEY;
  const mailjetSecretKey = process.env.MAILJET_SECRET_KEY;
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;
  let mailFrom = process.env.MAIL_FROM || 'hello@infano.care';

  if (!transporter) {
    if (brevoUser && brevoKey) {
      transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: {
          user: brevoUser,
          pass: brevoKey,
        },
      });
    } else if (gmailUser && gmailPass) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });
      // Override sender address for Gmail SMTP compatibility
      mailFrom = gmailUser;
    } else if (mailjetApiKey && mailjetSecretKey) {
      transporter = nodemailer.createTransport({
        host: 'in-v3.mailjet.com',
        port: 587,
        secure: false,
        auth: {
          user: mailjetApiKey,
          pass: mailjetSecretKey,
        },
      });
    } else {
      console.error('No email credentials (Brevo, Gmail, or Mailjet) found in environment variables.');
      return;
    }
  }

  try {
    const fromStr = mailFrom.includes('<') ? mailFrom : `"Infano Care" <${mailFrom}>`;
    const info = await transporter.sendMail({
      from: fromStr,
      to,
      subject,
      text: text || '', // fallback plain text
      html, // html body
    });

    console.log(`Email sent successfully to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Error sending email via SMTP:', error);
    throw error;
  }
};

import { compileEmailTemplate } from './template.service.js';

export const sendGigiBookOrderPlacedEmail = async (to: string, data: {
  parent_name: string;
  order_id: string;
  order_date: string;
  shipping_address: { name: string; full_address: string; };
  payment_method: string;
  order_items: { title: string; quantity: number; price: string; unit_price?: string; image_url?: string }[];
  subtotal: string;
  discount?: string;
  has_discount?: boolean;
  total: string;
  delivery_charge: string;
  has_delivery_charge?: boolean;
  is_free_delivery?: boolean;
  track_order_url: string;
  view_order_url?: string;
}) => {
  const subject = `Order #${data.order_id} - Your Gigi-Book is on its way to making a difference! 🌸`;
  const preheaderText = "Order confirmed. Here's what happens next.";

  const isCOD = data.payment_method === 'COD' || data.payment_method === 'Cash on Delivery' || data.payment_method.toLowerCase().includes('cash on delivery');
  const total = data.total;

  const html = await compileEmailTemplate('order-placed', { 
    ...data, 
    isCOD, 
    total, 
    subject, 
    preheaderText 
  });
  return sendEmail(to, subject, html);
};

export const sendGigiBookOrderShippedEmail = async (to: string, data: {
  parent_name: string;
  order_id: string;
  courier_name: string;
  tracking_id: string;
  delivery_date: string;
  shipping_address: { name: string; full_address: string; };
  order_items: { title: string; quantity: number; image_url?: string }[];
  track_order_url: string;
  tracking_url: string;
}) => {
  const subject = `Order #${data.order_id} - Your Gigi-Book has been shipped! 📦`;
  const preheaderText = 'Track your package in real-time.';
  const html = await compileEmailTemplate('order-shipped', { ...data, subject, preheaderText });
  return sendEmail(to, subject, html);
};

export const sendGigiBookOrderDeliveredEmail = async (to: string, data: {
  parent_name: string;
  order_id: string;
  delivery_date: string;
  order_items: { title: string; quantity: number; image_url?: string }[];
  view_order_url: string;
  explore_url: string;
}) => {
  const subject = `Order #${data.order_id} - Delivered 📦`;
  const preheaderText = 'Your order has been successfully delivered.';
  const html = await compileEmailTemplate('order-delivered', { ...data, subject, preheaderText });
  return sendEmail(to, subject, html);
};

export const sendDemoSessionBookedEmail = async (to: string, data: {
  parent_name: string;
  phone: string;
  email?: string;
  slot_date: string;
  slot_time: string;
  comment?: string;
  amount?: number | string;
  payment_id?: string;
  programs?: { title: string; duration: string; thumbnailUrl?: string }[];
}) => {
  const subject = `Your Demo Session at Infano Care is Confirmed! 🌟`;
  const preheaderText = 'Confirmation details for your upcoming interactive demo.';
  const html = await compileEmailTemplate('demo-session-booked', { ...data, subject, preheaderText });
  return sendEmail(to, subject, html);
};

export const sendWebinarConfirmationEmail = async (to: string, data: {
  parent_name: string;
  order_id: string;
  webinar_date: string;
  webinar_time: string;
  download_pdf_url: string;
  whatsapp_group_url: string;
  zoom_link: string;
  webinar_title?: string;
  webinar_platform?: string;
}) => {
  const title = data.webinar_title || "Decoding Her Silence Parent Webinar";
  const subject = `You're Confirmed! ${title} 🎉`;
  const preheaderText = "Your registration details and free bonuses inside.";
  const html = await compileEmailTemplate('webinar-registered', { ...data, subject, preheaderText });
  return sendEmail(to, subject, html);
};

export const sendProgramSessionEmail = async (to: string, data: {
  recipient_name: string;
  program_title: string;
  session_title?: string;
  batch_name?: string;
  formatted_date: string;
  formatted_time: string;
  expert_name?: string;
  meet_link?: string;
  is_rescheduled?: boolean;
}) => {
  const isRescheduled = !!data.is_rescheduled;
  const sessionLabel = data.session_title ? ` (${data.session_title})` : '';
  const subject = isRescheduled
    ? `Session Rescheduled: ${data.program_title}${sessionLabel} ⏰`
    : `Live Class Scheduled: ${data.program_title}${sessionLabel} 🎓`;
  const preheaderText = isRescheduled
    ? `Updated date, time, and meeting link for your ${data.program_title} session.`
    : `Date, time, and join details for your upcoming ${data.program_title} session.`;

  const html = await compileEmailTemplate('session-scheduled', {
    ...data,
    subject,
    preheaderText
  });
  return sendEmail(to, subject, html);
};

export const sendProgramEnrolledEmail = async (to: string, data: {
  recipient_name: string;
  program_title: string;
  program_tagline?: string;
  duration?: string;
  batch_name?: string;
}) => {
  const subject = `Welcome to ${data.program_title}! 🎉 Your Enrollment is Confirmed`;
  const preheaderText = `You are successfully enrolled in ${data.program_title}. Access your dashboard and curriculum now.`;
  const html = await compileEmailTemplate('program-enrolled', {
    ...data,
    subject,
    preheaderText
  });
  return sendEmail(to, subject, html);
};

export const sendAuthOtpEmail = async (to: string, otp: string) => {
  const subject = `${otp} is your Infano.Care login code`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF8FD; margin: 0; padding: 30px 10px; color: #1F2937;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #F3E8FF; padding: 36px 28px; box-shadow: 0 4px 20px rgba(123, 31, 162, 0.05); text-align: center;">
          <div style="margin-bottom: 24px;">
            <img src="https://api.infano.care/uploads/assets/infano-logo-light.png" alt="Infano Care" style="height: 38px; width: auto;" />
          </div>
          <h2 style="font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 12px 0;">Your Verification Code</h2>
          <p style="font-size: 14px; color: #4B5563; line-height: 1.5; margin: 0 0 28px 0;">Use this single-use code to securely sign in to your Infano account and access your dashboard.</p>
          <div style="background: #FAF8FD; border: 2px dashed #9C27B0; border-radius: 12px; padding: 18px 24px; margin: 0 auto 28px auto; display: inline-block;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #7B1FA2; display: block; margin-left: 10px;">${otp}</span>
          </div>
          <p style="font-size: 12px; color: #9CA3AF; margin: 0 0 8px 0;">This code is valid for 10 minutes. If you did not request this code, please ignore this email.</p>
          <div style="border-top: 1px solid #F3F4F6; margin-top: 24px; padding-top: 18px;">
            <p style="font-size: 11px; color: #9CA3AF; margin: 0;">&copy; ${new Date().getFullYear()} Infano Care. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  return sendEmail(to, subject, html, `Your Infano verification code is: ${otp}. It expires in 10 minutes.`);
};



