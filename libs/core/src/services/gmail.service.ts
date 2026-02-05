import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class GmailService {
  private readonly transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // Use SSL
      auth: {
        user: process.env.GMAIL_USER, // your email
        pass: process.env.GMAIL_APP_PASSWORD, // app password
      },
    });
  }

  async sendEmail({
    email,
    name,
    subject,
    message,
  }: {
    email: string;
    name: string;
    subject: string;
    message: string;
  }): Promise<{
    status: 'success' | 'error';
    message: string;
  }> {
    try {
      const resp = await this.transporter.sendMail({
        from: {
          name: 'CredPal FX',
          address: process.env.GMAIL_USER,
        },
        to: `${name} <${email}>`,
        subject,
        html: `<div>${message}</div>`,
      });

      return {
        status: 'success',
        message: 'Email sent successfully',
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Error sending email',
      };
    }
  }
}
