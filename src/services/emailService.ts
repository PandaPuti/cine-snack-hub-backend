import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

//Create a reusable transporter object using environmental mail credentials 
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.ethereal.email', // Defaults to a fake testing server if blank
  port: Number(process.env.EMAIL_PORT) || 587,
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
});

interface SendEmailOptions {
  to : string,
  subject: string,
  text: string,
  html: string,
}

//Reusable function to dispatch emails anywhere across our backend application
export const sendEmail = async (options: SendEmailOptions): Promise<boolean> => {
 try{
  const mailOptions = {
    from: `"CineSnackHub" <${process.env.EMAIL_USER || 'no-reply@cinesnackhub.com'}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`Email dispatched successfully! MessageID: ${info.messageId}`);

  // For local testing: Ethereal prints a URL where you can view your fake sent email
  if (process.env.EMAIL_HOST?.includes('ethereal.email')) {
    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  }

  return true;

 } catch (error) {
  console.error('Email dispatch operation failed:', error);
  return false;
 }
}