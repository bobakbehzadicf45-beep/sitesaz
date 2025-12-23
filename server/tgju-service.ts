interface CryptoPrices {
  TRX: number;
  USDT: number;
  XRP: number;
  ADA: number;
}

export class TGJUService {
  private async fetchProfilePriceInRial(
    profilePath: string,
    cryptoName: string,
    minPrice: number,
    maxPrice: number
  ): Promise<number> {
    const response = await fetch(`https://www.tgju.org${profilePath}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`خطا در دریافت قیمت ${cryptoName}: ${response.status}`);
    }

    const html = await response.text();
    
    const priceMatch = html.match(/قیمت\s*ریالی[\s\S]*?<td[^>]*>\s*([\d,]+)\s*<\/td>/i);
    
    if (!priceMatch || !priceMatch[1]) {
      throw new Error(`قیمت ${cryptoName} در صفحه یافت نشد`);
    }

    const priceStr = priceMatch[1].replace(/,/g, '');
    const priceInRial = parseInt(priceStr, 10);
    
    if (priceInRial < minPrice || priceInRial > maxPrice) {
      throw new Error(`قیمت ${cryptoName} خارج از محدوده مجاز است: ${priceInRial.toLocaleString('fa-IR')} ریال`);
    }

    console.log(`✅ قیمت ${cryptoName} دریافت شد: ${priceInRial.toLocaleString('fa-IR')} ریال`);
    return priceInRial;
  }

  async getTetherPriceInRial(): Promise<number> {
    return await this.fetchProfilePriceInRial(
      '/profile/crypto-tether',
      'تتر',
      800000,
      2000000
    );
  }

  async getTronPriceInRial(): Promise<number> {
    return await this.fetchProfilePriceInRial(
      '/profile/crypto-tron',
      'ترون',
      100000,
      1000000
    );
  }

  async getRipplePriceInRial(): Promise<number> {
    return await this.fetchProfilePriceInRial(
      '/profile/crypto-ripple',
      'ریپل',
      1000000,
      10000000
    );
  }

  async getCardanoPriceInRial(): Promise<number> {
    return await this.fetchProfilePriceInRial(
      '/profile/crypto-cardano',
      'کاردانو',
      100000,
      2000000
    );
  }

  async getTetherPriceInToman(): Promise<number> {
    const priceInRial = await this.getTetherPriceInRial();
    return Math.floor(priceInRial / 10);
  }

  async getTronPriceInToman(): Promise<number> {
    const priceInRial = await this.getTronPriceInRial();
    return Math.floor(priceInRial / 10);
  }

  async getAllCryptoPrices(): Promise<CryptoPrices> {
    const [usdtPrice, trxPrice, xrpPrice, adaPrice] = await Promise.all([
      this.getTetherPriceInRial(),
      this.getTronPriceInRial(),
      this.getRipplePriceInRial(),
      this.getCardanoPriceInRial(),
    ]);

    return {
      USDT: usdtPrice,
      TRX: trxPrice,
      XRP: xrpPrice,
      ADA: adaPrice,
    };
  }
}

export const tgjuService = new TGJUService();
