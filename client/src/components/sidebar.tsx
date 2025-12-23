import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { 
  Store, 
  Users, 
  Ticket, 
  Crown, 
  User, 
  Send, 
  Warehouse, 
  Plus, 
  List, 
  MessageSquare,
  Settings,
  ChevronDown,
  LogOut,
  BarChart3,
  Bot,
  Home,
  FolderTree,
  MessageCircle,
  ShoppingCart,
  MapPin,
  Package,
  Wallet,
  DollarSign,
  CreditCard,
  HelpCircle,
  Truck,
  Receipt,
  Database,
  History,
  FileText,
  Puzzle,
  Mail
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMenuCountersSimple } from "@/hooks/use-menu-counters";
import { createAuthenticatedRequest } from "@/lib/auth";

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ticketsOpen, setTicketsOpen] = useState(false);
  const [level2MenuOpen, setLevel2MenuOpen] = useState(false);
  const [level1MenuOpen, setLevel1MenuOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const prevLocation = useRef(location);

  const isActive = (path: string) => location === path;

  // Call onNavigate when location changes (for mobile drawer close)
  useEffect(() => {
    if (prevLocation.current !== location && onNavigate) {
      onNavigate();
    }
    prevLocation.current = location;
  }, [location, onNavigate]);

  // استفاده از hook مرکزی برای شمارنده‌های منو
  // این hook تمام شمارنده‌ها رو محاسبه می‌کنه
  const {
    whatsappUnreadCount,
    pendingOrdersCount,
    pendingPaymentOrdersCount,
    pendingTransactionsCount,
    internalChatsUnreadCount: unreadCount,
    cartItemsCount,
  } = useMenuCountersSimple();

  // شمارنده پیام‌های خوانده نشده چت مهمانان (فقط برای ادمین)
  const { data: guestChatsUnreadData } = useQuery<{ unreadCount: number }>({
    queryKey: ['/api/admin/guest-chats/unread-count'],
    queryFn: async () => {
      const response = await createAuthenticatedRequest('/api/admin/guest-chats/unread-count');
      if (!response.ok) return { unreadCount: 0 };
      return response.json();
    },
    enabled: !!user && user.role === "admin",
    refetchInterval: 5000,
  });
  const guestChatsUnreadCount = guestChatsUnreadData?.unreadCount || 0;

  // چک کردن وضعیت پلاگین واتس‌اپ
  const { data: whatsappPluginData } = useQuery<{ isEnabled: boolean }>({
    queryKey: ['/api/plugins/whatsapp/status'],
    queryFn: async () => {
      const response = await createAuthenticatedRequest('/api/plugins/whatsapp/status');
      if (!response.ok) return { isEnabled: false };
      return response.json();
    },
    enabled: !!user,
    staleTime: 30000, // 30 ثانیه کش
  });
  const isWhatsappPluginEnabled = whatsappPluginData?.isEnabled ?? true;

  // چک کردن وضعیت پلاگین مالیات
  const { data: vatPluginData } = useQuery<{ isEnabled: boolean }>({
    queryKey: ['/api/plugins/vat/status'],
    queryFn: async () => {
      const response = await createAuthenticatedRequest('/api/plugins/vat/status');
      if (!response.ok) return { isEnabled: false };
      return response.json();
    },
    enabled: !!user,
    staleTime: 30000, // 30 ثانیه کش
  });
  const isVatPluginEnabled = vatPluginData?.isEnabled ?? true;

  // چک کردن وضعیت پلاگین هوش مصنوعی
  const { data: aiPluginData } = useQuery<{ isEnabled: boolean }>({
    queryKey: ['/api/plugins/ai/status'],
    queryFn: async () => {
      const response = await createAuthenticatedRequest('/api/plugins/ai/status');
      if (!response.ok) return { isEnabled: false };
      return response.json();
    },
    enabled: !!user,
    staleTime: 30000, // 30 ثانیه کش
  });
  const isAiPluginEnabled = aiPluginData?.isEnabled ?? true;

  // چک کردن وضعیت پلاگین پشتیبان‌گیری
  const { data: backupPluginData } = useQuery<{ isEnabled: boolean }>({
    queryKey: ['/api/plugins/backup/status'],
    queryFn: async () => {
      const response = await createAuthenticatedRequest('/api/plugins/backup/status');
      if (!response.ok) return { isEnabled: false };
      return response.json();
    },
    enabled: !!user,
    staleTime: 30000, // 30 ثانیه کش
  });
  const isBackupPluginEnabled = backupPluginData?.isEnabled ?? true;

  // چک کردن وضعیت پلاگین ارز دیجیتال
  const { data: cryptoPluginData } = useQuery<{ isEnabled: boolean }>({
    queryKey: ['/api/plugins/crypto-transactions/status'],
    queryFn: async () => {
      const response = await createAuthenticatedRequest('/api/plugins/crypto-transactions/status');
      if (!response.ok) return { isEnabled: false };
      return response.json();
    },
    enabled: !!user,
    staleTime: 30000, // 30 ثانیه کش
  });
  const isCryptoPluginEnabled = cryptoPluginData?.isEnabled ?? true;

  // چک کردن وضعیت پلاگین چت مهمانان
  const { data: guestChatsPluginData } = useQuery<{ isEnabled: boolean }>({
    queryKey: ['/api/plugins/guest-chats/status'],
    queryFn: async () => {
      const response = await createAuthenticatedRequest('/api/plugins/guest-chats/status');
      if (!response.ok) return { isEnabled: false };
      return response.json();
    },
    enabled: !!user,
    staleTime: 30000, // 30 ثانیه کش
  });
  const isGuestChatsPluginEnabled = guestChatsPluginData?.isEnabled ?? true;

  // ===== منوهای ادمین - ساختار جدید و استاندارد =====
  
  // پیام‌ها و ارتباطات (فیلتر شده بر اساس پلاگین چت مهمانان)
  const communicationItems = [
    ...(isGuestChatsPluginEnabled ? [{ path: "/guest-chats", label: "چت مهمانان", icon: MessageSquare }] : []),
    { path: "/tickets", label: "تیکت‌ها", icon: Ticket },
  ];

  // واتس‌اپ (پلاگین)
  const whatsappItems = [
    { path: "/whatsapp-chats", label: "چت واتس‌اپ", icon: MessageSquare },
    { path: "/send-message", label: "ارسال پیام", icon: Send },
    { path: "/admin/welcome-message", label: "پیام خوش آمدگویی", icon: MessageCircle },
    { path: "/whatsapp-settings", label: "تنظیمات", icon: Settings },
  ];

  // مدیریت کسب‌وکار - سفارشات و مالی (برای ادمین - فیلتر شده بر اساس پلاگین ارز دیجیتال)
  const businessItems = [
    { path: "/received-orders", label: "سفارشات دریافتی", icon: Package },
    { path: "/transactions", label: "تراکنش‌ها", icon: DollarSign },
    ...(isCryptoPluginEnabled ? [{ path: "/crypto-transactions", label: "ارز دیجیتال", icon: Wallet }] : []),
    { path: "/customer-chats", label: "چت با مشتریان", icon: MessageCircle },
  ];

  // مدیریت کسب‌وکار برای سطح ۱ (بدون ارز دیجیتال)
  const level1BusinessItems = [
    { path: "/received-orders", label: "سفارشات دریافتی", icon: Package },
    { path: "/transactions", label: "تراکنش‌ها", icon: DollarSign },
    { path: "/customer-chats", label: "چت با مشتریان", icon: MessageCircle },
  ];

  // انبار و محصولات
  const inventoryItems = [
    { path: "/products", label: "محصولات", icon: List },
    { path: "/add-product", label: "افزودن محصول", icon: Plus },
    { path: "/categories", label: "دسته‌بندی", icon: FolderTree },
  ];

  // مدیریت کاربران
  const usersManagementItems = [
    { path: "/users", label: "کاربران", icon: Users },
    { path: "/subscriptions", label: "اشتراک‌ها", icon: Crown },
  ];

  // چک کردن وضعیت پلاگین لاگ ورود
  const { data: loginLogsPluginData } = useQuery<{ isEnabled: boolean }>({
    queryKey: ['/api/plugins/login-logs/status'],
    queryFn: async () => {
      const response = await createAuthenticatedRequest('/api/plugins/login-logs/status');
      if (!response.ok) return { isEnabled: false };
      return response.json();
    },
    enabled: !!user,
    staleTime: 30000,
  });
  const isLoginLogsPluginEnabled = loginLogsPluginData?.isEnabled ?? true;

  // چک کردن وضعیت پلاگین ایمیل
  const { data: emailPluginData } = useQuery<{ isEnabled: boolean }>({
    queryKey: ['/api/plugins/email/status'],
    queryFn: async () => {
      const response = await createAuthenticatedRequest('/api/plugins/email/status');
      if (!response.ok) return { isEnabled: false };
      return response.json();
    },
    enabled: !!user,
    staleTime: 30000,
  });
  const isEmailPluginEnabled = emailPluginData?.isEnabled ?? true;

  // تنظیمات فروشگاه (همه تنظیمات ادغام شده - فیلتر شده بر اساس پلاگین‌ها)
  const shopSettingsItems = [
    { path: "/shipping-settings", label: "ترابری", icon: Truck },
    ...(isVatPluginEnabled ? [{ path: "/vat-settings", label: "مالیات", icon: Receipt }] : []),
    { path: "/bank-card", label: "کارت بانکی", icon: CreditCard },
    { path: "/manage-faqs", label: "سوالات متداول", icon: HelpCircle },
    ...(isAiPluginEnabled ? [{ path: "/ai-token", label: "هوش مصنوعی", icon: Bot }] : []),
    ...(isLoginLogsPluginEnabled ? [{ path: "/login-logs", label: "لاگ ورود", icon: History }] : []),
    ...(isBackupPluginEnabled ? [{ path: "/database-backup", label: "پشتیبان‌گیری", icon: Database }] : []),
  ];

  // تنظیمات (ترکیب تنظیمات فروشگاه و سیستم)
  const settingsItems = shopSettingsItems;

  // ===== منوهای کاربران =====
  
  const userMenuItems = [
    { path: "/", label: "پیشخوان", icon: Home },
  ];

  const ticketItems = [
    { path: "/send-ticket", label: "ارسال تیکت جدید", icon: Send },
    { path: "/my-tickets", label: "تیکت‌ها", icon: Ticket },
  ];

  const level2MenuItems = [
    { path: "/addresses", label: "آدرس‌ها", icon: MapPin },
    { path: "/orders", label: "سفارشات من", icon: Package },
    { path: "/financial", label: "امور مالی", icon: Wallet },
  ];

  // برای سازگاری با کدهای قبلی - منوی سطح ۱ بدون ارز دیجیتال
  const level1MenuItems = level1BusinessItems;

  return (
    <aside className="w-64 bg-card border-l border-border flex flex-col sidebar-transition" data-testid="sidebar-navigation">
      {/* Logo */}
      <div className="p-6 border-b border-border" data-testid="section-logo">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Store className="text-primary-foreground" />
          </div>
          <h2 className="mr-3 text-lg font-bold text-foreground">
            ربات آریا بات
          </h2>
        </div>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 p-4 custom-scrollbar overflow-y-auto" data-testid="nav-main-menu">
        <ul className="space-y-1">
          {/* ===== منوی ادمین - ساختار جدید ===== */}
          
          {/* User Menu Items - پیشخوان برای کاربران عادی */}
          {user?.role !== "admin" && userMenuItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path}>
                <Button
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isActive(item.path) && "bg-primary text-primary-foreground"
                  )}
                  data-testid={`link-${item.path.substring(1)}`}
                >
                  <item.icon className="w-5 h-5 ml-2" />
                  {item.label}
                </Button>
              </Link>
            </li>
          ))}

          {/* 1. پیام‌ها و ارتباطات - Admin */}
          {user?.role === "admin" && (
            <li className="pt-2">
              <span className="text-xs text-muted-foreground px-3 font-medium">پیام‌ها</span>
              <div className="mt-1 space-y-1">
                {communicationItems.map((item) => (
                  <Link key={item.path} href={item.path}>
                    <Button
                      variant={isActive(item.path) ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "w-full justify-start",
                        isActive(item.path) && "bg-primary text-primary-foreground"
                      )}
                      data-testid={`link-${item.path.substring(1)}`}
                    >
                      <item.icon className="w-4 h-4 ml-2" />
                      {item.label}
                      {item.path === "/guest-chats" && guestChatsUnreadCount > 0 && (
                        <Badge variant="destructive" className="mr-auto text-xs px-2 py-0.5 min-w-[1.5rem] h-5 flex items-center justify-center animate-pulse">
                          {guestChatsUnreadCount}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                ))}
              </div>
            </li>
          )}

          {/* 2. واتس‌اپ - Admin - فقط وقتی پلاگین فعال باشه */}
          {user?.role === "admin" && isWhatsappPluginEnabled && (
            <li className="pt-2">
              <Collapsible open={whatsappOpen} onOpenChange={setWhatsappOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start" data-testid="button-whatsapp-toggle">
                    <MessageSquare className="w-4 h-4 ml-2" />
                    واتس‌اپ
                    {whatsappUnreadCount > 0 && (
                      <Badge variant="default" className="mr-2 text-xs px-1.5 py-0 min-w-[1.2rem] h-4 flex items-center justify-center bg-green-500 text-white">
                        {whatsappUnreadCount}
                      </Badge>
                    )}
                    <ChevronDown className={cn("w-4 h-4 mr-auto transition-transform", whatsappOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mr-6 space-y-1">
                  {whatsappItems.map((item) => (
                    <Link key={item.path} href={item.path}>
                      <Button
                        variant={isActive(item.path) ? "default" : "ghost"}
                        size="sm"
                        className={cn("w-full justify-start text-sm", isActive(item.path) && "bg-primary text-primary-foreground")}
                        data-testid={`link-${item.path.substring(1)}`}
                      >
                        <item.icon className="w-3.5 h-3.5 ml-2" />
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </li>
          )}

          {/* 3. کسب‌وکار - Admin */}
          {user?.role === "admin" && (
            <li className="pt-2">
              <Collapsible open={level1MenuOpen} onOpenChange={setLevel1MenuOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start" data-testid="button-level1-menu-toggle">
                    <Package className="w-4 h-4 ml-2" />
                    کسب‌وکار
                    <ChevronDown className={cn("w-4 h-4 mr-auto transition-transform", level1MenuOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mr-6 space-y-1">
                  {businessItems.map((item) => (
                    <Link key={item.path} href={item.path}>
                      <Button
                        variant={isActive(item.path) ? "default" : "ghost"}
                        size="sm"
                        className={cn("w-full justify-start text-sm", isActive(item.path) && "bg-primary text-primary-foreground")}
                        data-testid={`link-${item.path.substring(1)}`}
                      >
                        <item.icon className="w-3.5 h-3.5 ml-2" />
                        {item.label}
                        {item.path === "/customer-chats" && unreadCount > 0 && (
                          <Badge variant="destructive" className="mr-auto text-xs px-1.5 py-0 min-w-[1.2rem] h-4">{unreadCount}</Badge>
                        )}
                        {item.path === "/received-orders" && pendingOrdersCount > 0 && (
                          <Badge className="mr-auto text-xs px-1.5 py-0 min-w-[1.2rem] h-4 bg-yellow-500 text-white">{pendingOrdersCount}</Badge>
                        )}
                        {item.path === "/transactions" && pendingTransactionsCount > 0 && (
                          <Badge variant="destructive" className="mr-auto text-xs px-1.5 py-0 min-w-[1.2rem] h-4">{pendingTransactionsCount}</Badge>
                        )}
                      </Button>
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </li>
          )}

          {/* 4. انبار - Admin */}
          {user?.role === "admin" && (
            <li>
              <Collapsible open={inventoryOpen} onOpenChange={setInventoryOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start" data-testid="button-inventory-toggle">
                    <Warehouse className="w-4 h-4 ml-2" />
                    انبار
                    <ChevronDown className={cn("w-4 h-4 mr-auto transition-transform", inventoryOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mr-6 space-y-1">
                  {inventoryItems.map((item) => (
                    <Link key={item.path} href={item.path}>
                      <Button
                        variant={isActive(item.path) ? "default" : "ghost"}
                        size="sm"
                        className={cn("w-full justify-start text-sm", isActive(item.path) && "bg-primary text-primary-foreground")}
                        data-testid={`link-${item.path.substring(1)}`}
                      >
                        <item.icon className="w-3.5 h-3.5 ml-2" />
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </li>
          )}

          {/* 5. کاربران - Admin */}
          {user?.role === "admin" && (
            <li className="pt-2">
              <span className="text-xs text-muted-foreground px-3 font-medium">کاربران</span>
              <div className="mt-1 space-y-1">
                {usersManagementItems.map((item) => (
                  <Link key={item.path} href={item.path}>
                    <Button
                      variant={isActive(item.path) ? "default" : "ghost"}
                      size="sm"
                      className={cn("w-full justify-start", isActive(item.path) && "bg-primary text-primary-foreground")}
                      data-testid={`link-${item.path.substring(1)}`}
                    >
                      <item.icon className="w-4 h-4 ml-2" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </li>
          )}

          {/* 5.5. پلاگین‌ها - Admin */}
          {user?.role === "admin" && (
            <li className="pt-2">
              <Link href="/plugins">
                <Button
                  variant={isActive("/plugins") ? "default" : "ghost"}
                  size="sm"
                  className={cn("w-full justify-start", isActive("/plugins") && "bg-primary text-primary-foreground")}
                  data-testid="link-plugins"
                >
                  <Puzzle className="w-4 h-4 ml-2" />
                  پلاگین‌ها
                </Button>
              </Link>
            </li>
          )}

          {/* 5.6. ایمیل - Admin */}
          {user?.role === "admin" && isEmailPluginEnabled && (
            <li className="pt-2">
              <Collapsible open={emailOpen} onOpenChange={setEmailOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    data-testid="button-email-toggle"
                  >
                    <Mail className="w-4 h-4 ml-2" />
                    ایمیل
                    <ChevronDown className={cn(
                      "w-4 h-4 mr-auto transition-transform",
                      emailOpen && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mr-6 space-y-1">
                  <Link href="/send-email">
                    <Button
                      variant={isActive("/send-email") ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "w-full justify-start text-sm",
                        isActive("/send-email") && "bg-primary text-primary-foreground"
                      )}
                      data-testid="link-send-email"
                    >
                      <Send className="w-3.5 h-3.5 ml-2" />
                      ارسال ایمیل
                    </Button>
                  </Link>
                  <Link href="/sent-messages">
                    <Button
                      variant={isActive("/sent-messages") ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "w-full justify-start text-sm",
                        isActive("/sent-messages") && "bg-primary text-primary-foreground"
                      )}
                      data-testid="link-sent-messages"
                    >
                      <FileText className="w-3.5 h-3.5 ml-2" />
                      پیام‌های ارسالی
                    </Button>
                  </Link>
                  <Link href="/email-inbox">
                    <Button
                      variant={isActive("/email-inbox") ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "w-full justify-start text-sm",
                        isActive("/email-inbox") && "bg-primary text-primary-foreground"
                      )}
                      data-testid="link-email-inbox"
                    >
                      <MessageSquare className="w-3.5 h-3.5 ml-2" />
                      صندوق دریافت
                    </Button>
                  </Link>
                  <Link href="/email-settings">
                    <Button
                      variant={isActive("/email-settings") ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "w-full justify-start text-sm",
                        isActive("/email-settings") && "bg-primary text-primary-foreground"
                      )}
                      data-testid="link-email-settings"
                    >
                      <Settings className="w-3.5 h-3.5 ml-2" />
                      تنظیمات
                    </Button>
                  </Link>
                </CollapsibleContent>
              </Collapsible>
            </li>
          )}


          {/* Shopping Cart - Only for user_level_2 */}
          {user?.role === "user_level_2" && (
            <li>
              <Link href="/cart">
                <Button
                  variant={isActive("/cart") ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isActive("/cart") && "bg-primary text-primary-foreground"
                  )}
                  data-testid="link-cart"
                >
                  <ShoppingCart className="w-5 h-5 ml-2" />
                  سبد خرید
                  {cartItemsCount > 0 && (
                    <Badge 
                      variant="default" 
                      className="mr-auto text-xs px-2 py-1 min-w-[1.5rem] h-6 flex items-center justify-center bg-green-500 text-white"
                      data-testid="badge-cart-count"
                    >
                      {cartItemsCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            </li>
          )}

          {/* Direct Menu Items for user_level_2 - Addresses, Orders, Financial */}
          {user?.role === "user_level_2" && level2MenuItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path}>
                <Button
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isActive(item.path) && "bg-primary text-primary-foreground"
                  )}
                  data-testid={`link-${item.path.substring(1)}`}
                >
                  <item.icon className="w-5 h-5 ml-2" />
                  {item.label}
                  {item.path === "/orders" && pendingPaymentOrdersCount > 0 && (
                    <Badge 
                      variant="default" 
                      className="mr-auto text-xs px-2 py-1 min-w-[1.5rem] h-6 flex items-center justify-center bg-green-500 text-white"
                      data-testid="badge-orders-count"
                    >
                      {pendingPaymentOrdersCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            </li>
          ))}

          {/* Users Management - Level 1 Only */}
          {user?.role === "user_level_1" && (
            <li>
              <Link href="/sub-users">
                <Button
                  variant={isActive("/sub-users") ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isActive("/sub-users") && "bg-primary text-primary-foreground"
                  )}
                  data-testid="link-sub-users"
                >
                  <Users className="w-5 h-5 ml-2" />
                  مدیریت کاربران
                </Button>
              </Link>
            </li>
          )}


          {/* Tickets Submenu - Only for level 1 users */}
          {user?.role === "user_level_1" && (
            <li>
              <Collapsible open={ticketsOpen} onOpenChange={setTicketsOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    data-testid="button-tickets-toggle"
                  >
                    <MessageSquare className="w-5 h-5 ml-2" />
                    تیکت‌ها
                    <ChevronDown className={cn(
                      "w-4 h-4 mr-auto transition-transform",
                      ticketsOpen && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mr-6 space-y-1">
                  {ticketItems.map((item) => (
                    <Link key={item.path} href={item.path}>
                      <Button
                        variant={isActive(item.path) ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "w-full justify-start",
                          isActive(item.path) && "bg-primary text-primary-foreground"
                        )}
                        data-testid={`link-${item.path.substring(1)}`}
                      >
                        <item.icon className="w-4 h-4 ml-2" />
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </li>
          )}

          {/* Chat with Seller - Only for level 2 users */}
          {user?.role === "user_level_2" && (
            <li>
              <Link href="/chat-with-seller">
                <Button
                  variant={isActive("/chat-with-seller") ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isActive("/chat-with-seller") && "bg-primary text-primary-foreground"
                  )}
                  data-testid="link-chat-with-seller"
                >
                  <MessageCircle className="w-5 h-5 ml-2" />
                  چت با فروشنده
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="mr-auto text-xs px-2 py-1 min-w-[1.5rem] h-6 flex items-center justify-center"
                      data-testid="badge-chat-seller-unread"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            </li>
          )}

          {/* User Profile - Only for level 2 users */}
          {user?.role === "user_level_2" && (
            <li>
              <Link href="/profile">
                <Button
                  variant={isActive("/profile") ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isActive("/profile") && "bg-primary text-primary-foreground"
                  )}
                  data-testid="link-profile"
                >
                  <User className="w-5 h-5 ml-2" />
                  اطلاعات کاربری
                </Button>
              </Link>
            </li>
          )}

          {/* Settings Section - Before Logout */}
          {(user?.role === "admin" || user?.role === "user_level_1") && (
            <li>
              <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    data-testid="button-settings-toggle"
                  >
                    <Settings className="w-5 h-5 ml-2" />
                    تنظیمات
                    <ChevronDown className={cn(
                      "w-4 h-4 mr-auto transition-transform",
                      settingsOpen && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mr-6 space-y-1">
                  {settingsItems.map((item) => (
                    (!item.adminOnly || user?.role === "admin") && (
                      <Link key={item.path} href={item.path}>
                        <Button
                          variant={isActive(item.path) ? "default" : "ghost"}
                          size="sm"
                          className={cn(
                            "w-full justify-start",
                            isActive(item.path) && "bg-primary text-primary-foreground"
                          )}
                          data-testid={`link-${item.path.substring(1)}`}
                        >
                          <item.icon className="w-4 h-4 ml-2" />
                          {item.label}
                        </Button>
                      </Link>
                    )
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </li>
          )}

          {/* Logout - After User Profile */}
          {user?.role !== "admin" && (
            <li>
              <Button
                variant="ghost"
                onClick={logout}
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                data-testid="button-sidebar-logout"
              >
                <LogOut className="w-5 h-5 ml-2" />
                خروج
              </Button>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
}
