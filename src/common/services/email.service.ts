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
  class_range: string;
  slot_date: string;
  slot_time: string;
  comment?: string;
  programs?: { title: string; classRange: string; duration: string; thumbnailUrl?: string }[];
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

