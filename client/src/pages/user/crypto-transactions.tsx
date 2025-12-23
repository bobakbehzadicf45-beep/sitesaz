import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Copy,
  Info,
  Pencil,
  Coins
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { createAuthenticatedRequest } from "@/lib/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CryptoTransaction {
  txId: string;
  type: 'incoming' | 'outgoing';
  amount: number;
  amountTRX?: string;
  amountXRP?: string;
  amountADA?: string;
  amountUSD?: string;
  amountIRR?: string;
  from: string;
  to: string;
  timestamp: number;
  date: string;
  status: 'SUCCESS' | 'FAILED';
  explorerUrl: string;
  tokenName?: string;
  tokenSymbol?: string;
}

export default function CryptoTransactions() {
  const [walletAddress, setWalletAddress] = useState("");
  const [usdtWalletAddress, setUsdtWalletAddress] = useState("");
  const [rippleWalletAddress, setRippleWalletAddress] = useState("");
  const [cardanoWalletAddress, setCardanoWalletAddress] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingWallet, setEditingWallet] = useState<string | null>(null);
  const [activeWallets, setActiveWallets] = useState<string[]>([]);
  const [tronPage, setTronPage] = useState(1);
  const [usdtPage, setUsdtPage] = useState(1);
  const [rippleMarker, setRippleMarker] = useState<string | undefined>(undefined);
  const [cardanoPage, setCardanoPage] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cryptoPrices, refetch: refetchPrices, isRefetching: isRefetchingPrices } = useQuery({
    queryKey: ["/api/crypto/prices"],
    queryFn: async () => {
      const response = await createAuthenticatedRequest("/api/crypto/prices");
      if (!response.ok) throw new Error("خطا در دریافت قیمت‌ها");
      return response.json();
    },
    refetchInterval: 60000, // Update every 1 minute
    staleTime: 0, // Always fetch fresh data when refetch is called
  });

  const truncateAddress = (address: string, maxLength: number = 33) => {
    if (address.length <= maxLength) return address;
    return address.substring(0, maxLength) + '...';
  };

  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ["/api/tron/wallet"],
    queryFn: async () => {
      const response = await createAuthenticatedRequest("/api/tron/wallet");
      if (!response.ok) throw new Error("خطا در دریافت آدرس ولت");
      return response.json();
    },
  });

  const { data: tronData, isLoading: tronLoading, error: tronError } = useQuery({
    queryKey: ["/api/tron/transactions", tronPage],
    queryFn: async () => {
      const offset = (tronPage - 1) * 20;
      const response = await createAuthenticatedRequest(`/api/tron/transactions?limit=20&offset=${offset}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    enabled: !!walletData?.walletAddress,
    refetchInterval: 30000,
  });

  const { data: usdtData, isLoading: usdtLoading, error: usdtError } = useQuery({
    queryKey: ["/api/tron/transactions/trc20", usdtPage],
    queryFn: async () => {
      const offset = (usdtPage - 1) * 20;
      const response = await createAuthenticatedRequest(`/api/tron/transactions/trc20?limit=20&offset=${offset}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    enabled: !!walletData?.usdtWalletAddress,
    refetchInterval: 30000,
  });

  const { data: rippleData, isLoading: rippleLoading, error: rippleError } = useQuery({
    queryKey: ["/api/ripple/transactions", rippleMarker],
    queryFn: async () => {
      let url = `/api/ripple/transactions?limit=50`;
      if (rippleMarker) {
        url += `&marker=${encodeURIComponent(rippleMarker)}`;
      }
      const response = await createAuthenticatedRequest(url);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    enabled: !!walletData?.rippleWalletAddress,
    refetchInterval: 30000,
  });

  const { data: cardanoData, isLoading: cardanoLoading, error: cardanoError } = useQuery({
    queryKey: ["/api/cardano/transactions", cardanoPage],
    queryFn: async () => {
      const response = await createAuthenticatedRequest(`/api/cardano/transactions?limit=20&page=${cardanoPage}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    enabled: !!walletData?.cardanoWalletAddress,
    refetchInterval: 30000,
  });

  const saveWalletMutation = useMutation({
    mutationFn: async (addresses: { 
      walletAddress: string, 
      usdtWalletAddress: string, 
      rippleWalletAddress: string, 
      cardanoWalletAddress: string 
    }) => {
      const response = await createAuthenticatedRequest("/api/tron/wallet", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addresses),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tron/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tron/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tron/transactions/trc20"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ripple/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cardano/transactions"] });
      
      // فعال کردن خودکار ارزهایی که آدرس جدید دارند
      const newActiveWallets: string[] = [];
      if (variables.walletAddress?.trim()) newActiveWallets.push('tron');
      if (variables.usdtWalletAddress?.trim()) newActiveWallets.push('usdt');
      if (variables.rippleWalletAddress?.trim()) newActiveWallets.push('ripple');
      if (variables.cardanoWalletAddress?.trim()) newActiveWallets.push('cardano');
      setActiveWallets(newActiveWallets);
      
      toast({
        title: "✅ موفق",
        description: "آدرس‌های ولت با موفقیت ذخیره شدند",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "❌ خطا",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveWallet = () => {
    if (!walletAddress.trim() && !usdtWalletAddress.trim() && !rippleWalletAddress.trim() && !cardanoWalletAddress.trim()) {
      toast({
        title: "⚠️ خطا",
        description: "لطفاً حداقل یک آدرس ولت را وارد کنید",
        variant: "destructive",
      });
      return;
    }
    saveWalletMutation.mutate({
      walletAddress,
      usdtWalletAddress,
      rippleWalletAddress,
      cardanoWalletAddress
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "کپی شد",
      description: "آدرس در کلیپبورد کپی شد",
    });
  };

  const handleToggleActive = (wallet: string) => {
    setActiveWallets(prev => {
      const newActiveWallets = prev.includes(wallet)
        ? prev.filter(w => w !== wallet)
        : [...prev, wallet];
      
      // ذخیره در localStorage
      localStorage.setItem('activeWallets', JSON.stringify(newActiveWallets));
      return newActiveWallets;
    });
  };

  useEffect(() => {
    if (walletData) {
      setWalletAddress(walletData.walletAddress || "");
      setUsdtWalletAddress(walletData.usdtWalletAddress || "");
      setRippleWalletAddress(walletData.rippleWalletAddress || "");
      setCardanoWalletAddress(walletData.cardanoWalletAddress || "");
      
      // بررسی localStorage برای وضعیت ذخیره شده
      const savedActiveWallets = localStorage.getItem('activeWallets');
      if (savedActiveWallets) {
        try {
          const parsedActiveWallets = JSON.parse(savedActiveWallets);
          setActiveWallets(parsedActiveWallets);
        } catch {
          // اگر خطا داشت، از حالت پیش‌فرض استفاده کن
          const activeList: string[] = [];
          if (walletData.walletAddress) activeList.push('tron');
          if (walletData.usdtWalletAddress) activeList.push('usdt');
          if (walletData.rippleWalletAddress) activeList.push('ripple');
          if (walletData.cardanoWalletAddress) activeList.push('cardano');
          setActiveWallets(activeList);
          localStorage.setItem('activeWallets', JSON.stringify(activeList));
        }
      } else {
        // فعال کردن خودکار ارزهایی که آدرس دارند
        const activeList: string[] = [];
        if (walletData.walletAddress) activeList.push('tron');
        if (walletData.usdtWalletAddress) activeList.push('usdt');
        if (walletData.rippleWalletAddress) activeList.push('ripple');
        if (walletData.cardanoWalletAddress) activeList.push('cardano');
        setActiveWallets(activeList);
        localStorage.setItem('activeWallets', JSON.stringify(activeList));
      }
    }
  }, [walletData]);

  if (walletLoading) {
    return (
      <DashboardLayout title="تراکنش ارز دیجیتال">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const TransactionTable = ({ 
    transactions, 
    isLoading, 
    error,
    currencySymbol,
    amountKey,
    showPriceColumns = false,
    centerAlign = false,
    page,
    onPageChange,
    hidePagination = false,
    showTomanAmount = false,
    tomanPrice = 0,
    tomanFirst = false,
    showTomanCurrencySymbol = true,
    hideBorder = false
  }: { 
    transactions: CryptoTransaction[], 
    isLoading: boolean,
    error: Error | null,
    currencySymbol: string,
    amountKey: 'amountTRX' | 'amountXRP' | 'amountADA' | 'tokenSymbol',
    showPriceColumns?: boolean,
    centerAlign?: boolean,
    page: number,
    onPageChange: (newPage: number) => void,
    hidePagination?: boolean,
    showTomanAmount?: boolean,
    tomanPrice?: number,
    tomanFirst?: boolean,
    showTomanCurrencySymbol?: boolean,
    hideBorder?: boolean
  }) => (
    <Card>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.message}
            </AlertDescription>
          </Alert>
        ) : transactions.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              هیچ تراکنشی برای این ولت یافت نشد.
            </AlertDescription>
          </Alert>
        ) : (
          <div className={hideBorder ? "rounded-md" : "rounded-md border"}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={centerAlign ? "text-center" : "text-right"}>جزئیات</TableHead>
                  <TableHead className={centerAlign ? "text-center" : "text-right"}>وضعیت</TableHead>
                  <TableHead className={centerAlign ? "text-center" : "text-right"}>تاریخ</TableHead>
                  {tomanFirst && showTomanAmount ? (
                    <>
                      <TableHead className={centerAlign ? "text-center" : "text-right"}>مبلغ (ریال)</TableHead>
                      <TableHead className={centerAlign ? "text-center" : "text-right"}>مبلغ ({currencySymbol})</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className={centerAlign ? "text-center" : "text-right"}>مبلغ ({currencySymbol})</TableHead>
                      {showTomanAmount && (
                        <TableHead className={centerAlign ? "text-center" : "text-right"}>مبلغ (ریال)</TableHead>
                      )}
                    </>
                  )}
                  {showPriceColumns && (
                    <TableHead className={centerAlign ? "text-center" : "text-right"}>قیمت (ریال)</TableHead>
                  )}
                  <TableHead className={centerAlign ? "text-center" : "text-right"}>نوع</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.txId}>
                    <TableCell className={centerAlign ? "text-center" : "text-right"}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(tx.explorerUrl, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </TableCell>
                    <TableCell className={centerAlign ? "text-center" : "text-right"}>
                      {tx.status === 'SUCCESS' ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle2 className="w-3 h-3 ml-1" />
                          موفق
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          <AlertCircle className="w-3 h-3 ml-1" />
                          ناموفق
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className={centerAlign ? "text-center text-sm text-muted-foreground" : "text-sm text-muted-foreground text-right"} dir="ltr">
                      {tx.date}
                    </TableCell>
                    {tomanFirst && showTomanAmount ? (
                      <>
                        <TableCell className={centerAlign ? "font-semibold text-center text-green-600" : "font-semibold text-right text-green-600"} dir="rtl">
                          {tomanPrice > 0 
                            ? (() => {
                                const numericAmount = amountKey === 'tokenSymbol' 
                                  ? (tx.amount / 1000000)
                                  : parseFloat(tx[amountKey]?.toString().replace(/,/g, '') || '0');
                                return Math.floor(numericAmount * tomanPrice).toLocaleString('fa-IR') + (showTomanCurrencySymbol ? ' ﷼' : '');
                              })()
                            : '0'}
                        </TableCell>
                        <TableCell className={centerAlign ? "font-mono font-semibold text-center" : "font-mono font-semibold text-right"}>
                          {amountKey === 'tokenSymbol' 
                            ? `${(tx.amount / 1000000).toLocaleString('en-US')} ${tx.tokenSymbol || 'USDT'}`
                            : tx[amountKey]}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className={centerAlign ? "font-mono font-semibold text-center" : "font-mono font-semibold text-right"}>
                          {amountKey === 'tokenSymbol' 
                            ? `${(tx.amount / 1000000).toLocaleString('en-US')} ${tx.tokenSymbol || 'USDT'}`
                            : tx[amountKey]}
                        </TableCell>
                        {showTomanAmount && (
                          <TableCell className={centerAlign ? "font-semibold text-center text-green-600" : "font-semibold text-right text-green-600"} dir="rtl">
                            {tomanPrice > 0 
                              ? (() => {
                                  const numericAmount = amountKey === 'tokenSymbol' 
                                    ? (tx.amount / 1000000)
                                    : parseFloat(tx[amountKey]?.toString().replace(/,/g, '') || '0');
                                  return Math.floor(numericAmount * tomanPrice).toLocaleString('fa-IR') + (showTomanCurrencySymbol ? ' ﷼' : '');
                                })()
                              : showTomanCurrencySymbol ? '0 ﷼' : '0'}
                          </TableCell>
                        )}
                      </>
                    )}
                    {showPriceColumns && (
                      <TableCell className={centerAlign ? "font-mono text-center text-green-600" : "font-mono text-right text-green-600"} dir="rtl">
                        {tx.amountIRR || '0'} ﷼
                      </TableCell>
                    )}
                    <TableCell className={centerAlign ? "text-center" : "text-right"}>
                      {tx.type === 'incoming' ? (
                        <Badge className="bg-green-500">
                          <ArrowDownLeft className="w-3 h-3 ml-1" />
                          دریافتی
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500">
                          <ArrowUpRight className="w-3 h-3 ml-1" />
                          ارسالی
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {!hidePagination && transactions.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              صفحه {page} - {transactions.length} تراکنش
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1 || isLoading}
              >
                قبلی
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={transactions.length < 20 || isLoading}
              >
                بعدی
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout title="تراکنش ارز دیجیتال">
      <div className="space-y-6">
        <Card>
          <CardHeader>
          </CardHeader>
          <CardContent>
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">نوع ارز</TableHead>
                    <TableHead className="text-center">قیمت</TableHead>
                    <TableHead className="text-center">آدرس ولت</TableHead>
                    <TableHead className="text-center w-[180px]">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2">
                        <img src="/images/tron-logo.jpg" alt="TRX" className="w-6 h-6 rounded-full" />
                        <Badge variant="outline" className="bg-blue-50">TRX</Badge>
                        <span className="text-sm">ترون</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-green-600" dir="rtl">
                        {cryptoPrices?.prices?.TRX ? 
                          `${cryptoPrices.prices.TRX.toLocaleString('fa-IR')} ﷼` : 
                          '...'
                        }
                      </span>
                    </TableCell>
                    <TableCell className="text-center justify-center">
                      {editingWallet === 'tron' ? (
                        <Input
                          value={walletAddress}
                          onChange={(e) => setWalletAddress(e.target.value)}
                          className="font-mono text-sm"
                          dir="ltr"
                          placeholder="مثال: TLCuBEirVzB6V4menLZKw1jfBTFMZbuKq"
                        />
                      ) : walletData?.walletAddress ? (
                        <div className="font-mono text-sm" dir="ltr" title={walletData.walletAddress}>
                          {truncateAddress(walletData.walletAddress)}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">آدرس ثبت نشده</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center justify-center">
                      <div className="flex items-center justify-center gap-2">
                        {editingWallet === 'tron' ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                handleSaveWallet();
                                setEditingWallet(null);
                              }}
                              disabled={saveWalletMutation.isPending}
                            >
                              ذخیره
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setWalletAddress(walletData?.walletAddress || "");
                                setEditingWallet(null);
                              }}
                            >
                              لغو
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingWallet('tron')}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {walletData?.walletAddress && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(walletData.walletAddress)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            )}
                            <Switch
                              checked={activeWallets.includes('tron')}
                              onCheckedChange={() => handleToggleActive('tron')}
                              disabled={!walletData?.walletAddress}
                            />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2">
                        <img src="/images/usdt-logo.jpg" alt="USDT" className="w-6 h-6 rounded-full" />
                        <Badge variant="outline" className="bg-green-50">USDT</Badge>
                        <span className="text-sm">تتر (TRC20)</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-green-600" dir="rtl">
                        {cryptoPrices?.prices?.USDT ? 
                          `${cryptoPrices.prices.USDT.toLocaleString('fa-IR')} ﷼` : 
                          '...'
                        }
                      </span>
                    </TableCell>
                    <TableCell className="text-center justify-center">
                      {editingWallet === 'usdt' ? (
                        <Input
                          value={usdtWalletAddress}
                          onChange={(e) => setUsdtWalletAddress(e.target.value)}
                          className="font-mono text-sm"
                          dir="ltr"
                          placeholder="مثال: TLCuBEirVzB6V4menLZKw1jfBTFMZbuKq"
                        />
                      ) : walletData?.usdtWalletAddress ? (
                        <div className="font-mono text-sm" dir="ltr" title={walletData.usdtWalletAddress}>
                          {truncateAddress(walletData.usdtWalletAddress)}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">آدرس ثبت نشده</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center justify-center">
                      <div className="flex items-center justify-center gap-2">
                        {editingWallet === 'usdt' ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                handleSaveWallet();
                                setEditingWallet(null);
                              }}
                              disabled={saveWalletMutation.isPending}
                            >
                              ذخیره
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setUsdtWalletAddress(walletData?.usdtWalletAddress || "");
                                setEditingWallet(null);
                              }}
                            >
                              لغو
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingWallet('usdt')}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {walletData?.usdtWalletAddress && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(walletData.usdtWalletAddress)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            )}
                            <Switch
                              checked={activeWallets.includes('usdt')}
                              onCheckedChange={() => handleToggleActive('usdt')}
                              disabled={!walletData?.usdtWalletAddress}
                            />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2">
                        <img src="/images/xrp-logo.jpg" alt="XRP" className="w-6 h-6 rounded-full" />
                        <Badge variant="outline" className="bg-purple-50">XRP</Badge>
                        <span className="text-sm">ریپل</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-green-600" dir="rtl">
                        {cryptoPrices?.prices?.XRP ? 
                          `${cryptoPrices.prices.XRP.toLocaleString('fa-IR')} ﷼` : 
                          '...'
                        }
                      </span>
                    </TableCell>
                    <TableCell className="text-center justify-center">
                      {editingWallet === 'ripple' ? (
                        <Input
                          value={rippleWalletAddress}
                          onChange={(e) => setRippleWalletAddress(e.target.value)}
                          className="font-mono text-sm"
                          dir="ltr"
                          placeholder="مثال: rN7n7otQDd6FczFgLdlqtyMVrn3Q7YrfH"
                        />
                      ) : walletData?.rippleWalletAddress ? (
                        <div className="font-mono text-sm" dir="ltr" title={walletData.rippleWalletAddress}>
                          {truncateAddress(walletData.rippleWalletAddress)}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">آدرس ثبت نشده</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center justify-center">
                      <div className="flex items-center justify-center gap-2">
                        {editingWallet === 'ripple' ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                handleSaveWallet();
                                setEditingWallet(null);
                              }}
                              disabled={saveWalletMutation.isPending}
                            >
                              ذخیره
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRippleWalletAddress(walletData?.rippleWalletAddress || "");
                                setEditingWallet(null);
                              }}
                            >
                              لغو
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingWallet('ripple')}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {walletData?.rippleWalletAddress && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(walletData.rippleWalletAddress)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            )}
                            <Switch
                              checked={activeWallets.includes('ripple')}
                              onCheckedChange={() => handleToggleActive('ripple')}
                              disabled={!walletData?.rippleWalletAddress}
                            />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2">
                        <img src="/images/ada-logo.png" alt="ADA" className="w-6 h-6 rounded-full" />
                        <Badge variant="outline" className="bg-indigo-50">ADA</Badge>
                        <span className="text-sm">کاردانو</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-green-600" dir="rtl">
                        {cryptoPrices?.prices?.ADA ? 
                          `${cryptoPrices.prices.ADA.toLocaleString('fa-IR')} ﷼` : 
                          '...'
                        }
                      </span>
                    </TableCell>
                    <TableCell className="text-center justify-center">
                      {editingWallet === 'cardano' ? (
                        <Input
                          value={cardanoWalletAddress}
                          onChange={(e) => setCardanoWalletAddress(e.target.value)}
                          className="font-mono text-sm"
                          dir="ltr"
                          placeholder="مثال: addr1qxy..."
                        />
                      ) : walletData?.cardanoWalletAddress ? (
                        <div className="font-mono text-sm" dir="ltr" title={walletData.cardanoWalletAddress}>
                          {truncateAddress(walletData.cardanoWalletAddress)}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">آدرس ثبت نشده</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center justify-center">
                      <div className="flex items-center justify-center gap-2">
                        {editingWallet === 'cardano' ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                handleSaveWallet();
                                setEditingWallet(null);
                              }}
                              disabled={saveWalletMutation.isPending}
                            >
                              ذخیره
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCardanoWalletAddress(walletData?.cardanoWalletAddress || "");
                                setEditingWallet(null);
                              }}
                            >
                              لغو
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingWallet('cardano')}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {walletData?.cardanoWalletAddress && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(walletData.cardanoWalletAddress)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            )}
                            <Switch
                              checked={activeWallets.includes('cardano')}
                              onCheckedChange={() => handleToggleActive('cardano')}
                              disabled={!walletData?.cardanoWalletAddress}
                            />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            {cryptoPrices?.lastUpdate && (
              <div className="mt-4 text-left">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  آخرین بروزرسانی: {new Date(cryptoPrices.lastUpdate).toLocaleString('fa-IR')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs 
          defaultValue={
            walletData?.walletAddress ? "tron" : 
            walletData?.usdtWalletAddress ? "usdt" : 
            walletData?.rippleWalletAddress ? "ripple" : 
            "cardano"
          } 
          className="w-full"
        >
          <TabsList className={`grid w-full ${
            [walletData?.walletAddress, walletData?.usdtWalletAddress, walletData?.rippleWalletAddress, walletData?.cardanoWalletAddress].filter(Boolean).length === 4 ? 'grid-cols-4' :
            [walletData?.walletAddress, walletData?.usdtWalletAddress, walletData?.rippleWalletAddress, walletData?.cardanoWalletAddress].filter(Boolean).length === 3 ? 'grid-cols-3' :
            [walletData?.walletAddress, walletData?.usdtWalletAddress, walletData?.rippleWalletAddress, walletData?.cardanoWalletAddress].filter(Boolean).length === 2 ? 'grid-cols-2' :
            'grid-cols-1'
          }`}>
            {walletData?.walletAddress && (
              <TabsTrigger value="tron">
                ترون (TRX)
              </TabsTrigger>
            )}
            {walletData?.usdtWalletAddress && (
              <TabsTrigger value="usdt">
                تتر (USDT)
              </TabsTrigger>
            )}
            {walletData?.rippleWalletAddress && (
              <TabsTrigger value="ripple">
                ریپل (XRP)
              </TabsTrigger>
            )}
            {walletData?.cardanoWalletAddress && (
              <TabsTrigger value="cardano">
                کاردانو (ADA)
              </TabsTrigger>
            )}
          </TabsList>

          {walletData?.walletAddress && (
            <TabsContent value="tron" className="mt-6">
              <TransactionTable
                transactions={tronData?.transactions || []}
                isLoading={tronLoading}
                error={tronError}
                currencySymbol="TRX"
                amountKey="amountTRX"
                centerAlign={true}
                page={tronPage}
                onPageChange={setTronPage}
                showTomanAmount={true}
                tomanPrice={cryptoPrices?.prices?.TRX || 0}
                tomanFirst={true}
                showTomanCurrencySymbol={false}
                hideBorder={true}
              />
            </TabsContent>
          )}

          {walletData?.usdtWalletAddress && (
            <TabsContent value="usdt" className="mt-6">
              <TransactionTable
                transactions={usdtData?.transactions || []}
                isLoading={usdtLoading}
                error={usdtError}
                currencySymbol="USDT"
                amountKey="tokenSymbol"
                centerAlign={true}
                page={usdtPage}
                onPageChange={setUsdtPage}
                showTomanAmount={true}
                tomanPrice={cryptoPrices?.prices?.USDT || 0}
                tomanFirst={true}
                showTomanCurrencySymbol={false}
                hideBorder={true}
              />
            </TabsContent>
          )}

          {walletData?.rippleWalletAddress && (
            <TabsContent value="ripple" className="mt-6">
              <div className="space-y-4">
                <TransactionTable
                  transactions={rippleData?.transactions || []}
                  isLoading={rippleLoading}
                  error={rippleError}
                  currencySymbol="XRP"
                  amountKey="amountXRP"
                  centerAlign={true}
                  page={1}
                  onPageChange={() => {}}
                  hidePagination={true}
                  showTomanAmount={true}
                  tomanPrice={cryptoPrices?.prices?.XRP || 0}
                  tomanFirst={true}
                  showTomanCurrencySymbol={false}
                  hideBorder={true}
                />
                {rippleData?.transactions && rippleData.transactions.length > 0 && (
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setRippleMarker(undefined)}
                      disabled={!rippleMarker || rippleLoading}
                    >
                      صفحه اول
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setRippleMarker(rippleData.marker)}
                      disabled={!rippleData.marker || rippleLoading}
                    >
                      صفحه بعد
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          {walletData?.cardanoWalletAddress && (
            <TabsContent value="cardano" className="mt-6">
              <TransactionTable
                transactions={cardanoData?.transactions || []}
                isLoading={cardanoLoading}
                error={cardanoError}
                currencySymbol="ADA"
                amountKey="amountADA"
                showPriceColumns={false}
                centerAlign={true}
                page={cardanoPage}
                onPageChange={setCardanoPage}
                showTomanAmount={true}
                tomanPrice={cryptoPrices?.prices?.ADA || 0}
                tomanFirst={true}
                showTomanCurrencySymbol={false}
                hideBorder={true}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
