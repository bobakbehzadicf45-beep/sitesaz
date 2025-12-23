import { db } from "./db-storage";
import { receivedMessages } from "../shared/schema";
import { eq } from "drizzle-orm";

interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  timestamp: Date;
}

class EmailService {
  private messages: EmailMessage[] = [];
  private initialized = false;

  async initialize() {
    this.initialized = true;
    console.log("📧 سرویس ایمیل راه‌اندازی شد");
  }

  // دریافت ایمیل از طریق سرور محلی
  async receiveEmail(email: EmailMessage) {
    if (!this.initialized) await this.initialize();
    
    this.messages.push(email);
    console.log(`📨 ایمیل جدید دریافت شد از: ${email.from}`);
    
    return email;
  }

  // دریافت تمام ایمیل‌های کاربر
  async getUserEmails(userId: string) {
    try {
      const emails = await db.query.receivedMessages.findMany({
        where: eq(receivedMessages.userId, userId),
      });
      return emails;
    } catch (error) {
      console.error("خطا در دریافت ایمیل‌ها:", error);
      return [];
    }
  }

  // ذخیره ایمیل در دیتابیس
  async saveEmail(userId: string, email: Partial<typeof receivedMessages.$inferInsert>) {
    try {
      const result = await db.insert(receivedMessages).values({
        userId,
        whatsiPlusId: `email_${Date.now()}`,
        sender: email.sender || "unknown",
        message: email.message || "",
        status: "خوانده نشده",
      });
      return result;
    } catch (error) {
      console.error("خطا در ذخیره ایمیل:", error);
      return null;
    }
  }

  // دریافت ایمیل‌های خوانده نشده
  async getUnreadEmails(userId: string) {
    try {
      const unread = await db.query.receivedMessages.findMany({
        where: eq(receivedMessages.userId, userId),
      });
      return unread.filter(e => e.status === "خوانده نشده");
    } catch (error) {
      console.error("خطا:", error);
      return [];
    }
  }

  // علامت‌گذاری به عنوان خوانده شده
  async markAsRead(messageId: string) {
    try {
      await db.update(receivedMessages)
        .set({ status: "خوانده شده" })
        .where(eq(receivedMessages.id, messageId));
      return true;
    } catch (error) {
      console.error("خطا:", error);
      return false;
    }
  }
}

export const emailService = new EmailService();
