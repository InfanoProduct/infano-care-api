import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

export const sendEmail = async (to: string, subject: string, html: string, text?: string) => {
  const mailjetApiKey = process.env.MAILJET_API_KEY;
  const mailjetSecretKey = process.env.MAILJET_SECRET_KEY;
  const mailFrom = process.env.MAIL_FROM || 'hello@infano.care';

  if (!mailjetApiKey || !mailjetSecretKey) {
    console.error('Mailjet credentials not found in environment variables.');
    return;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'in-v3.mailjet.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: mailjetApiKey,
        pass: mailjetSecretKey,
      },
    });
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
    console.error('Error sending email via Mailjet SMTP:', error);
    throw error;
  }
};

import { compileEmailTemplate } from './template.service';

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
  track_order_url: string;
}) => {
  const subject = 'Your Gigi-Book is on its way to making a difference! 🌸';
  const preheaderText = "Order confirmed. Here's what happens next.";
  const html = await compileEmailTemplate('order-placed', { ...data, subject, preheaderText });
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
  const subject = 'Your Gigi-Book has been shipped! 📦';
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
  const subject = "Your Gigi-Book has arrived! Here's how to get started 🌟";
  const preheaderText = 'Tips to make the most of this wellness journey together.';
  const html = await compileEmailTemplate('order-delivered', { ...data, subject, preheaderText });
  return sendEmail(to, subject, html);
};
