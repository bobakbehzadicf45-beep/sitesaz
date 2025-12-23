import crypto from 'crypto';

interface RippleTransaction {
  hash: string;
  Account: string;
  Destination: string;
  Amount: string | {
    currency: string;
    value: string | number;
  };
  date: string;
  TransactionType: string;
  meta: {
    TransactionResult: string;
    TransactionIndex: number;
    delivered_amount?: {
      value: string | number;
      currency: string;
    };
  };
  validated: boolean;
  ledger_index: number;
  Fee: string;
  DestinationTag?: number;
  AccountName?: {
    name: string;
    desc?: string;
    account: string;
    domain?: string;
    twitter?: string;
    verified?: boolean;
  };
  DestinationName?: {
    name: string;
    desc?: string;
    account: string;
    domain?: string;
    twitter?: string;
    verified?: boolean;
  };
}

interface ProcessedRippleTransaction {
  txId: string;
  type: 'incoming' | 'outgoing';
  amount: number;
  amountXRP: string;
  from: string;
  to: string;
  timestamp: number;
  date: string;
  status: 'SUCCESS' | 'FAILED';
  explorerUrl: string;
  fee?: string;
  destinationTag?: number;
  accountName?: string;
  destinationName?: string;
}

export class RippleService {
  private readonly RIPPLE_API_URL = 'https://api.xrpscan.com/api/v1';
  private readonly MARKER_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
  private readonly MARKER_EXPIRY_MS = 30 * 60 * 1000;
  
  private formatAmount(amount: string | number | { value: string | number; currency: string }): string {
    let xrpAmount: number;
    
    if (typeof amount === 'object' && amount.value) {
      xrpAmount = typeof amount.value === 'string' ? parseFloat(amount.value) : amount.value;
    } else if (typeof amount === 'string') {
      xrpAmount = parseFloat(amount) / 1_000_000;
    } else if (typeof amount === 'number') {
      xrpAmount = amount / 1_000_000;
    } else {
      xrpAmount = 0;
    }
    
    return xrpAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  }

  private parseAmountValue(amount: string | { value: string | number; currency: string }): number {
    if (typeof amount === 'object' && amount.value) {
      const value = typeof amount.value === 'string' ? parseFloat(amount.value) : amount.value;
      return value * 1_000_000;
    } else if (typeof amount === 'string') {
      return parseInt(amount);
    }
    return 0;
  }

  private parseDateString(dateString: string): number {
    return new Date(dateString).getTime();
  }

  private signMarker(walletAddress: string, marker: string): string {
    const expiresAt = Date.now() + this.MARKER_EXPIRY_MS;
    const payload = `${walletAddress}:${marker}:${expiresAt}`;
    const signature = crypto
      .createHmac('sha256', this.MARKER_SECRET)
      .update(payload)
      .digest('hex');
    
    const signedMarker = Buffer.from(
      JSON.stringify({ marker, expiresAt, signature })
    ).toString('base64');
    
    return signedMarker;
  }

  private verifyMarker(walletAddress: string, signedMarker: string): string | null {
    try {
      const decoded = JSON.parse(
        Buffer.from(signedMarker, 'base64').toString('utf8')
      );
      
      const { marker, expiresAt, signature } = decoded;
      
      if (!marker || !expiresAt || !signature) {
        return null;
      }
      
      if (Date.now() > expiresAt) {
        return null;
      }
      
      const payload = `${walletAddress}:${marker}:${expiresAt}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.MARKER_SECRET)
        .update(payload)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        return null;
      }
      
      return marker;
    } catch (error) {
      console.error('خطا در اعتبارسنجی marker:', error);
      return null;
    }
  }

  async getTransactions(
    walletAddress: string,
    limit: number = 50,
    signedMarker?: string
  ): Promise<{ transactions: ProcessedRippleTransaction[]; marker?: string }> {
    try {
      if (!walletAddress || walletAddress.trim() === '') {
        throw new Error('آدرس ولت معتبر نیست');
      }

      let apiMarker: string | undefined;
      if (signedMarker) {
        const verifiedMarker = this.verifyMarker(walletAddress, signedMarker);
        if (!verifiedMarker) {
          throw new Error('marker نامعتبر یا منقضی شده است');
        }
        apiMarker = verifiedMarker;
      }

      const params = new URLSearchParams();
      params.append('limit', Math.min(limit, 100).toString());
      if (apiMarker) {
        params.append('marker', apiMarker);
      }

      const url = `${this.RIPPLE_API_URL}/account/${walletAddress}/transactions?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { transactions: [] };
        }
        throw new Error(`خطا در دریافت تراکنش‌ها: ${response.status}`);
      }

      const data = await response.json();

      if (!data.transactions || !Array.isArray(data.transactions)) {
        return { transactions: [] };
      }

      const transactions: ProcessedRippleTransaction[] = data.transactions
        .filter((tx: RippleTransaction) => {
          return tx.TransactionType === 'Payment' && 
                 (typeof tx.Amount === 'string' || (typeof tx.Amount === 'object' && tx.Amount.currency === 'XRP'));
        })
        .map((tx: RippleTransaction) => {
          const fromAddress = tx.Account;
          const toAddress = tx.Destination;
          const amount = this.parseAmountValue(tx.Amount);
          
          const isIncoming = toAddress.toLowerCase() === walletAddress.toLowerCase();
          const isSuccess = tx.meta?.TransactionResult === 'tesSUCCESS';
          const timestamp = this.parseDateString(tx.date);

          const feeXRP = tx.Fee ? (parseInt(tx.Fee) / 1_000_000).toFixed(6) : undefined;

          return {
            txId: tx.hash,
            type: isIncoming ? 'incoming' : 'outgoing',
            amount: amount,
            amountXRP: this.formatAmount(tx.Amount),
            from: fromAddress,
            to: toAddress,
            timestamp: timestamp,
            date: new Date(timestamp).toLocaleString('fa-IR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }),
            status: isSuccess ? 'SUCCESS' : 'FAILED',
            explorerUrl: `https://xrpscan.com/tx/${tx.hash}`,
            fee: feeXRP,
            destinationTag: tx.DestinationTag,
            accountName: tx.AccountName?.name,
            destinationName: tx.DestinationName?.name
          };
        });

      const responseMarker = data.marker && typeof data.marker === 'string'
        ? this.signMarker(walletAddress, data.marker)
        : undefined;

      return {
        transactions,
        marker: responseMarker
      };

    } catch (error) {
      console.error('خطا در دریافت تراکنش‌های Ripple:', error);
      throw error;
    }
  }

  validateRippleAddress(address: string): boolean {
    if (!address) return false;
    
    const rippleRegex = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
    return rippleRegex.test(address.trim());
  }
}

export const rippleService = new RippleService();
