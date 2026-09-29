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
  order_items: { title: string; quantity: number; price: string }[];
  subtotal: string;
  discount: string;
  total: string;
  delivery_charge: string;
  track_order_url: string;
}) => {
  const subject = `Order #${data.order_id} - Your Gigi-Book is on its way to making a difference! 🌸`;
  const preheaderText = "Order confirmed. Here's what happens next.";

  const isCOD = data.payment_method === 'COD';
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
  order_items: { title: string; quantity: number }[];
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
  order_items: { title: string; quantity: number }[];
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

/**
 * Email #1: Dispatched upon Etsy purchase to deliver the Redeem link & Order ID
 */
export const sendEtsyPurchaseEmail = async (to: string, data: {
  buyer_name: string;
  order_id: string;
  item_title?: string;
  redeem_url?: string;
}) => {
  const subject = `🌸 Your Gigi the Book Access Code (Etsy Order #${data.order_id})`;
  const redeemUrl = data.redeem_url || `https://infanocare.com/redeem?order_id=${encodeURIComponent(data.order_id)}`;
  const itemTitle = data.item_title || "Gigi the Book: A Journey of Growing Up (Cloud eBook Edition)";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; padding: 30px 15px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #F1F5F9;">
              <!-- Header -->
              <tr>
                <td align="center" style="background: linear-gradient(135deg, #9333EA 0%, #E11D48 100%); padding: 35px 20px; text-align: center;">
                  <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Welcome to Gigi the Book! 🌸</h1>
                  <p style="color: #FCE7F3; margin: 8px 0 0 0; font-size: 14px;">Your digital eBook is ready to unlock</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 35px 30px;">
                  <p style="font-size: 16px; color: #1E293B; margin: 0 0 16px 0; font-weight: 600;">Hi ${data.buyer_name || "there"},</p>
                  <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
                    Thank you for purchasing <strong>${itemTitle}</strong> on Etsy! Your order has been registered in our system.
                  </p>

                  <!-- Order Card -->
                  <div style="background-color: #FAF5FF; border: 1px solid #E9D5FF; border-radius: 14px; padding: 20px; margin-bottom: 28px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size: 12px; color: #7E22CE; font-weight: 700; text-transform: uppercase; padding-bottom: 4px;">Etsy Order / Receipt #</td>
                      </tr>
                      <tr>
                        <td style="font-size: 22px; color: #581C87; font-weight: 800; font-family: monospace; letter-spacing: 1px;">#${data.order_id}</td>
                      </tr>
                    </table>
                  </div>

                  <!-- CTA Button -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                    <tr>
                      <td align="center">
                        <a href="${redeemUrl}" style="display: inline-block; background: #9333EA; color: #FFFFFF; font-weight: 700; font-size: 15px; padding: 14px 32px; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 12px rgba(147,51,234,0.3);">
                          1-Click Unlock & Start Reading &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Instructions -->
                  <div style="background-color: #F8FAFC; border-radius: 12px; padding: 18px; font-size: 13px; color: #64748B; line-height: 1.6;">
                    <strong style="color: #334155;">How it works:</strong>
                    <ol style="margin: 8px 0 0 0; padding-left: 20px;">
                      <li>Click the button above or visit <a href="https://infanocare.com/redeem" style="color: #9333EA; text-decoration: none; font-weight: 600;">infanocare.com/redeem</a></li>
                      <li>Log in or verify with your mobile number (quick SMS OTP)</li>
                      <li>Read instantly with night mode, bookmarks, and mobile app sync!</li>
                    </ol>
                  </div>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: #F8FAFC; padding: 20px 30px; text-align: center; border-top: 1px solid #F1F5F9; font-size: 12px; color: #94A3B8;">
                  Infano Care • Empowering Young Teens & Families • <a href="mailto:connect@infano.care" style="color: #9333EA; text-decoration: none;">connect@infano.care</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail(to, subject, html);
};

/**
 * Email #2: Dispatched after the user redeems the eBook on Infano
 */
export const sendBookUnlockedEmail = async (to: string, data: {
  user_name: string;
  book_title?: string;
  read_url?: string;
}) => {
  const bookTitle = data.book_title || "Gigi the Book: A Journey of Growing Up";
  const subject = `🎉 ${bookTitle} is now unlocked in your Library!`;
  const readUrl = data.read_url || "https://infanocare.com/dashboard/library/gigi-the-book/read";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; padding: 30px 15px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #F1F5F9;">
              <!-- Header -->
              <tr>
                <td align="center" style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); padding: 35px 20px; text-align: center;">
                  <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 800;">Your eBook is Ready! 📖</h1>
                  <p style="color: #D1FAE5; margin: 8px 0 0 0; font-size: 14px;">Lifetime cloud reading access activated</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 35px 30px;">
                  <p style="font-size: 16px; color: #1E293B; margin: 0 0 16px 0; font-weight: 600;">Hi ${data.user_name || "there"},</p>
                  <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
                    Congratulations! <strong>${bookTitle}</strong> has been successfully linked to your Infano account. You can now read it anytime across all your devices.
                  </p>

                  <!-- CTA Button -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                    <tr>
                      <td align="center">
                        <a href="${readUrl}" style="display: inline-block; background: #059669; color: #FFFFFF; font-weight: 700; font-size: 15px; padding: 14px 32px; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 12px rgba(5,150,105,0.3);">
                          Launch eBook Reader &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Features highlight -->
                  <div style="background-color: #F8FAFC; border-radius: 14px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="font-size: 13px; color: #334155; margin: 0 0 12px 0; text-transform: uppercase; font-weight: 700;">Reader Features:</h3>
                    <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #64748B; line-height: 1.8;">
                      <li>✨ <strong>Cloud Sync:</strong> Automatically saves your page and bookmarks.</li>
                      <li>📖 <strong>Reading Themes:</strong> Choose Sepia, Light, or Night Mode.</li>
                      <li>📱 <strong>Mobile App:</strong> Read on the go with the Infano Care App.</li>
                    </ul>
                  </div>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: #F8FAFC; padding: 20px 30px; text-align: center; border-top: 1px solid #F1F5F9; font-size: 12px; color: #94A3B8;">
                  Infano Care • <a href="https://infanocare.com/dashboard/library" style="color: #059669; text-decoration: none; font-weight: 600;">My Library</a> • <a href="mailto:connect@infano.care" style="color: #059669; text-decoration: none;">connect@infano.care</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail(to, subject, html);
};



