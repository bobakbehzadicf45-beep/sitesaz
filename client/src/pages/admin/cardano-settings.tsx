import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createAuthenticatedRequest } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard-layout";

interface BlockchainSettings {
  id?: string;
  provider: string;
  apiKey: string;
  isActive: boolean;
  metadata?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export default function CardanoSettings() {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: blockchainData, isLoading } = useQuery({
    queryKey: ["/api/blockchain-settings"],
    queryFn: async () => {
      const response = await createAuthenticatedRequest("/api/blockchain-settings");
      if (!response.ok) {
        throw new Error("خطا در دریافت تنظیمات بلاکچین");
      }
      return response.json() as Promise<BlockchainSettings[]>;
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (settingsData: { provider: string; apiKey: string; isActive: boolean }) => {
      const response = await createAuthenticatedRequest("/api/blockchain-settings", {
        method: "POST",
        body: JSON.stringify(settingsData),
      });
      if (!response.ok) throw new Error("خطا در ذخیره تنظیمات");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blockchain-settings"] });
      toast({
        title: "موفقیت",
        description: "تنظیمات کاردانو با موفقیت ذخیره شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در ذخیره تنظیمات کاردانو",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettingsMutation.mutate({ provider: "cardano", apiKey, isActive });
  };

  const handleToggle = (checked: boolean) => {
    setIsActive(checked);
    saveSettingsMutation.mutate({ 
      provider: "cardano", 
      apiKey: apiKey || blockchainData?.find(s => s.provider === "cardano")?.apiKey || "", 
      isActive: checked 
    });
  };

  useEffect(() => {
    if (blockchainData) {
      const cardanoSettings = blockchainData.find(s => s.provider === "cardano");
      if (cardanoSettings) {
        setApiKey(cardanoSettings.apiKey);
        setIsActive(cardanoSettings.isActive);
      }
    }
  }, [blockchainData]);

  return (
    <DashboardLayout title="تنظیمات کاردانو">
      <div className="space-y-6 text-right" dir="rtl">
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="p-8 text-center">در حال بارگذاری...</div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Key className="w-5 h-5 ml-2" />
                      تنظیمات Cardanoscan API
                    </div>
                    <div className="flex items-center gap-2" dir="ltr">
                      <Switch
                        id="cardano-status"
                        checked={isActive}
                        onCheckedChange={handleToggle}
                        className="data-[state=checked]:bg-primary [&>span]:data-[state=checked]:translate-x-5 [&>span]:data-[state=unchecked]:translate-x-0"
                      />
                      <Label htmlFor="cardano-status" className="text-sm text-muted-foreground" dir="rtl">
                        {isActive ? "فعال" : "غیرفعال"}
                      </Label>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    توکن API کاردانو را برای دریافت تراکنش‌های بلاکچین تنظیم کنید
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveSettings} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardanoApiKey">توکن Cardanoscan API</Label>
                      <div className="relative">
                        <Input
                          id="cardanoApiKey"
                          type={showApiKey ? "text" : "password"}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="توکن Cardanoscan API خود را وارد کنید..."
                          className="pl-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute left-2 top-1/2 transform -translate-y-1/2"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        برای دریافت توکن رایگان به{" "}
                        <a 
                          href="https://cardanoscan.io" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Cardanoscan.io
                        </a>
                        {" "}مراجعه کنید
                      </p>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={saveSettingsMutation.isPending}
                    >
                      {saveSettingsMutation.isPending ? "در حال ذخیره..." : "ذخیره توکن کاردانو"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
