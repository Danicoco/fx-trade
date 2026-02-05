import { Injectable } from '@nestjs/common';
import { SendMailClient } from 'zeptomail';

@Injectable()
export class ZeptomailService {
  private readonly client: SendMailClient;
  constructor() {
    this.client = new SendMailClient({
      url: process.env.ZEP_URL,
      token: process.env.ZEP_TOKEN,
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
      await this.client.sendMail({
        from: {
          address: 'fx@trade.co',
          name: 'FX Trade',
        },
        to: [{ email_address: { address: email, name: name } }],
        subject: subject,
        htmlbody: `<div>${message}</div>`,
      });

      return {
        status: 'success',
        message: 'Email sent successfully',
      };
    } catch (error) {
      console.log(JSON.stringify(error, null, 2));
      return {
        status: 'error',
        message: 'Error sending email',
      };
    }
  }
}
