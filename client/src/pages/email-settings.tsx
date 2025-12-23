import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { createAuthenticatedRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface EmailSettings {
  emailPrefix: string;
}

export default function EmailSettings() {
  const { toast } = useToast();
  const [emailPrefix, setEmailPrefix] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // دریافت تنظیمات ایمیل
  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ["/api/email-settings"],
    queryFn: async (): Promise<EmailSettings> => {
      const response = await createAuthenticatedRequest("/api/email-settings");
      if (!response.ok) return { emailPrefix: "" };
      return response.json();
    },
  });

  // بروزرسانی emailPrefix هنگام بارگذاری تنظیمات
  useEffect(() => {
    if (settings?.emailPrefix && emailPrefix !== settings.emailPrefix) {
      setEmailPrefix(settings.emailPrefix);
    }
  }, [settings?.emailPrefix]);

  // دریافت نام دومین اصلی
  const domainName = useMemo(() => {
    if (typeof window === "undefined") return "";
    const hostname = window.location.hostname;
    // حذف www. اگر وجود داشت
    return hostname.replace(/^www\./, "");
  }, []);

  // آدرس ایمیل کامل
  const fullEmailAddress = domainName ? `${emailPrefix}@${domainName}` : emailPrefix;

  // ذخیره تنظیمات
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!emailPrefix.trim()) {
        toast({ title: "خطا", description: "پیشوند ایمیل نمی‌تواند خالی باشد", variant: "destructive" });
        return;
      }

      const response = await createAuthenticatedRequest("/api/email-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailPrefix: emailPrefix.trim() }),
      });

      if (!response.ok) throw new Error("خطا در ذخیره");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "موفق", description: "تنظیمات ایمیل با موفقیت ذخیره شد" });
      refetch();
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در ذخیره تنظیمات ایمیل", variant: "destructive" });
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync();
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">در حال بارگذاری...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Mail className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">تنظیمات ایمیل</h1>
        </div>
        <p className="text-muted-foreground">پیشوند ایمیل خود را برای دریافت ایمیل‌ها تنظیم کنید</p>
      </div>

      {/* Email Prefix Settings */}
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <Label htmlFor="emailPrefix" className="text-base mb-3 block">
              پیشوند ایمیل
            </Label>
            <div className="flex gap-2 items-end">
              <div className="pb-2">
                <span className="text-sm font-medium">@{domainName}</span>
              </div>
              <div className="flex-1">
                <Input
                  id="emailPrefix"
                  type="text"
                  placeholder="example"
                  value={emailPrefix}
                  onChange={(e) => setEmailPrefix(e.target.value)}
                  className="text-right"
                  disabled={isSaving}
                />
              </div>
            </div>
            {domainName && fullEmailAddress && (
              <p className="text-xs text-muted-foreground mt-2">
                آدرس ایمیل کامل: <span className="font-mono text-xs">{fullEmailAddress}</span>
              </p>
            )}
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving || emailPrefix === settings?.emailPrefix}
            className="w-full"
          >
            {isSaving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
