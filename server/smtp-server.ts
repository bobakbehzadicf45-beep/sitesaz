import { SMTPServer } from "smtp-server";
import { smtpReceiver } from "./smtp-receiver";
import { simpleParser } from "mailparser";

export function startSMTPServer() {
  try {
    const server = new SMTPServer({
      secure: false,
      auth: false,
      logger: false,
      disabledCommands: ["STARTTLS"],
      
      onMailFrom(address, session, callback) {
        console.log(`📧 فرستنده: ${address.address}`);
        callback();
      },

      onData(stream, session, callback) {
        simpleParser(stream, async (err, parsed) => {
          if (err) {
            console.error("خطا در parsing ایمیل:", err);
            return callback(err);
          }

          try {
            const from = parsed.from?.text || "unknown";
            const to = parsed.to?.text || "unknown";
            const subject = parsed.subject || "(بدون موضوع)";
            const text = parsed.text || "";

            const match = to.match(/user-(\w+)@/);
            const userId = match ? match[1] : "default";

            await smtpReceiver.saveEmail({
              userId,
              from,
              to,
              subject,
              text,
            });

            callback();
          } catch (error) {
            console.error("خطا:", error);
            callback(error as Error);
          }
        });
      },
    });

    const smtpPort = parseInt(process.env.SMTP_PORT || '1025', 10);
    server.listen(smtpPort, "0.0.0.0", () => {
      console.log(`📧 سرور SMTP در حال استماع در پورت ${smtpPort}...`);
      console.log(`💡 برای دریافت ایمیل از سرویس‌های محلی، پورت ${smtpPort} را استفاده کنید`);
    });

    server.on("error", (err) => {
      if ((err as any).code === "EACCES") {
        console.error("❌ خطا: نمی‌تواند در پورت 25 گوش دهد - مجوزهای ادمین مورد نیاز است");
      } else {
        console.error("❌ خطای SMTP:", err);
      }
    });

    return server;
  } catch (error) {
    console.error("❌ خطا در شروع SMTP server:", error);
    return null;
  }
}
