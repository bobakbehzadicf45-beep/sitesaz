import { bech32 } from 'bech32';

interface CardanoTransaction {
  tx_hash: string;
  block_height: number;
  block_time: number;
  inputs: Array<{
    address: string;
    amount: Array<{
      unit: string;
      quantity: string;
    }>;
  }>;
  outputs: Array<{
    address: string;
    amount: Array<{
      unit: string;
      quantity: string;
    }>;
  }>;
}

interface ProcessedCardanoTransaction {
  txId: string;
  type: 'incoming' | 'outgoing';
  amount: number;
  amountADA: string;
  amountUSD: string;
  amountIRR: string;
  from: string;
  to: string;
  timestamp: number;
  date: string;
  status: 'SUCCESS' | 'FAILED';
  explorerUrl: string;
}

interface CoinGeckoPrice {
  cardano: {
    usd: number;
    usd_24h_change: number;
  };
}

export class CardanoService {
  private readonly CARDANOSCAN_API_URL = 'https://api.cardanoscan.io/api/v1';
  private CARDANOSCAN_API_KEY: string = process.env.CARDANOSCAN_API_KEY || '';
  private readonly USD_TO_IRR_RATE = 70000;
  
  private adaPriceUSD: number = 0;
  private lastPriceFetch: number = 0;
  private readonly PRICE_CACHE_DURATION = 60000;

  constructor() {
    this.loadApiKeyFromDatabase();
  }

  private async loadApiKeyFromDatabase(): Promise<void> {
    try {
      const { storage } = await import("./storage");
      const settings = await storage.getBlockchainSettings('cardano');
      if (settings && settings.apiKey) {
        this.CARDANOSCAN_API_KEY = settings.apiKey;
        console.log('✅ توکن کاردانو از دیتابیس بارگذاری شد');
      } else if (!this.CARDANOSCAN_API_KEY) {
        console.warn('⚠️ CARDANOSCAN_API_KEY تنظیم نشده است');
      }
    } catch (error) {
      console.error('خطا در بارگذاری توکن کاردانو از دیتابیس:', error);
    }
  }

  async reloadApiKey(): Promise<void> {
    await this.loadApiKeyFromDatabase();
  }
  
  private formatAmount(lovelace: string): string {
    const adaAmount = parseInt(lovelace) / 1_000_000;
    return adaAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  }

