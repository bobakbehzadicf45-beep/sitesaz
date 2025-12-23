import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { initializeLiaraAI, isAIActive, generateResponse as generateAIResponse } from "@/lib/liara-ai";
import { useRoute } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Store, 
  ShoppingBag, 
  ShoppingCart,
  Home,
  Send, 
  Sparkles, 
  User, 
  Package,
  ArrowRight,
  Loader2,
  AlertCircle,
  Plus,
  Smartphone,
  Trash2,
  CreditCard,
  UserPlus,
  Eye,
  EyeOff,
  MapPin,
  Truck,
  Bitcoin,
  CheckCircle,
  X,
  Paperclip,
  Image as ImageIcon
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23f3f4f6' width='200' height='200'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='14' text-anchor='middle' x='100' y='100'%3E%D8%AA%D8%B5%D9%88%DB%8C%D8%B1 %D9%85%D8%AD%D8%B5%D9%88%D9%84%3C/text%3E%3C/svg%3E";

interface VitrinInfo {
  id: string;
  username: string;
  storeName: string;
  storeDescription: string;
  storeLogo: string | null;
  firstName: string;
  lastName: string;
  bankCardNumber: string | null;
  bankCardHolderName: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  priceBeforeDiscount: string;
  priceAfterDiscount: string | null;
  quantity: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface CartItem {
  productId: string;
  name: string;
  image: string | null;
  priceAfterDiscount: string;
  priceBeforeDiscount: string;
  quantity: number;
}

interface Address {
  id: string;
  title: string;
  fullAddress: string;
  postalCode?: string;
  isDefault: boolean;
}

interface ShippingSettings {
  postPishtazEnabled: boolean;
  postNormalEnabled: boolean;
  piykEnabled: boolean;
  freeShippingEnabled: boolean;
  freeShippingMinAmount?: string;
}

interface CheckoutOrder {
  items: CartItem[];
  totalAmount: number;
  address?: Address;
  shippingMethod?: string;
}

interface CompletedOrder {
  id: string;
  items: CartItem[];
  totalAmount: number;
  shippingMethod: string;
  createdAt: Date;
}

function formatPrice(price: string | number): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return numPrice.toLocaleString('fa-IR');
}

function VitrinChatMessage({ role, content, isTyping, isFirst }: { role: "user" | "assistant"; content: string; isTyping?: boolean; isFirst?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn("flex gap-4 p-6 w-full max-w-4xl mx-auto rounded-2xl transition-colors dark:bg-secondary/10 bg-[#8888f74d] flex-row-reverse pt-[10px] pb-[10px]", isFirst ? "mt-[100px] mb-[20px]" : "mt-[120px] mb-[120px]")}
    >
      <div className="shrink-0 mt-1">
        <Avatar className={cn(
          "w-10 h-10 border border-border/50 shadow-sm",
          role === "assistant" ? "bg-primary/10" : "bg-muted"
        )}>
          {role === "assistant" ? (
            <div className="w-full h-full flex items-center justify-center text-[#6c5ce0]">
              <Sparkles className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <User className="w-5 h-5" />
            </div>
          )}
        </Avatar>
      </div>
      <div className="flex-1 space-y-2 text-right">
        <div className="flex items-center justify-end">
          <span className="font-bold text-[#040f87cc] text-[12px]">
            {role === "assistant" ? "هوش مصنوعی" : "شما"}
          </span>
        </div>
        
        <div className="text-foreground/90 whitespace-pre-wrap text-[12px]">
          {isTyping ? (
            <span className="flex gap-1 items-center h-6">
              <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"></span>
            </span>
          ) : (
            content
          )}
        </div>
      </div>
    </motion.div>
  );
}

