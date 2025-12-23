import { db, eq } from "./db-storage";
import { cryptoTransactions, orders, users } from "@shared/schema";
import { and, gt, lte, isNotNull } from "drizzle-orm";
import { tronService } from "./tron-service";
import { rippleService } from "./ripple-service";
import { cardanoService } from "./cardano-service";

interface BlockchainTransaction {
  txId: string;
  type: 'incoming' | 'outgoing';
  amount: number;
  timestamp: number;
  status: 'SUCCESS' | 'FAILED';
}

class CryptoMatchingService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 30 * 1000;
  private readonly TIMER_DURATION_MS = 10 * 60 * 1000;
  private readonly TOLERANCE_PERCENT = 5;

  start() {
    if (this.isRunning) {
      console.log('⚠️ سرویس تطبیق تراکنش‌ها از قبل در حال اجرا است');
      return;
    }

    console.log('🔄 سرویس تطبیق تراکنش‌های ارز دیجیتال شروع شد (بصورت پویا)');
    this.isRunning = true;

    this.checkAndProcessTransactions();

    this.intervalId = setInterval(() => {
      this.checkAndProcessTransactions();
    }, this.CHECK_INTERVAL_MS);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('⏹️ سرویس تطبیق تراکنش‌ها متوقف شد');
  }

  private async checkAndProcessTransactions() {
    try {
      const now = new Date();
      const timerCutoff = new Date(now.getTime() - this.TIMER_DURATION_MS);

      const pendingTransactions = await db
        .select({
          id: cryptoTransactions.id,
          orderId: cryptoTransactions.orderId,
          userId: cryptoTransactions.userId,
          cryptoType: cryptoTransactions.cryptoType,
          cryptoAmount: cryptoTransactions.cryptoAmount,
          tomanEquivalent: cryptoTransactions.tomanEquivalent,
          walletAddress: cryptoTransactions.walletAddress,
          registeredAt: cryptoTransactions.registeredAt,
          paymentStatus: cryptoTransactions.paymentStatus,
        })
        .from(cryptoTransactions)
        .where(
          and(
            eq(cryptoTransactions.paymentStatus, 'not_paid'),
            isNotNull(cryptoTransactions.registeredAt),
            gt(cryptoTransactions.registeredAt, timerCutoff),
            lte(cryptoTransactions.registeredAt, now)
          )
        );

      if (pendingTransactions.length === 0) {
        console.log('ℹ️ هیچ تراکنش فعالی برای بررسی وجود ندارد - سرویس خاموش می‌شود');
        this.stop();
        return;
      }

      console.log(`🔍 بررسی ${pendingTransactions.length} تراکنش پرداخت نشده با تایمر فعال...`);

      for (const transaction of pendingTransactions) {
        await this.matchTransaction(transaction);
      }

    } catch (error) {
      console.error('❌ خطا در بررسی تراکنش‌های پرداخت نشده:', error);
    }
  }

  async checkForActiveTransactionsAndStart() {
    try {
      const now = new Date();
      const timerCutoff = new Date(now.getTime() - this.TIMER_DURATION_MS);

      const activeTransactions = await db
        .select({ id: cryptoTransactions.id })
        .from(cryptoTransactions)
        .where(
          and(
            eq(cryptoTransactions.paymentStatus, 'not_paid'),
            isNotNull(cryptoTransactions.registeredAt),
            gt(cryptoTransactions.registeredAt, timerCutoff),
            lte(cryptoTransactions.registeredAt, now)
          )
        )
        .limit(1);

      if (activeTransactions.length > 0 && !this.isRunning) {
        console.log('✅ تراکنش فعال جدید شناسایی شد - سرویس فعال می‌شود');
        this.start();
      }
    } catch (error) {
      console.error('❌ خطا در بررسی تراکنش‌های فعال:', error);
    }
  }

  private async matchTransaction(transaction: {
    id: string;
    orderId: string;
    userId: string;
    cryptoType: string;
    cryptoAmount: string;
    tomanEquivalent: string;
    walletAddress: string | null;
    registeredAt: Date | null;
    paymentStatus: string;
  }) {
    try {
      if (!transaction.walletAddress) {
        return;
      }

      if (!transaction.registeredAt) {
        return;
      }

      const order = await db
        .select({
          sellerId: orders.sellerId,
          status: orders.status,
        })
        .from(orders)
        .where(eq(orders.id, transaction.orderId))
        .limit(1);

      if (order.length === 0) {
        return;
      }

      if (order[0].status !== 'awaiting_payment') {
        return;
      }

      const seller = await db
        .select({
          tronWalletAddress: users.tronWalletAddress,
          usdtTrc20WalletAddress: users.usdtTrc20WalletAddress,
          rippleWalletAddress: users.rippleWalletAddress,
          cardanoWalletAddress: users.cardanoWalletAddress,
        })
        .from(users)
        .where(eq(users.id, order[0].sellerId))
        .limit(1);

      if (seller.length === 0) {
        return;
      }

      const sellerWallets = seller[0];
      const expectedAmount = parseFloat(transaction.cryptoAmount);
      const registeredTime = new Date(transaction.registeredAt).getTime();

      let blockchainTransactions: BlockchainTransaction[] = [];

      switch (transaction.cryptoType) {
        case 'TRX':
          if (sellerWallets.tronWalletAddress) {
            try {
              const trxTxs = await tronService.getTransactions(
                sellerWallets.tronWalletAddress,
                'incoming',
                50
              );
              blockchainTransactions = trxTxs.map(tx => ({
                txId: tx.txId,
                type: tx.type,
                amount: tx.amount / 1_000_000,
                timestamp: tx.timestamp,
                status: tx.status,
              }));
            } catch (error) {
              console.error(`❌ خطا در دریافت تراکنش‌های TRX:`, error);
            }
          }
          break;

        case 'USDT':
          if (sellerWallets.usdtTrc20WalletAddress) {
            try {
              const usdtTxs = await tronService.getTRC20Transactions(
                sellerWallets.usdtTrc20WalletAddress,
                'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
                50
              );
              blockchainTransactions = usdtTxs
                .filter(tx => tx.type === 'incoming')
                .map(tx => ({
                  txId: tx.txId,
                  type: tx.type,
                  amount: typeof tx.amount === 'string' ? parseInt(tx.amount) / 1_000_000 : tx.amount / 1_000_000,
                  timestamp: tx.timestamp,
                  status: tx.status || 'SUCCESS',
                }));
            } catch (error) {
              console.error(`❌ خطا در دریافت تراکنش‌های USDT:`, error);
            }
          }
          break;

        case 'XRP':
          if (sellerWallets.rippleWalletAddress) {
            try {
              const xrpResult = await rippleService.getTransactions(
                sellerWallets.rippleWalletAddress,
                50
              );
              blockchainTransactions = xrpResult.transactions
                .filter(tx => tx.type === 'incoming' && tx.status === 'SUCCESS')
                .map(tx => ({
                  txId: tx.txId,
                  type: tx.type,
                  amount: tx.amount / 1_000_000,
                  timestamp: tx.timestamp,
                  status: tx.status,
                }));
            } catch (error) {
              console.error(`❌ خطا در دریافت تراکنش‌های XRP:`, error);
            }
          }
          break;

        case 'ADA':
          if (sellerWallets.cardanoWalletAddress) {
            try {
              const adaTxs = await cardanoService.getTransactions(
                sellerWallets.cardanoWalletAddress,
                50,
                1
              );
              blockchainTransactions = adaTxs
                .filter(tx => tx.type === 'incoming' && tx.status === 'SUCCESS')
                .map(tx => ({
                  txId: tx.txId,
                  type: tx.type,
                  amount: tx.amount / 1_000_000,
                  timestamp: tx.timestamp,
                  status: tx.status,
                }));
            } catch (error) {
              console.error(`❌ خطا در دریافت تراکنش‌های ADA:`, error);
            }
          }
          break;
      }

      if (blockchainTransactions.length === 0) {
        return;
      }

      const matchingTx = blockchainTransactions.find(tx => {
        if (tx.status !== 'SUCCESS') return false;
        if (tx.timestamp < registeredTime) return false;

        const minAmount = expectedAmount * (1 - this.TOLERANCE_PERCENT / 100);
        const maxAmount = expectedAmount * (1 + this.TOLERANCE_PERCENT / 100);

        return tx.amount >= minAmount && tx.amount <= maxAmount;
      });

      if (matchingTx) {
        const currentTransaction = await db
          .select({ paymentStatus: cryptoTransactions.paymentStatus })
          .from(cryptoTransactions)
          .where(eq(cryptoTransactions.id, transaction.id))
          .limit(1);

        if (currentTransaction.length === 0 || currentTransaction[0].paymentStatus !== 'not_paid') {
          return;
        }

        const currentOrder = await db
          .select({ status: orders.status })
          .from(orders)
          .where(eq(orders.id, transaction.orderId))
          .limit(1);

        if (currentOrder.length === 0 || currentOrder[0].status !== 'awaiting_payment') {
          return;
        }

        console.log(`✅ تطابق یافت شد! تراکنش ${transaction.id} با تراکنش بلاکچین ${matchingTx.txId}`);
        console.log(`   مقدار مورد انتظار: ${expectedAmount} ${transaction.cryptoType}`);
        console.log(`   مقدار دریافتی: ${matchingTx.amount} ${transaction.cryptoType}`);
        
        await db
          .update(cryptoTransactions)
          .set({ paymentStatus: 'paid' })
          .where(
            and(
              eq(cryptoTransactions.id, transaction.id),
              eq(cryptoTransactions.paymentStatus, 'not_paid')
            )
          );

        await db
          .update(orders)
          .set({ 
            status: 'pending',
            updatedAt: new Date()
          })
          .where(
            and(
              eq(orders.id, transaction.orderId),
              eq(orders.status, 'awaiting_payment')
            )
          );

        console.log(`📦 وضعیت سفارش ${transaction.orderId} به "در انتظار تایید" تغییر یافت`);
      }

    } catch (error) {
      console.error(`❌ خطا در تطبیق تراکنش ${transaction.id}:`, error);
    }
  }
}

export const cryptoMatchingService = new CryptoMatchingService();