  private async getADAPrice(): Promise<number> {
    const now = Date.now();
    
    if (this.adaPriceUSD > 0 && (now - this.lastPriceFetch) < this.PRICE_CACHE_DURATION) {
      return this.adaPriceUSD;
    }

    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=cardano&vs_currencies=usd&include_24hr_change=true');
      
      if (!response.ok) {
        console.warn('⚠️ خطا در دریافت قیمت ADA از CoinGecko');
        return this.adaPriceUSD || 0.54;
      }

      const data: CoinGeckoPrice = await response.json();
      this.adaPriceUSD = data.cardano?.usd || 0.54;
      this.lastPriceFetch = now;
      
      console.log(`💰 قیمت فعلی ADA: $${this.adaPriceUSD}`);
      return this.adaPriceUSD;
    } catch (error) {
      console.error('خطا در دریافت قیمت ADA:', error);
      return this.adaPriceUSD || 0.54;
    }
  }

  private formatUSD(ada: number, priceUSD: number): string {
    const usdValue = ada * priceUSD;
    return usdValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  private formatIRR(ada: number, priceUSD: number): string {
    const irrValue = ada * priceUSD * this.USD_TO_IRR_RATE;
    return irrValue.toLocaleString('fa-IR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  private bech32ToHex(address: string): string {
    try {
      if (!address.startsWith('addr')) {
        return address;
      }
      
      const decoded = bech32.decode(address, 1000);
      const words = decoded.words;
      const bytes = bech32.fromWords(words);
      return Buffer.from(bytes).toString('hex');
    } catch (error) {
      console.error('خطا در تبدیل Bech32 به Hex:', error);
      throw new Error('فرمت آدرس کاردانو نامعتبر است');
    }
  }

  async getTransactions(
    walletAddress: string,
    limit: number = 20,
    page: number = 1
  ): Promise<ProcessedCardanoTransaction[]> {
    try {
      if (!walletAddress || walletAddress.trim() === '') {
        throw new Error('آدرس ولت معتبر نیست');
      }

      if (!this.CARDANOSCAN_API_KEY) {
        console.warn('⚠️ CARDANOSCAN_API_KEY تنظیم نشده است');
        throw new Error('سرویس Cardano غیرفعال است. لطفاً با مدیر تماس بگیرید تا CARDANOSCAN_API_KEY را تنظیم کند.');
      }

      const adaPrice = await this.getADAPrice();

      const requestLimit = Math.min(limit, 50);
      const hexAddress = this.bech32ToHex(walletAddress);
      const url = `${this.CARDANOSCAN_API_URL}/transaction/list?address=${encodeURIComponent(hexAddress)}&pageNo=${page}&limit=${requestLimit}&order=desc`;
      
      console.log(`📡 درخواست تراکنش‌های Cardano برای آدرس: ${walletAddress.substring(0, 20)}...`);
      console.log(`🔄 آدرس Hex: ${hexAddress.substring(0, 20)}...`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'apiKey': this.CARDANOSCAN_API_KEY
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log('ℹ️ هیچ تراکنشی برای این آدرس یافت نشد');
          return [];
        }
        const errorText = await response.text();
        console.error(`خطا ${response.status}: ${errorText}`);
        throw new Error(`خطا در دریافت تراکنش‌ها: ${response.status}`);
      }

      const data = await response.json();

      if (!data.transactions || !Array.isArray(data.transactions) || data.transactions.length === 0) {
        console.log('ℹ️ لیست تراکنش‌ها خالی است');
        return [];
      }

      // لاگ ساختار اولین تراکنش برای دیباگ
      if (data.transactions.length > 0) {
        console.log('🔍 ساختار اولین تراکنش:', JSON.stringify(data.transactions[0], null, 2));
      }

      const transactions: ProcessedCardanoTransaction[] = [];

      for (const tx of data.transactions) {
        try {
          // استفاده از فیلد صحیح برای transaction hash
          const txHash = tx.hash || tx.tx_hash;
          
          let isIncoming = false;
          let totalAmount = 0;
          let fromAddress = '';
          let toAddress = '';

          // بررسی آدرس به صورت hex و bech32
          const checkAddress = (addr: string) => {
            return addr === hexAddress || addr === walletAddress;
          };

          if (tx.outputs && Array.isArray(tx.outputs)) {
            for (const output of tx.outputs) {
              if (checkAddress(output.address)) {
                isIncoming = true;
                toAddress = output.address;
                // دریافت مقدار ADA - چک کنیم آیا value مستقیم وجود داره یا از amount array
                if (output.value) {
                  totalAmount += parseInt(output.value);
                } else if (output.amount && Array.isArray(output.amount)) {
                  const adaItem = output.amount.find((a: any) => a.unit === 'lovelace');
                  if (adaItem) {
                    totalAmount += parseInt(adaItem.quantity || '0');
                  }
                }
              }
            }
          }

          if (!isIncoming && tx.inputs && Array.isArray(tx.inputs)) {
            for (const input of tx.inputs) {
              if (checkAddress(input.address)) {
                fromAddress = input.address;
                // دریافت مقدار ADA - چک کنیم آیا value مستقیم وجود داره یا از amount array
                if (input.value) {
                  totalAmount += parseInt(input.value);
                } else if (input.amount && Array.isArray(input.amount)) {
                  const adaItem = input.amount.find((a: any) => a.unit === 'lovelace');
                  if (adaItem) {
                    totalAmount += parseInt(adaItem.quantity || '0');
                  }
                }
              }
            }
          }

          if (isIncoming && tx.inputs && tx.inputs.length > 0) {
            fromAddress = tx.inputs[0].address || 'N/A';
          } else if (!isIncoming && tx.outputs && tx.outputs.length > 0) {
            toAddress = tx.outputs[0].address || 'N/A';
          }

          const timestamp = tx.block_time ? tx.block_time * 1000 : Date.now();
          const adaAmount = totalAmount / 1_000_000;

          // Debug log
          if (totalAmount === 0) {
            console.log(`⚠️ تراکنش ${txHash}: مبلغ صفر! incoming=${isIncoming}, inputs=${tx.inputs?.length || 0}, outputs=${tx.outputs?.length || 0}`);
            if (tx.inputs && tx.inputs.length > 0) {
              console.log(`  Input sample:`, JSON.stringify(tx.inputs[0]).substring(0, 300));
            }
            if (tx.outputs && tx.outputs.length > 0) {
              console.log(`  Output sample:`, JSON.stringify(tx.outputs[0]).substring(0, 300));
            }
          }

          transactions.push({
            txId: txHash,
            type: isIncoming ? 'incoming' : 'outgoing',
            amount: totalAmount,
            amountADA: this.formatAmount(totalAmount.toString()),
            amountUSD: this.formatUSD(adaAmount, adaPrice),
            amountIRR: this.formatIRR(adaAmount, adaPrice),
            from: fromAddress || 'N/A',
            to: toAddress || 'N/A',
            timestamp: timestamp,
            date: new Date(timestamp).toLocaleString('fa-IR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }),
            status: 'SUCCESS',
            explorerUrl: `https://cardanoscan.io/transaction/${txHash}`
          });

        } catch (error) {
          console.error(`خطا در پردازش تراکنش ${tx.hash || tx.tx_hash || 'unknown'}:`, error);
          continue;
        }
      }

      console.log(`✅ ${transactions.length} تراکنش با موفقیت دریافت شد`);
      return transactions;

    } catch (error) {
      console.error('خطا در دریافت تراکنش‌های Cardano:', error);
      throw error;
    }
  }

  validateCardanoAddress(address: string): boolean {
    if (!address) return false;
    
    const cardanoRegex = /^addr1[a-z0-9]{58,}$/;
    return cardanoRegex.test(address.trim());
  }
}

export const cardanoService = new CardanoService();