function VitrinChatInput({ onSend, onFileSelect, isLoading, isUploading }: { 
  onSend: (message: string) => void; 
  onFileSelect?: (file: File) => void;
  isLoading: boolean;
  isUploading?: boolean;
}) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  return (
    <div className="w-full max-w-4xl mx-auto relative">
      <div className={cn(
        "relative flex items-end gap-2 p-3 rounded-3xl border transition-all duration-300",
        "bg-background/60 backdrop-blur-xl shadow-2xl",
        "border-primary/20 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10"
      )}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        
        <div className="pb-2 pl-2">
          <Button
            type="button"
            onClick={handleFileClick}
            disabled={isLoading || isUploading}
            size="icon"
            variant="ghost"
            className={cn(
              "h-10 w-10 rounded-full transition-all duration-300",
              "hover:bg-primary/10 text-muted-foreground hover:text-primary",
              (isLoading || isUploading) && "opacity-50 cursor-not-allowed"
            )}
            title="ارسال تصویر رسید"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </Button>
        </div>

        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="پیامی بنویسید..."
          className="min-h-[60px] max-h-[200px] w-full resize-none border-0 bg-transparent py-4 px-2 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 text-base"
          rows={1}
        />

        <div className="pb-2 pr-2">
          <Button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim()}
            size="icon"
            className={cn(
              "h-10 w-10 rounded-full transition-all duration-300",
              "bg-primary text-primary-foreground shadow-lg hover:shadow-primary/25 hover:scale-105",
              (isLoading || !input.trim()) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Send className="w-5 h-5 ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface VitrinBottomNavProps {
  onShowcase?: () => void;
  onCart?: () => void;
  onProfile?: () => void;
  activeTab?: string;
  storeLogo?: string | null;
  storeName?: string;
  cartCount?: number;
}

function VitrinBottomNav({ onShowcase, onCart, onProfile, activeTab, storeLogo, storeName, cartCount = 0 }: VitrinBottomNavProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 h-20 border-b border-border/40 bg-white backdrop-blur-xl flex items-center justify-between px-6 z-20">
      <button
        onClick={onCart}
        className={cn(
          "flex flex-col items-center gap-1 transition-colors relative",
          activeTab === "cart" 
            ? "text-blue-600" 
            : "text-muted-foreground hover:text-primary"
        )}
      >
        <div className="relative">
          <ShoppingCart className="w-6 h-6" />
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </div>
        <span className={cn("font-normal text-[15px]", activeTab === "cart" ? "text-blue-600" : "text-[#000000]")}>سبد خرید</span>
      </button>
      
      <button
        onClick={onProfile}
        className={cn(
          "rounded-full h-24 w-24 overflow-hidden border-4 border-white hover:border-white/90",
          "transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-primary/20",
          "absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
      >
        <Avatar className="h-full w-full border-0">
          {storeLogo ? (
            <AvatarImage src={storeLogo} alt={storeName || "فروشگاه"} />
          ) : null}
          <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
            {storeName?.charAt(0) || "F"}
          </AvatarFallback>
        </Avatar>
      </button>
      
      <button
        onClick={onShowcase}
        className={cn(
          "flex flex-col items-center gap-1 transition-colors",
          activeTab === "showcase" 
            ? "text-blue-600" 
            : "text-muted-foreground hover:text-primary"
        )}
      >
        <Home className="w-6 h-6" />
        <span className={cn("text-[15px] font-normal", activeTab === "showcase" ? "text-blue-600" : "text-[#000000]")}>ویترین</span>
      </button>
    </nav>
  );
}

export default function VitrinPage() {
  const [, params] = useRoute("/vitrin/:username");
  const username = params?.username;
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "سلام! من دستیار هوشمند این فروشگاه هستم. چطور می‌توانم امروز به شما کمک کنم؟",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined' && username) {
      const saved = localStorage.getItem(`vitrin_cart_${username}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [registrationPhone, setRegistrationPhone] = useState("");
  const [registrationPassword, setRegistrationPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVitrinAuthenticated, setIsVitrinAuthenticated] = useState(() => {
    if (typeof window !== 'undefined' && username) {
      return localStorage.getItem(`vitrin_auth_${username}`) === 'true';
    }
    return false;
  });
  const [currentUser, setCurrentUser] = useState<{ firstName: string; lastName: string } | null>(null);
  
  const [checkoutOrder, setCheckoutOrder] = useState<CheckoutOrder | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressFormData, setAddressFormData] = useState({ title: "", fullAddress: "", postalCode: "" });
  const [addressLoading, setAddressLoading] = useState(false);
  const [showShippingSelector, setShowShippingSelector] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<string>("");
  const [sellerShippingSettings, setSellerShippingSettings] = useState<ShippingSettings | null>(null);
  const [orderCreating, setOrderCreating] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [sellerCardInfo, setSellerCardInfo] = useState<{ cardNumber: string; holderName: string | null } | null>(null);
  const [showSellerCard, setShowSellerCard] = useState(false);
  const [completedOrders, setCompletedOrders] = useState<CompletedOrder[]>(() => {
    if (typeof window !== 'undefined' && username) {
      const saved = localStorage.getItem(`vitrin_completed_orders_${username}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!username || !vitrinInfo) return;
    
    setIsUploading(true);
    
    setMessages(prev => [...prev, {
      role: "user",
      content: `📎 در حال ارسال تصویر رسید...`
    }]);

    try {
      const formData = new FormData();
      formData.append('receipt', file);
      
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/vitrin/${username}/upload-receipt`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        setMessages(prev => {
          const filtered = prev.filter(m => m.content !== `📎 در حال ارسال تصویر رسید...`);
          return [...filtered, {
            role: "user",
            content: `📎 تصویر رسید ارسال شد`
          }, {
            role: "assistant",
            content: result.message || "تصویر رسید دریافت شد. اطلاعات پرداخت استخراج و به فروشنده ارسال خواهد شد."
          }];
        });
      } else {
        setMessages(prev => {
          const filtered = prev.filter(m => m.content !== `📎 در حال ارسال تصویر رسید...`);
          return [...filtered, {
            role: "assistant",
            content: result.message || "خطا در پردازش تصویر رسید. لطفاً دوباره تلاش کنید."
          }];
        });
      }
    } catch (error) {
      console.error("Error uploading receipt:", error);
      setMessages(prev => {
        const filtered = prev.filter(m => m.content !== `📎 در حال ارسال تصویر رسید...`);
        return [...filtered, {
          role: "assistant",
          content: "خطا در ارسال تصویر. لطفاً دوباره تلاش کنید."
        }];
      });
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (username) {
      const saved = localStorage.getItem(`vitrin_cart_${username}`);
      if (saved) {
        setCartItems(JSON.parse(saved));
      }
    }
  }, [username]);

  useEffect(() => {
    if (username && cartItems.length >= 0) {
      localStorage.setItem(`vitrin_cart_${username}`, JSON.stringify(cartItems));
    }
  }, [cartItems, username]);

  useEffect(() => {
    if (username && completedOrders.length >= 0) {
      localStorage.setItem(`vitrin_completed_orders_${username}`, JSON.stringify(completedOrders));
    }
  }, [completedOrders, username]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsAuthenticated(false);
        setCurrentUser(null);
        return;
      }
      
      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(true);
          setCurrentUser({ firstName: data.user.firstName, lastName: data.user.lastName });
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } catch (error) {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    };
    
    checkAuth();
  }, []);

  // وقتی شماره کارت فروشنده درخواست میشود، مستقیماً پیام رو نشون بده
  useEffect(() => {
    if (sellerCardInfo && !showSellerCard) {
      const formattedCardNumber = sellerCardInfo.cardNumber.replace(/(\d{4})(?=\d)/g, '$1-');
      const cardMessage = sellerCardInfo.holderName 
        ? `💳 شماره کارت فروشنده:\n\n${formattedCardNumber}\n\n👤 به نام: ${sellerCardInfo.holderName}`
        : `💳 شماره کارت فروشنده:\n\n${formattedCardNumber}`;
      setMessages(prev => [...prev, {
        role: "assistant",
        content: cardMessage
      }]);
      setShowSellerCard(true);
    }
  }, [sellerCardInfo, showSellerCard]);

  const handleRegister = async () => {
    if (!registrationPhone.trim() || !registrationPassword.trim()) {
      setRegistrationError("لطفاً شماره تلفن و رمز عبور را وارد کنید");
      return;
    }
    
    if (registrationPassword.length < 6) {
      setRegistrationError("رمز عبور باید حداقل ۶ کاراکتر باشد");
      return;
    }
    
    setRegistrationLoading(true);
    setRegistrationError("");
    
    try {
      const response = await fetch(`/api/vitrin/${username}/quick-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: registrationPhone,
          password: registrationPassword,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "خطا در ثبت‌نام");
      }
      
      localStorage.setItem("token", data.token);
      localStorage.setItem(`vitrin_auth_${username}`, 'true');
      setIsAuthenticated(true);
      setIsVitrinAuthenticated(true);
      setCurrentUser({ firstName: data.user.firstName, lastName: data.user.lastName });
      setShowRegistrationForm(false);
      setRegistrationPhone("");
      setRegistrationPassword("");
      
      sendInvoiceMessage();
    } catch (error: any) {
      setRegistrationError(error.message || "خطا در ثبت‌نام");
    } finally {
      setRegistrationLoading(false);
    }
  };

  const isMessageSimilar = (msg1: string, msg2: string): boolean => {
    if (!msg1 || !msg2) return false;
    const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    const n1 = normalize(msg1);
    const n2 = normalize(msg2);
    if (n1 === n2) return true;
    if (n1.length === 0 || n2.length === 0) return false;
    const longer = n1.length > n2.length ? n1 : n2;
    const shorter = n1.length > n2.length ? n2 : n1;
    const similarity = longer.includes(shorter) || shorter.includes(longer.substring(0, Math.min(100, longer.length)));
    return similarity;
  };

  const generateInvoiceMessage = () => {
    if (!vitrinInfo) return "";
    
    let invoice = `📋 فاکتور خرید از ${vitrinInfo.storeName}\n`;
    invoice += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    cartItems.forEach((item, index) => {
      invoice += `${index + 1}. ${item.name}\n`;
      invoice += `   تعداد: ${item.quantity} عدد\n`;
      invoice += `   قیمت واحد: ${formatPrice(item.priceAfterDiscount)} تومان\n`;
      invoice += `   جمع: ${formatPrice(parseFloat(item.priceAfterDiscount) * item.quantity)} تومان\n\n`;
    });
    
    invoice += `━━━━━━━━━━━━━━━━━━━━\n`;
    invoice += `💰 جمع کل: ${formatPrice(cartTotal)} تومان\n\n`;
    
    invoice += `✅ برای تکمیل خرید، لطفاً با فروشنده تماس بگیرید.`;
    
    return invoice;
  };

  const sendInvoiceMessage = () => {
    const invoiceContent = generateInvoiceMessage();
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && isMessageSimilar(lastMessage.content, invoiceContent)) {
      return;
    }
    const invoiceMsg: Message = { role: "assistant", content: invoiceContent };
    setMessages((prev) => [...prev, invoiceMsg]);
  };

  const fetchShippingSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/shipping-settings/${vitrinInfo?.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setSellerShippingSettings(data);
      }
    } catch (error) {
      console.error("Error fetching shipping settings:", error);
    }
  };

  const fetchUserAddress = async (): Promise<Address | null> => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;
      const res = await fetch("/api/addresses", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const addresses: Address[] = await res.json();
        return addresses.find(a => a.isDefault) || addresses[0] || null;
      }
    } catch (error) {
      console.error("Error fetching address:", error);
    }
    return null;
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0 || !vitrinInfo) return;
    
    if (!isVitrinAuthenticated) {
      setActiveTab("chat");
      setShowRegistrationForm(true);
      return;
    }

    const orderData: CheckoutOrder = {
      items: [...cartItems],
      totalAmount: cartTotal,
    };

    const address = await fetchUserAddress();
    await fetchShippingSettings();

    if (address) {
      orderData.address = address;
    }

    setCheckoutOrder(orderData);
    setCartItems([]);
    setActiveTab("chat");

    if (!address) {
      setShowAddressForm(true);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "لطفاً آدرس تحویل سفارش را وارد کنید:"
      }]);
    } else {
      setShowShippingSelector(true);
    }
  };

  const handleAddressSubmit = async () => {
    if (!addressFormData.title || !addressFormData.fullAddress) {
      return;
    }
    
    setAddressLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: addressFormData.title,
          fullAddress: addressFormData.fullAddress,
          postalCode: addressFormData.postalCode || null,
          isDefault: true
        })
      });

      if (res.ok) {
        const newAddress = await res.json();
        setCheckoutOrder(prev => prev ? { ...prev, address: newAddress } : null);
        setShowAddressForm(false);
        setAddressFormData({ title: "", fullAddress: "", postalCode: "" });
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `آدرس شما ثبت شد:\n📍 ${newAddress.title}: ${newAddress.fullAddress}`
        }]);
        setShowShippingSelector(true);
      }
    } catch (error) {
      console.error("Error creating address:", error);
    } finally {
      setAddressLoading(false);
    }
  };

  const handleShippingSelect = (method: string) => {
    setSelectedShipping(method);
    setCheckoutOrder(prev => prev ? { ...prev, shippingMethod: method } : null);
  };

  const getShippingMethodLabel = (method: string) => {
    switch (method) {
      case "post_pishtaz": return "پست پیشتاز";
      case "post_normal": return "پست عادی";
      case "piyk": return "پیک";
      case "free": return "ارسال رایگان";
      default: return method;
    }
  };

  const handlePayment = async (paymentType: "card" | "crypto") => {
    if (!checkoutOrder || !selectedShipping) return;

    setOrderCreating(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/orders/vitrin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          sellerId: vitrinInfo?.id,
          addressId: checkoutOrder.address?.id,
          shippingMethod: selectedShipping,
          items: checkoutOrder.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.priceAfterDiscount,
            totalPrice: String(parseFloat(item.priceAfterDiscount) * item.quantity)
          })),
          totalAmount: checkoutOrder.totalAmount,
          notes: ""
        })
      });

      if (res.ok) {
        const data = await res.json();
        const orderId = data.orders?.[0]?.id || data.id;
        setCreatedOrderId(orderId);
        setShowShippingSelector(false);
        
        // اضافه کردن سفارش به لیست سفارشات ثبت شده
        const newCompletedOrder: CompletedOrder = {
          id: orderId,
          items: [...checkoutOrder.items],
          totalAmount: checkoutOrder.totalAmount,
          shippingMethod: selectedShipping,
          createdAt: new Date()
        };
        setCompletedOrders(prev => [newCompletedOrder, ...prev]);
        
        if (paymentType === "card") {
          // Fetch seller info to get the latest bank card details
          try {
            const sellerResponse = await fetch(`/api/vitrin/${vitrinInfo?.username}`);
            if (sellerResponse.ok) {
              const sellerData = await sellerResponse.json();
              if (sellerData?.bankCardNumber) {
                setSellerCardInfo({
                  cardNumber: sellerData.bankCardNumber,
                  holderName: sellerData.bankCardHolderName || null
                });
              }
              
              setMessages(prev => [...prev, {
                role: "assistant",
                content: `✅ سفارش شما با موفقیت ثبت شد!\n\n📋 جزئیات سفارش:\n${checkoutOrder.items.map(item => `• ${item.name} (${item.quantity} عدد)`).join('\n')}\n\n💰 مبلغ قابل پرداخت: ${formatPrice(checkoutOrder.totalAmount)} تومان\n\n🚚 نحوه ارسال: ${getShippingMethodLabel(selectedShipping)}`
              }]);
            }
          } catch (error) {
            console.error("Error fetching seller data:", error);
            setMessages(prev => [...prev, {
              role: "assistant",
              content: `✅ سفارش شما با موفقیت ثبت شد!\n\n📋 جزئیات سفارش:\n${checkoutOrder.items.map(item => `• ${item.name} (${item.quantity} عدد)`).join('\n')}\n\n💰 مبلغ قابل پرداخت: ${formatPrice(checkoutOrder.totalAmount)} تومان\n\n🚚 نحوه ارسال: ${getShippingMethodLabel(selectedShipping)}`
            }]);
          }
        } else {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `✅ سفارش شما با موفقیت ثبت شد!\n\n📋 جزئیات سفارش:\n${checkoutOrder.items.map(item => `• ${item.name} (${item.quantity} عدد)`).join('\n')}\n\n💰 مبلغ قابل پرداخت: ${formatPrice(checkoutOrder.totalAmount)} تومان\n\n🚚 نحوه ارسال: ${getShippingMethodLabel(selectedShipping)} →\n\n₿ برای پرداخت با ارز دیجیتال، لطفاً از پنل کاربری خود اقدام کنید.`
          }]);
        }
        setCheckoutOrder(null);
      }
    } catch (error) {
      console.error("Error creating order:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "متأسفانه در ثبت سفارش مشکلی پیش آمد. لطفاً دوباره تلاش کنید."
      }]);
    } finally {
      setOrderCreating(false);
    }
  };

  const addToCart = (product: Product) => {
    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.productId === product.id);
      if (existingItem) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          image: product.image,
          priceAfterDiscount: product.priceAfterDiscount || product.priceBeforeDiscount,
          priceBeforeDiscount: product.priceBeforeDiscount,
          quantity: 1,
        },
      ];
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCartItems((prev) =>
        prev.map((item) =>
          item.productId === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const cartTotal = cartItems.reduce(
    (total, item) => total + parseFloat(item.priceAfterDiscount) * item.quantity,
    0
  );

  const { data: vitrinInfo, isLoading: isLoadingVitrin, error: vitrinError } = useQuery<VitrinInfo>({
    queryKey: ["/api/vitrin", username],
    queryFn: async () => {
      const res = await fetch(`/api/vitrin/${username}`);
      if (!res.ok) {
        throw new Error("فروشگاه یافت نشد");
      }
      return res.json();
    },
    enabled: !!username,
  });

  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/vitrin", username, "products"],
    queryFn: async () => {
      const res = await fetch(`/api/vitrin/${username}/products`);
      if (!res.ok) throw new Error("خطا در دریافت محصولات");
      return res.json();
    },
    enabled: !!username,
  });

  const [aiInitialized, setAiInitialized] = useState(false);

  useEffect(() => {
    const initAI = async () => {
      const success = await initializeLiaraAI();
      setAiInitialized(success);
    };
    initAI();
  }, []);

  const handleSend = async (content: string) => {
    const userMsg: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const aiContent = await generateAIResponse(
        content, 
        vitrinInfo?.storeName,
        products || []
      );
      
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === "assistant" && isMessageSimilar(lastMessage.content, aiContent)) {
          return prev;
        }
        return [...prev, { role: "assistant", content: aiContent }];
      });
    } catch (error) {
      const errorContent = "متأسفانه در پردازش پیام شما مشکلی پیش آمد. لطفاً دوباره تلاش کنید.";
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === "assistant" && isMessageSimilar(lastMessage.content, errorContent)) {
          return prev;
        }
        return [...prev, { role: "assistant", content: errorContent }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoadingVitrin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (vitrinError || !vitrinInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20" dir="rtl">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold mb-2">فروشگاه یافت نشد</h1>
            <p className="text-muted-foreground mb-4">
              متأسفانه فروشگاهی با این آدرس یافت نشد.
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowRight className="w-4 h-4 ml-2" />
              بازگشت
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isMobile) {
    return (
      <div className="flex h-screen w-full bg-background items-center justify-center" dir="rtl">
        <div className="text-center p-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <Smartphone className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-3">
            لطفا فقط در حالت موبایل وارد صفحه شوید
          </h1>
          <p className="text-muted-foreground text-sm">
            این برنامه برای استفاده در گوشی موبایل طراحی شده است
          </p>
        </div>
      </div>
    );
  }

  const fallbackProducts = [
    { id: "1", name: "محصول 1", priceBeforeDiscount: "250000", priceAfterDiscount: "180000", description: "این محصول با کیفیت عالی و قیمت مناسب برای شما فراهم شده است.", image: placeholderImage, quantity: 10 },
    { id: "2", name: "محصول 2", priceBeforeDiscount: "320000", priceAfterDiscount: "220000", description: "یکی از بهترین انتخاب ها در این دسته بندی است.", image: placeholderImage, quantity: 5 },
    { id: "3", name: "محصول 3", priceBeforeDiscount: "180000", priceAfterDiscount: "135000", description: "محصول اقتصادی و با کارایی بالا برای افراد کم بودجه.", image: placeholderImage, quantity: 15 },
    { id: "4", name: "محصول 4", priceBeforeDiscount: "420000", priceAfterDiscount: "280000", description: "محصول پریمیوم با تکنولوژی روز دنیا و طراحی شیک.", image: placeholderImage, quantity: 8 },
    { id: "5", name: "محصول 5", priceBeforeDiscount: "150000", priceAfterDiscount: "99000", description: "گزینه برتر برای خریداران اقتصادی.", image: placeholderImage, quantity: 20 },
    { id: "6", name: "محصول 6", priceBeforeDiscount: "380000", priceAfterDiscount: "250000", description: "محصول جدید با ویژگی های بهبود یافته.", image: placeholderImage, quantity: 3 },
  ];

  const displayProducts = products && products.length > 0 ? products : fallbackProducts;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans" dir="rtl">
      <div className="flex-1 flex flex-col h-full relative">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
          <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden mt-0 data-[state=inactive]:hidden h-full">
            <div className="flex-1 overflow-y-auto scroll-smooth pt-30 bg-[#fafafa]">
              <div className="max-w-4xl mx-auto p-4 space-y-6 min-h-full pb-32">
                {messages.map((msg, i) => (
                  <VitrinChatMessage key={i} role={msg.role} content={msg.content} isFirst={i === 0} />
                ))}
                {isLoading && (
                  <VitrinChatMessage role="assistant" content="" isTyping={true} />
                )}
                
                {showRegistrationForm && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-xl shadow-md border border-primary/20 p-4 max-w-sm mx-auto mt-4"
                  >
                    <h3 className="text-sm font-bold text-foreground text-center mb-3">ثبت‌نام سریع</h3>
                    
                    <div className="space-y-3">
                      <Input
                        type="tel"
                        placeholder="شماره تلفن"
                        value={registrationPhone}
                        onChange={(e) => setRegistrationPhone(e.target.value)}
                        className="text-left h-9 text-sm"
                        dir="ltr"
                      />
                      
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="رمز عبور (حداقل ۶ کاراکتر)"
                          value={registrationPassword}
                          onChange={(e) => setRegistrationPassword(e.target.value)}
                          className="text-left pl-9 h-9 text-sm"
                          dir="ltr"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      
                      {registrationError && (
                        <p className="text-xs text-destructive text-right">{registrationError}</p>
                      )}
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleRegister} 
                          disabled={registrationLoading}
                          className="flex-1 h-9 text-sm bg-primary text-primary-foreground"
                        >
                          {registrationLoading ? (
                            <>
                              <Loader2 className="w-3 h-3 ml-1 animate-spin" />
                              صبر کنید...
                            </>
                          ) : (
                            "ثبت‌نام"
                          )}
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          onClick={() => setShowRegistrationForm(false)}
                          className="flex-1 h-9 text-sm"
                        >
                          انصراف
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {showAddressForm && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-xl shadow-md border border-primary/20 p-4 max-w-sm mx-auto mt-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-5 h-5 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">آدرس تحویل</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <Input
                        placeholder="عنوان آدرس (مثلا: منزل)"
                        value={addressFormData.title}
                        onChange={(e) => setAddressFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="h-9 text-sm"
                      />
                      <Textarea
                        placeholder="آدرس کامل"
                        value={addressFormData.fullAddress}
                        onChange={(e) => setAddressFormData(prev => ({ ...prev, fullAddress: e.target.value }))}
                        className="text-sm min-h-[80px]"
                      />
                      <Input
                        placeholder="کد پستی (اختیاری)"
                        value={addressFormData.postalCode}
                        onChange={(e) => setAddressFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                        className="h-9 text-sm"
                        dir="ltr"
                      />
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleAddressSubmit} 
                          disabled={addressLoading || !addressFormData.title || !addressFormData.fullAddress}
                          className="flex-1 h-9 text-sm bg-primary text-primary-foreground"
                        >
                          {addressLoading ? (
                            <>
                              <Loader2 className="w-3 h-3 ml-1 animate-spin" />
                              صبر کنید...
                            </>
                          ) : (
                            "ثبت آدرس"
                          )}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowAddressForm(false);
                            setCheckoutOrder(null);
                          }}
                          className="flex-1 h-9 text-sm"
                        >
                          انصراف
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {showShippingSelector && checkoutOrder && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-xl shadow-md border border-primary/20 p-4 max-w-md mx-auto mt-4 text-right"
                  >
                    <div className="mb-4">
                      <div className="flex flex-row-reverse items-center gap-2 mb-3">
                        <Package className="w-5 h-5 text-primary" />
                        <h3 className="text-sm font-bold text-foreground">جزئیات سفارش</h3>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                        {checkoutOrder.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-gray-600">{item.name} × {item.quantity}</span>
                            <span className="font-medium">{formatPrice(parseFloat(item.priceAfterDiscount) * item.quantity)} تومان</span>
                          </div>
                        ))}
                        <div className="border-t pt-2 mt-2 flex justify-between items-center font-bold">
                          <span>جمع کل:</span>
                          <span className="text-primary">{formatPrice(checkoutOrder.totalAmount)} تومان</span>
                        </div>
                      </div>

                      {checkoutOrder.address && (
                        <div className="mt-3 bg-blue-50 rounded-lg p-3 text-sm">
                          <div className="flex items-center gap-1 text-blue-700 font-medium mb-1">
                            <MapPin className="w-4 h-4" />
                            <span>{checkoutOrder.address.title}</span>
                          </div>
                          <p className="text-blue-600 text-xs">{checkoutOrder.address.fullAddress}</p>
                        </div>
                      )}
                    </div>

                    <div className="mb-4">
                      <div className="flex flex-row-reverse items-center gap-2 mb-3">
                        <Truck className="w-5 h-5 text-primary" />
                        <h3 className="text-sm font-bold text-foreground">نحوه ارسال</h3>
                      </div>
                      
                      <RadioGroup value={selectedShipping} onValueChange={handleShippingSelect} className="grid grid-cols-2 gap-3">
                        {sellerShippingSettings?.postPishtazEnabled && (
                          <div className="flex items-center space-x-2 space-x-reverse bg-gray-50 p-3 rounded-lg">
                            <RadioGroupItem value="post_pishtaz" id="post_pishtaz" />
                            <Label htmlFor="post_pishtaz" className="flex-1 cursor-pointer text-sm">پست پیشتاز</Label>
                          </div>
                        )}
                        {sellerShippingSettings?.postNormalEnabled && (
                          <div className="flex items-center space-x-2 space-x-reverse bg-gray-50 p-3 rounded-lg">
                            <RadioGroupItem value="post_normal" id="post_normal" />
                            <Label htmlFor="post_normal" className="flex-1 cursor-pointer text-sm">پست عادی</Label>
                          </div>
                        )}
                        {sellerShippingSettings?.piykEnabled && (
                          <div className="flex items-center space-x-2 space-x-reverse bg-gray-50 p-3 rounded-lg">
                            <RadioGroupItem value="piyk" id="piyk" />
                            <Label htmlFor="piyk" className="flex-1 cursor-pointer text-sm">پیک</Label>
                          </div>
                        )}
                        {sellerShippingSettings?.freeShippingEnabled && (
                          <div className="flex items-center space-x-2 space-x-reverse bg-gray-50 p-3 rounded-lg">
                            <RadioGroupItem value="free" id="free" />
                            <Label htmlFor="free" className="flex-1 cursor-pointer text-sm">ارسال رایگان</Label>
                          </div>
                        )}
                        {!sellerShippingSettings && (
                          <>
                            <div className="flex items-center space-x-2 space-x-reverse bg-gray-50 p-3 rounded-lg">
                              <RadioGroupItem value="post_normal" id="post_normal" />
                              <Label htmlFor="post_normal" className="flex-1 cursor-pointer text-sm">پست عادی</Label>
                            </div>
                            <div className="flex items-center space-x-2 space-x-reverse bg-gray-50 p-3 rounded-lg">
                              <RadioGroupItem value="piyk" id="piyk" />
                              <Label htmlFor="piyk" className="flex-1 cursor-pointer text-sm">پیک</Label>
                            </div>
                          </>
                        )}
                      </RadioGroup>
                    </div>


                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handlePayment("card")} 
                        disabled={!selectedShipping || orderCreating}
                        className="flex-1 h-10 text-sm bg-green-600 hover:bg-green-700 text-white"
                      >
                        {orderCreating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 ml-1" />
                            کارت به کارت
                          </>
                        )}
                      </Button>
                      <Button 
                        onClick={() => handlePayment("crypto")} 
                        disabled={!selectedShipping || orderCreating}
                        className="flex-1 h-10 text-sm bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        {orderCreating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Bitcoin className="w-4 h-4 ml-1" />
                            ارز دیجیتال
                          </>
                        )}
                      </Button>
                    </div>

                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setShowShippingSelector(false);
                        setCheckoutOrder(null);
                        setSelectedShipping("");
                      }}
                      className="w-full mt-2 h-8 text-[16px] font-bold text-gray-500"
                    >
                      انصراف
                    </Button>
                  </motion.div>
                )}

                
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/90 to-transparent pt-10 z-10">
              <VitrinChatInput onSend={handleSend} onFileSelect={handleFileUpload} isLoading={isLoading} isUploading={isUploading} />
            </div>
          </TabsContent>

          <TabsContent value="showcase" className="flex-1 overflow-y-auto scroll-smooth px-6 pb-6 pt-24 mt-0 data-[state=inactive]:hidden h-full">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-2 gap-6 pb-20">
                {displayProducts.map((product) => (
                  <div key={product.id} className="bg-white rounded-xl overflow-hidden shadow-md border border-border/50 hover:shadow-lg hover:border-primary/30 transition-all duration-300 flex flex-col h-full">
                    <div className="w-full aspect-video relative overflow-hidden group">
                      <img 
                        src={product.image || placeholderImage} 
                        alt={product.name} 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent"></div>
                      <h3 className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 sm:text-base text-white font-semibold text-right line-clamp-2 text-[12px] pt-[6px] pb-[6px]">{product.name}</h3>
                      {product.quantity === 0 && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="destructive">ناموجود</Badge>
                        </div>
                      )}
                    </div>
                    <div className="p-3 sm:p-4 flex flex-col flex-1 text-right">
                      <p className="text-xs sm:text-sm line-clamp-4 flex-1 text-right font-thin text-[#0a0000] bg-[#ffffff] mt-[2px] mb-[2px]">
                        {product.description || "محصول با کیفیت عالی"}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => addToCart(product)}
                          className="h-8 sm:h-9 w-8 sm:w-9 p-0 rounded-lg font-semibold bg-[#6572e5e6] text-[#ffffff] hover:bg-[#6572e5e6]/90 flex items-center justify-center">
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                        <div className="flex flex-col flex-1">
                          {product.priceAfterDiscount && product.priceAfterDiscount !== product.priceBeforeDiscount ? (
                            <>
                              <span className="text-xs text-muted-foreground line-through">{formatPrice(product.priceBeforeDiscount)}</span>
                              <span className="text-sm font-bold text-black text-left">{formatPrice(product.priceAfterDiscount)}</span>
                            </>
                          ) : (
                            <span className="text-sm font-bold text-black text-left">{formatPrice(product.priceBeforeDiscount)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cart" className="flex-1 flex flex-col overflow-hidden px-6 pt-24 mt-0 data-[state=inactive]:hidden h-full">
            <div className="max-w-4xl mx-auto w-full h-full flex flex-col overflow-y-auto">
              {/* سفارشات ثبت شده */}
              {completedOrders.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4 shadow-sm border border-green-200 mb-4 mt-8">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h3 className="font-bold text-green-700 text-sm">سفارشات ثبت شده</h3>
                  </div>
                  <div className="space-y-3">
                    {completedOrders.map((order) => (
                      <div key={order.id} className="bg-white rounded-lg p-3 border border-green-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString('fa-IR')}
                          </span>
                          <span className="text-sm font-bold text-green-600">
                            {formatPrice(order.totalAmount)} تومان
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          {order.items.length} محصول • {getShippingMethodLabel(order.shippingMethod)}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-8 text-xs border-green-300 text-green-700 hover:bg-green-50"
                          onClick={() => {
                            const orderDetails = `📋 جزئیات سفارش:\n\n${order.items.map(item => `• ${item.name} (${item.quantity} عدد) - ${formatPrice(parseFloat(item.priceAfterDiscount) * item.quantity)} تومان`).join('\n')}\n\n💰 مبلغ کل: ${formatPrice(order.totalAmount)} تومان\n🚚 نحوه ارسال: ${getShippingMethodLabel(order.shippingMethod)}`;
                            setMessages(prev => [...prev, { role: "assistant", content: orderDetails }]);
                            setActiveTab("chat");
                          }}
                        >
                          جزئیات
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cartItems.length === 0 && completedOrders.length === 0 ? (
                <div className="bg-white rounded-lg p-6 shadow-sm border border-border mt-8">
                  <p className="text-muted-foreground text-center py-12">سبد خرید شما خالی است</p>
                </div>
              ) : cartItems.length === 0 ? null : (
                <div className="flex flex-col h-full min-h-0">
                  {/* Total Card at Top */}
                  <div className="bg-white rounded-lg p-4 shadow-lg border border-primary/30 mb-4 mt-8 flex-shrink-0">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-semibold">جمع کل:</span>
                      <span className="text-lg font-bold text-primary">{formatPrice(cartTotal)} تومان</span>
                    </div>
                    <Button onClick={handleCheckout} className="w-full bg-primary text-primary-foreground">
                      ادامه خرید
                    </Button>
                  </div>
                  
                  {/* Scrollable Products List */}
                  <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pb-24">
                    {cartItems.map((item) => (
                      <div key={item.productId} className="bg-white rounded-lg p-2 shadow-sm border border-border/50 flex gap-2 items-center">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 flex flex-col justify-between text-right">
                          <div>
                            <h3 className="font-semibold text-[12px]">{item.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {formatPrice(item.priceAfterDiscount)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.productId)}
                            className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <div className="flex items-center gap-1 border border-border rounded">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              className="h-6 w-6 p-0 text-xs"
                            >
                              −
                            </Button>
                            <span className="w-6 text-center text-xs">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              className="h-6 w-6 p-0 text-xs"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <VitrinBottomNav 
        onShowcase={() => setActiveTab("showcase")} 
        onCart={() => setActiveTab("cart")} 
        onProfile={() => setActiveTab("chat")} 
        activeTab={activeTab}
        storeLogo={vitrinInfo.storeLogo}
        storeName={vitrinInfo.storeName}
        cartCount={cartItems.reduce((total, item) => total + item.quantity, 0)}
      />
    </div>
  );
}
