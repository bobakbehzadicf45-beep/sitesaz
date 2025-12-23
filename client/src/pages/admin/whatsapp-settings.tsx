import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Save, 
  MessageCircle, 
  Shield, 
  Bell, 
  Eye,
  EyeOff,
  Settings,
  User,
  Crown,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createAuthenticatedRequest } from "@/lib/auth";
import type { WhatsappSettings } from "@shared/schema";

interface WhatsAppConnectionStatus {
  status: string;
  connectionStatus: string;
  whatsAppNumber: string;
  level: string;
}

export default function WhatsappSettings() {
  const [formData, setFormData] = useState({
    token: "",
    isEnabled: true,
    notifications: [] as string[],
    aiName: "من هوش مصنوعی هستم",
  });
  const [showToken, setShowToken] = useState(false);
  const [isPersonal, setIsPersonal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    isConnected: boolean | null;
    message: string;
    whatsAppNumber?: string;
    lastChecked?: Date;
  }>({
    isConnected: null,
    message: "در حال بررسی اتصال...",
  });
  const userRef = useRef<{role: string; id: string; whatsappNumber?: string} | undefined>(undefined);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user info
  const { data: user } = useQuery<{role: string; id: string; whatsappNumber?: string}>({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const response = await createAuthenticatedRequest("/api/profile");
      if (!response.ok) throw new Error("خطا در دریافت اطلاعات کاربر");
      return response.json();
    },
  });

  // Sync user to ref and check connection when user loads
  useEffect(() => {
    userRef.current = user;
    // وقتی user لود شد و admin است، یکبار اتصال را چک کن
    if (user?.role === 'admin' && (formData.token || settings?.token)) {
      checkWhatsAppConnection();
    }
  }, [user]);

  const { data: settings, isLoading } = useQuery<{
    token: string;
    isEnabled: boolean;
    notifications: string[];
    aiName: string;
    isPersonal: boolean;
  }>({
    queryKey: ["/api/whatsapp-settings"],
    queryFn: async () => {
      const response = await createAuthenticatedRequest("/api/whatsapp-settings");
      if (!response.ok) throw new Error("خطا در دریافت تنظیمات واتس‌اپ");
      return response.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await createAuthenticatedRequest("/api/whatsapp-settings", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("خطا در بروزرسانی تنظیمات واتس‌اپ");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "✅ موفقیت",
        description: isPersonal ? "توکن شخصی ذخیره شد" : "تنظیمات ذخیره شد",
      });
    },
    onError: () => {
      toast({
        title: "❌ خطا",
        description: "خطا در ذخیره تنظیمات",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        token: settings.token || "",
        isEnabled: settings.isEnabled,
        notifications: settings.notifications || [],
        aiName: settings.aiName || "من هوش مصنوعی هستم",
      });
      setIsPersonal(!!settings.isPersonal);
    }
  }, [settings]);

  const checkWhatsAppConnection = async (manualCheck = false) => {
    const token = formData.token || settings?.token;
    if (!token) {
      setConnectionStatus({
        isConnected: false,
        message: "توکن واتس‌اپ تنظیم نشده است",
      });
      return;
    }

    if (manualCheck) {
      setIsCheckingConnection(true);
    }

    try {
      const response = await fetch(`https://api.whatsiplus.com/serviceSettings/${token}`);
      
      if (!response.ok) {
        throw new Error("خطا در دریافت وضعیت");
      }

      const data: WhatsAppConnectionStatus = await response.json();
      
      // منطق ساده: اگر شماره موبایل نمایش داده شد = متصل، وگرنه = قطع شده
      const isConnected = !!data.whatsAppNumber;
      
      const newStatus = {
        isConnected,
        message: isConnected 
          ? `متصل به واتس‌اپ` 
          : "قطع اتصال",
        whatsAppNumber: data.whatsAppNumber,
        lastChecked: new Date(),
      };
      
      setConnectionStatus(newStatus);

      if (manualCheck) {
        toast({
          title: isConnected ? "✅ متصل" : "⚠️ قطع شده",
          description: newStatus.message,
        });
      }
    } catch (error) {
      const errorStatus = {
        isConnected: false,
        message: "خطا در بررسی وضعیت اتصال",
        lastChecked: new Date(),
      };
      setConnectionStatus(errorStatus);
      
      if (manualCheck) {
        toast({
          title: "❌ خطا",
          description: "خطا در بررسی وضعیت اتصال",
          variant: "destructive",
        });
      }
    } finally {
      if (manualCheck) {
        setIsCheckingConnection(false);
      }
    }
  };

  useEffect(() => {
    if (formData.token || settings?.token) {
      checkWhatsAppConnection();
      
      const interval = setInterval(() => {
        checkWhatsAppConnection();
      }, 10 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [formData.token, settings?.token]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleNotificationChange = (notification: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        notifications: [...formData.notifications, notification],
      });
    } else {
      setFormData({
        ...formData,
        notifications: formData.notifications.filter(n => n !== notification),
      });
    }
  };

  const notificationOptions = [
    { id: "new_ticket", label: "تیکت جدید", icon: Bell },
    { id: "new_user", label: "کاربر جدید", icon: Shield },
  ];

  const isLevel1User = user?.role === 'user_level_1';
  const isAdmin = user?.role === 'admin';

  if (isLoading) {
    return (
      <DashboardLayout title="تنظیمات واتس‌اپ">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="تنظیمات واتس‌اپ">
      <div className="space-y-4" data-testid="page-whatsapp-settings">
        
        {/* Modern Connection Status Bar */}
        {(formData.token || settings?.token) && (
          <Card className={`relative overflow-hidden border-none shadow-lg transition-all duration-300 ${
            connectionStatus.isConnected === null 
              ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
              : connectionStatus.isConnected 
                ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                : 'bg-gradient-to-r from-red-500 to-rose-600'
          }`}>
            <div className="absolute inset-0 bg-black/5"></div>
            <CardContent className="relative p-4">
              <div className="flex items-center justify-between gap-4">
                {/* Status Info */}
                <div className="flex items-center gap-4 flex-1">
                  {/* Icon */}
                  <div className={`p-3 rounded-xl bg-white/20 backdrop-blur-sm ${
                    connectionStatus.isConnected === null ? 'animate-pulse' : ''
                  }`}>
                    {connectionStatus.isConnected === null ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : connectionStatus.isConnected ? (
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-white animate-pulse" />
                    )}
                  </div>

                  {/* Status Details */}
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-lg">
                        {connectionStatus.isConnected === null 
                          ? 'در حال بررسی...' 
                          : connectionStatus.isConnected 
                            ? 'متصل به واتس‌اپ' 
                            : 'اتصال قطع شده'}
                      </span>
                      {connectionStatus.isConnected === false && (
                        <Badge variant="destructive" className="bg-white/30 text-white border-white/50">
                          نیاز به توجه
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-white/90 text-sm">
                      {connectionStatus.whatsAppNumber && (
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {connectionStatus.whatsAppNumber}
                        </span>
                      )}
                      {connectionStatus.lastChecked && (
                        <span className="flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" />
                          {new Date(connectionStatus.lastChecked).toLocaleTimeString('fa-IR')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {/* Refresh Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => checkWhatsAppConnection(true)}
                    disabled={isCheckingConnection}
                    className="text-white hover:bg-white/20 border border-white/30"
                  >
                    <RefreshCw className={`w-4 h-4 ml-1 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                    بررسی مجدد
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 space-x-reverse text-base">
              {isPersonal ? (
                <>
                  <User className="w-4 h-4" />
                  <span>توکن واتس‌اپ شخصی</span>
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4" />
                  <span>پیکربندی عمومی</span>
                  {isAdmin && (
                    <Badge variant="secondary" className="mr-2">
                      <Crown className="w-3 h-3 ml-1" />
                      مدیر
                    </Badge>
                  )}
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-whatsapp-settings">
              
              {/* Token */}
              <div className="space-y-2">
                <Label htmlFor="token" className="text-sm font-medium flex items-center space-x-1 space-x-reverse">
                  <Shield className="w-3 h-3" />
                  <span>توکن API</span>
                </Label>
                <div className="relative">
                  <Input
                    id="token"
                    type={showToken ? "text" : "password"}
                    value={formData.token}
                    onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                    placeholder={isPersonal ? "توکن توسط مدیر تنظیم می‌شود" : "توکن API واتس‌اپ"}
                    className="pr-8"
                    data-testid="input-whatsapp-token"
                    disabled={isPersonal}
                    readOnly={isPersonal}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {isPersonal && (
                  <p className="text-xs text-muted-foreground">
                    توکن شما توسط مدیر تنظیم شده و قابل ویرایش نیست. فقط قابل مشاهده است.
                  </p>
                )}
              </div>

              {/* AI Name */}
              <div className="space-y-2">
                <Label htmlFor="aiName" className="text-sm font-medium flex items-center space-x-1 space-x-reverse">
                  <MessageCircle className="w-3 h-3" />
                  <span>نام هوش مصنوعی</span>
                </Label>
                <Input
                  id="aiName"
                  type="text"
                  value={formData.aiName}
                  onChange={(e) => setFormData({ ...formData, aiName: e.target.value })}
                  placeholder="من هوش مصنوعی هستم"
                  data-testid="input-ai-name"
                />
                <p className="text-xs text-muted-foreground">
                  وقتی کاربر نام شما را بپرسد، این نام را بیان خواهید کرد
                </p>
              </div>

              {/* Enable Toggle - Show for non-personal (admin) settings */}
              {!isPersonal && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <Label htmlFor="isEnabled" className="text-sm font-medium cursor-pointer">
                      فعال‌سازی سرویس واتس‌اپ
                    </Label>
                    <div className="flex items-center gap-2" dir="ltr">
                      <Switch
                        id="isEnabled"
                        checked={formData.isEnabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked as boolean })}
                        data-testid="switch-whatsapp-enabled"
                        className="data-[state=checked]:bg-primary [&>span]:data-[state=checked]:translate-x-5 [&>span]:data-[state=unchecked]:translate-x-0"
                      />
                      <span className="text-sm text-muted-foreground" dir="rtl">
                        {formData.isEnabled ? "فعال" : "غیرفعال"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications - Only for admin users */}
              {!isPersonal && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center space-x-1 space-x-reverse">
                    <Bell className="w-3 h-3" />
                    <span>اعلان‌ها</span>
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {notificationOptions.map((option) => {
                      const IconComponent = option.icon;
                      const isChecked = formData.notifications.includes(option.id);
                      return (
                        <div key={option.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4 text-gray-500" />
                            <Label htmlFor={option.id} className="text-sm cursor-pointer">
                              {option.label}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2" dir="ltr">
                            <Switch
                              id={option.id}
                              checked={isChecked}
                              onCheckedChange={(checked) => handleNotificationChange(option.id, checked as boolean)}
                              data-testid={`switch-notification-${option.id}`}
                              className="data-[state=checked]:bg-primary [&>span]:data-[state=checked]:translate-x-5 [&>span]:data-[state=unchecked]:translate-x-0"
                            />
                            <span className="text-xs text-muted-foreground" dir="rtl">
                              {isChecked ? "فعال" : "غیرفعال"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center space-x-3 space-x-reverse pt-2">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  size="sm"
                  data-testid="button-save-whatsapp-settings"
                >
                  <Save className="w-3 h-3 ml-1" />
                  {updateMutation.isPending ? "در حال ذخیره..." : "ذخیره"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}