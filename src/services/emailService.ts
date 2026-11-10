import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

// Built on first use so .env is always loaded by then.
const getTransporter = (): Transporter => {
  if (!transporter) {
    const port = Number(process.env.EMAIL_PORT) || 587;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('EMAIL_USER or EMAIL_PASS is empty in .env, emails will fail to send.');
    }

    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
      port,
      secure: port === 465, // 465 = implicit TLS, 587 = STARTTLS
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '',
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transporter;
};

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Returns true when the mail server accepted the message, false otherwise.
// Callers MUST check the result.
export const sendEmail = async (options: SendEmailOptions): Promise<boolean> => {
  try {
    const info = await getTransporter().sendMail({
      from: `"CineSnackHub" <${process.env.EMAIL_USER || 'no-reply@cinesnackhub.com'}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log(`Email dispatched. MessageID: ${info.messageId}`);

    // Ethereal (fake test inbox) prints a preview link instead of delivering.
    if (process.env.EMAIL_HOST?.includes('ethereal.email')) {
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    return true;
  } catch (error) {
    console.error('Email dispatch failed:', error);
    return false;
  }
};