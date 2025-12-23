import { db } from "./db-storage";
import { receivedMessages } from "../shared/schema";

interface SMTPMessage {
  userId: string;
  from: string;
  to: string;
  subject: string;
  text: string;
}

export class SMTPReceiver {
  private receivedEmails: SMTPMessage[] = [];

  async saveEmail(message: SMTPMessage) {
    try {
      this.receivedEmails.push(message);
      
      await db.insert(receivedMessages).values({
        userId: message.userId,
        whatsiPlusId: `smtp_${Date.now()}_${Math.random()}`,
        sender: message.from,
        message: `📧 **${message.subject}**\n\n${message.text}`,
        status: "خوانده نشده",
        timestamp: new Date(),
      });

      console.log(`📧 ایمیل دریافت شد: ${message.from} -> ${message.to}`);
      return true;
    } catch (error) {
      console.error("خطا در ذخیره ایمیل:", error);
      return false;
    }
  }

  getReceivedEmails() {
    return this.receivedEmails;
  }

  clearReceivedEmails() {
    this.receivedEmails = [];
  }
}

export const smtpReceiver = new SMTPReceiver();
