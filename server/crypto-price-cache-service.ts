import { db } from "./db-storage";
import { cryptoPrices } from "@shared/schema";
import { eq } from "drizzle-orm";
import { tgjuService } from "./tgju-service";

export class CryptoPriceCacheService {
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private isUpdating = false;

  async initialize() {
    console.log("💰 شروع initialize سرویس کش قیمت ارزهای دیجیتال...");
    
    await this.updatePrices();
    
    this.updateInterval = setInterval(() => {
      this.updatePrices();
    }, this.UPDATE_INTERVAL_MS);
    
    console.log("✅ سرویس کش قیمت ارزهای دیجیتال راه‌اندازی شد (به‌روزرسانی هر 5 دقیقه)");
  }

  async updatePrices() {
    if (this.isUpdating) {
      console.log("⏳ به‌روزرسانی قیمت‌ها در حال انجام است...");
      return;
    }

    this.isUpdating = true;
    console.log("🔄 شروع به‌روزرسانی قیمت‌های ارز دیجیتال...");

    try {
      const prices = await tgjuService.getAllCryptoPrices();
      const now = new Date();

      const updates = [
        {
          symbol: 'TRX',
          priceInRial: prices.TRX,
          priceInToman: Math.floor(prices.TRX / 10),
        },
        {
          symbol: 'USDT',
          priceInRial: prices.USDT,
          priceInToman: Math.floor(prices.USDT / 10),
        },
        {
          symbol: 'XRP',
          priceInRial: prices.XRP,
          priceInToman: Math.floor(prices.XRP / 10),
        },
        {
          symbol: 'ADA',
          priceInRial: prices.ADA,
          priceInToman: Math.floor(prices.ADA / 10),
        },
      ];

      for (const update of updates) {
        const existing = await db.query.cryptoPrices.findFirst({
          where: eq(cryptoPrices.symbol, update.symbol),
        });

        if (existing) {
          await db
            .update(cryptoPrices)
            .set({
              priceInRial: String(update.priceInRial),
              priceInToman: String(update.priceInToman),
              fetchedAt: now,
            })
            .where(eq(cryptoPrices.symbol, update.symbol));
        } else {
          await db.insert(cryptoPrices).values({
            symbol: update.symbol,
            priceInRial: String(update.priceInRial),
            priceInToman: String(update.priceInToman),
            fetchedAt: now,
          });
        }

        console.log(
          `✅ قیمت ${update.symbol} به‌روزرسانی شد: ${update.priceInToman.toLocaleString('fa-IR')} تومان`
        );
      }

      console.log("✅ تمام قیمت‌های ارز دیجیتال به‌روزرسانی شدند");
    } catch (error) {
      console.error("❌ خطا در به‌روزرسانی قیمت‌های ارز دیجیتال:", error);
    } finally {
      this.isUpdating = false;
    }
  }

  async getCachedPrices(): Promise<{
    TRX: number;
    USDT: number;
    XRP: number;
    ADA: number;
    lastUpdate?: Date;
  } | null> {
    try {
      const allPrices = await db.query.cryptoPrices.findMany();

      if (allPrices.length === 0) {
        console.log("⚠️ هیچ قیمتی در کش یافت نشد");
        return null;
      }

      const pricesMap = allPrices.reduce((acc: Record<string, { priceInToman: number; fetchedAt: Date | null }>, price) => {
        acc[price.symbol] = {
          priceInToman: Number(price.priceInToman),
          fetchedAt: price.fetchedAt,
        };
        return acc;
      }, {});

      const lastUpdate = allPrices.reduce((latest: Date | null, price) => {
        if (!price.fetchedAt) return latest;
        if (!latest) return price.fetchedAt;
        return price.fetchedAt > latest ? price.fetchedAt : latest;
      }, null);

      return {
        TRX: pricesMap['TRX']?.priceInToman || 0,
        USDT: pricesMap['USDT']?.priceInToman || 0,
        XRP: pricesMap['XRP']?.priceInToman || 0,
        ADA: pricesMap['ADA']?.priceInToman || 0,
        lastUpdate: lastUpdate || undefined,
      };
    } catch (error) {
      console.error("خطا در دریافت قیمت‌های کش شده:", error);
      return null;
    }
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log("🛑 سرویس کش قیمت ارزهای دیجیتال متوقف شد");
    }
  }
}

export const cryptoPriceCacheService = new CryptoPriceCacheService();
