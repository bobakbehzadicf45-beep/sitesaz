import { createHash } from 'crypto';

interface TronTransaction {
  txID: string;
  block_timestamp: number;
  raw_data: {
    contract: Array<{
      type: string;
      parameter: {
        value: {
          owner_address?: string;
          to_address?: string;
          amount?: number;
        };
      };
    }>;
  };
  ret?: Array<{
    contractRet: string;
  }>;
}

interface TronApiResponse {
  success: boolean;
  data: TronTransaction[];
  meta?: {
    at: number;
    page_size: number;
    fingerprint?: string;
  };
}

interface ProcessedTransaction {
  txId: string;
  type: 'incoming' | 'outgoing';
  amount: number;
  amountTRX: string;
  from: string;
  to: string;
  timestamp: number;
  date: string;
  status: 'SUCCESS' | 'FAILED';
  explorerUrl: string;
}

export class TronService {
  private readonly TRONGRID_API_URL = 'https://api.trongrid.io';
  private readonly TRONGRID_API_KEY = process.env.TRONGRID_API_KEY || '';
  
  private hexToBase58(hexAddress: string): string {
    if (!hexAddress || hexAddress.length !== 42) {
      return hexAddress;
    }
    
    try {
      const hexStr = hexAddress.startsWith('41') ? hexAddress.substring(2) : hexAddress;
      const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      
      const hexBytes = Buffer.from(hexAddress, 'hex');
      
      const hash1 = createHash('sha256').update(hexBytes).digest();
      const hash2 = createHash('sha256').update(hash1).digest();
      const checksum = hash2.slice(0, 4);
      const combined = Buffer.concat([hexBytes, checksum]);
      
      let num = BigInt('0x' + combined.toString('hex'));
      let result = '';
      
      while (num > 0n) {
        const remainder = Number(num % 58n);
        result = base58Chars[remainder] + result;
        num = num / 58n;
      }
      
      for (let i = 0; i < combined.length && combined[i] === 0; i++) {
        result = '1' + result;
      }
      
      return result;
    } catch (error) {
      console.error('خطا در تبدیل hex به base58:', error);
      return hexAddress;
    }
  }

  private base58ToHex(base58Address: string): string {
    if (!base58Address || !base58Address.startsWith('T')) {
      return base58Address;
    }
    
    try {
      const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      let num = 0n;
      
      for (const char of base58Address) {
        const value = base58Chars.indexOf(char);
        if (value === -1) return base58Address;
        num = num * 58n + BigInt(value);
      }
      
      let hex = num.toString(16);
      if (hex.length % 2) hex = '0' + hex;
      
      return hex.substring(0, hex.length - 8);
    } catch (error) {
      console.error('خطا در تبدیل base58 به hex:', error);
      return base58Address;
    }
  }

  private formatAmount(amount: number): string {
    const trxAmount = amount / 1_000_000;
    return trxAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  }

  async getTransactions(
    walletAddress: string,
    type: 'all' | 'incoming' | 'outgoing' = 'all',
    limit: number = 50
  ): Promise<ProcessedTransaction[]> {
    try {
      if (!walletAddress || walletAddress.trim() === '') {
        throw new Error('آدرس ولت معتبر نیست');
      }

      const params = new URLSearchParams({
        limit: Math.min(limit, 200).toString(),
        only_confirmed: 'true',
      });

      if (type === 'incoming') {
        params.append('only_to', 'true');
      } else if (type === 'outgoing') {
        params.append('only_from', 'true');
      }

      const url = `${this.TRONGRID_API_URL}/v1/accounts/${walletAddress}/transactions?${params}`;
      
      const headers: HeadersInit = {
        'Accept': 'application/json',
      };

      if (this.TRONGRID_API_KEY) {
        headers['TRON-PRO-API-KEY'] = this.TRONGRID_API_KEY;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('خطای TronGrid API:', response.status, errorText);
        
        if (response.status === 404) {
          return [];
        }
        
        throw new Error(`خطا در دریافت تراکنش‌ها: ${response.status}`);
      }

      const data: TronApiResponse = await response.json();

      if (!data.success || !data.data) {
        console.log('پاسخ API موفقیت‌آمیز نبود یا داده‌ای وجود ندارد');
        return [];
      }

      const transactions: ProcessedTransaction[] = data.data
        .filter(tx => {
          if (!tx.raw_data?.contract?.[0]) return false;
          const contract = tx.raw_data.contract[0];
          return contract.type === 'TransferContract' && contract.parameter?.value;
        })
        .map(tx => {
          const contract = tx.raw_data.contract[0];
          const value = contract.parameter.value;
          const fromAddressHex = value.owner_address || '';
          const toAddressHex = value.to_address || '';
          const amount = value.amount || 0;
          
          const fromAddress = this.hexToBase58(fromAddressHex);
          const toAddress = this.hexToBase58(toAddressHex);
          
          const walletAddressLower = walletAddress.toLowerCase();
          const isIncoming = toAddress.toLowerCase() === walletAddressLower;
          
          const isSuccess = tx.ret?.[0]?.contractRet === 'SUCCESS' || !tx.ret;

          return {
            txId: tx.txID,
            type: isIncoming ? 'incoming' : 'outgoing',
            amount: amount,
            amountTRX: this.formatAmount(amount),
            from: fromAddress,
            to: toAddress,
            timestamp: tx.block_timestamp,
            date: new Date(tx.block_timestamp).toLocaleString('fa-IR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }),
            status: isSuccess ? 'SUCCESS' : 'FAILED',
            explorerUrl: `https://tronscan.org/#/transaction/${tx.txID}`
          };
        });

      return transactions;

    } catch (error) {
      console.error('خطا در دریافت تراکنش‌های TRON:', error);
      throw error;
    }
  }

  async getTRC20Transactions(
    walletAddress: string,
    contractAddress: string = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    limit: number = 50
  ): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        limit: Math.min(limit, 200).toString(),
        contract_address: contractAddress,
      });

      const url = `${this.TRONGRID_API_URL}/v1/accounts/${walletAddress}/transactions/trc20?${params}`;
      
      const headers: HeadersInit = {
        'Accept': 'application/json',
      };

      if (this.TRONGRID_API_KEY) {
        headers['TRON-PRO-API-KEY'] = this.TRONGRID_API_KEY;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`خطا در دریافت تراکنش‌های TRC20: ${response.status}`);
      }

      const data: TronApiResponse = await response.json();

      if (!data.success || !data.data) {
        return [];
      }

      return data.data.map((tx: any) => ({
        txId: tx.transaction_id,
        type: tx.to === walletAddress ? 'incoming' : 'outgoing',
        amount: tx.value,
        from: tx.from,
        to: tx.to,
        timestamp: tx.block_timestamp,
        date: new Date(tx.block_timestamp).toLocaleString('fa-IR'),
        tokenName: tx.token_info?.name || 'TRC20',
        tokenSymbol: tx.token_info?.symbol || 'TRC20',
        status: 'SUCCESS',
        explorerUrl: `https://tronscan.org/#/transaction/${tx.transaction_id}`
      }));

    } catch (error) {
      console.error('خطا در دریافت تراکنش‌های TRC20:', error);
      throw error;
    }
  }

  validateTronAddress(address: string): boolean {
    if (!address) return false;
    
    const base58Regex = /^T[A-Za-z1-9]{33}$/;
    return base58Regex.test(address.trim());
  }
}

export const tronService = new TronService();
