import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Key, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createAuthenticatedRequest } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard-layout";

interface AiTokenSettings {
  id?: string;
  token: string;
  provider: string;
  workspaceId?: string;
  model?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const GEMINI_MODELS = [
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash (پیشنهادی)" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash (آزمایشی)" },
];

export default function AITokenSettings() {
  const [geminiToken, setGeminiToken] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-1.5-flash");
  const [liaraToken, setLiaraToken] = useState("");
  const [liaraWorkspaceId, setLiaraWorkspaceId] = useState("");
  const [showGeminiToken, setShowGeminiToken] = useState(false);
  const [showLiaraToken, setShowLiaraToken] = useState(false);
  const [geminiActive, setGeminiActive] = useState(false);
  const [liaraActive, setLiaraActive] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: aiTokenData, isLoading } = useQuery({
    queryKey: ["/api/ai-token"],
    queryFn: async () => {
      const response = await createAuthenticatedRequest("/api/ai-token");
      if (!response.ok) {
        throw new Error("خطا در دریافت تنظیمات هوش مصنوعی");
      }
      return response.json() as Promise<AiTokenSettings[]>;
    },
  });

  const saveTokenMutation = useMutation({
    mutationFn: async (tokenData: { token: string; provider: string; workspaceId?: string; model?: string; isActive: boolean }) => {
      const response = await createAuthenticatedRequest("/api/ai-token", {
        method: "POST",
        body: JSON.stringify(tokenData),
      });
      if (!response.ok) throw new Error("خطا در ذخیره توکن");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-token"] });
      toast({
        title: "موفقیت",
        description: "توکن هوش مصنوعی با موفقیت ذخیره شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در ذخیره توکن هوش مصنوعی",
        variant: "destructive",
      });
    },
  });

  const handleSaveGeminiToken = (e: React.FormEvent) => {
    e.preventDefault();
    saveTokenMutation.mutate({ token: geminiToken, provider: "gemini", model: geminiModel, isActive: geminiActive });
  };

  const handleSaveLiaraToken = (e: React.FormEvent) => {
    e.preventDefault();
    saveTokenMutation.mutate({ token: liaraToken, provider: "liara", workspaceId: liaraWorkspaceId, isActive: liaraActive });
  };

  const handleToggleGemini = (checked: boolean) => {
    setGeminiActive(checked);
    if (checked) {
      setLiaraActive(false);
    }
    const geminiSettings = aiTokenData?.find(s => s.provider === "gemini");
    saveTokenMutation.mutate({ 
      token: geminiToken || geminiSettings?.token || "", 
      provider: "gemini",
      model: geminiModel || geminiSettings?.model || "gemini-1.5-flash",
      isActive: checked 
    });
  };

  const handleToggleLiara = (checked: boolean) => {
    setLiaraActive(checked);
    if (checked) {
      setGeminiActive(false);
    }
    const liaraData = aiTokenData?.find(s => s.provider === "liara");
    saveTokenMutation.mutate({ 
      token: liaraToken || liaraData?.token || "", 
      provider: "liara",
      workspaceId: liaraWorkspaceId || liaraData?.workspaceId || "",
      isActive: checked 
    });
  };

  useEffect(() => {
    if (aiTokenData) {
      const geminiSettings = aiTokenData.find(s => s.provider === "gemini");
      const liaraSettings = aiTokenData.find(s => s.provider === "liara");
      
      if (geminiSettings) {
        setGeminiToken(geminiSettings.token);
        setGeminiModel(geminiSettings.model || "gemini-1.5-flash");
        setGeminiActive(geminiSettings.isActive);
      }
      
      if (liaraSettings) {
        setLiaraToken(liaraSettings.token);
        setLiaraWorkspaceId(liaraSettings.workspaceId || "");
        setLiaraActive(liaraSettings.isActive);
      }
    }
  }, [aiTokenData]);

  return (
    <DashboardLayout title="تنظیمات هوش مصنوعی">
      <div className="space-y-6 text-right" dir="rtl" data-testid="page-ai-token">
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="p-8 text-center">در حال بارگذاری...</div>
            ) : (
              <Tabs defaultValue="gemini" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="gemini">
                    Gemini AI
                    {geminiActive && <span className="mr-2 text-green-500">●</span>}
                  </TabsTrigger>
                  <TabsTrigger value="liara">
                    Liara AI
                    {liaraActive && <span className="mr-2 text-green-500">●</span>}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="gemini" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Key className="w-5 h-5 ml-2" />
                          تنظیمات Gemini AI
                        </div>
                        <div className="flex items-center gap-2" dir="ltr">
                          <Switch
                            id="gemini-status"
                            checked={geminiActive}
                            onCheckedChange={handleToggleGemini}
                            data-testid="switch-gemini-status"
                            className="data-[state=checked]:bg-primary [&>span]:data-[state=checked]:translate-x-5 [&>span]:data-[state=unchecked]:translate-x-0"
                          />
                          <Label htmlFor="gemini-status" className="text-sm text-muted-foreground" dir="rtl">
                            {geminiActive ? "فعال" : "غیرفعال"}
                          </Label>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSaveGeminiToken} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="geminiToken">توکن Gemini API</Label>
                          <div className="relative">
                            <Input
                              id="geminiToken"
                              type={showGeminiToken ? "text" : "password"}
                              value={geminiToken}
                              onChange={(e) => setGeminiToken(e.target.value)}
                              placeholder="توکن Gemini AI خود را وارد کنید..."
                              className="pl-10"
                              data-testid="input-gemini-token"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute left-2 top-1/2 transform -translate-y-1/2"
                              onClick={() => setShowGeminiToken(!showGeminiToken)}
                              data-testid="button-toggle-gemini-visibility"
                            >
                              {showGeminiToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="geminiModel">مدل Gemini</Label>
                          <Select value={geminiModel} onValueChange={setGeminiModel}>
                            <SelectTrigger data-testid="select-gemini-model">
                              <SelectValue placeholder="انتخاب مدل..." />
                            </SelectTrigger>
                            <SelectContent>
                              {GEMINI_MODELS.map((model) => (
                                <SelectItem key={model.value} value={model.value}>
                                  {model.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            مدل 1.5 Flash سهمیه رایگان بیشتری دارد و برای استفاده عمومی پیشنهاد می‌شود.
                          </p>
                        </div>
                        <Button 
                          type="submit" 
                          disabled={saveTokenMutation.isPending}
                          data-testid="button-save-gemini-token"
                        >
                          {saveTokenMutation.isPending ? "در حال ذخیره..." : "ذخیره توکن Gemini"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="liara" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Key className="w-5 h-5 ml-2" />
                          تنظیمات Liara AI
                        </div>
                        <div className="flex items-center gap-2" dir="ltr">
                          <Switch
                            id="liara-status"
                            checked={liaraActive}
                            onCheckedChange={handleToggleLiara}
                            data-testid="switch-liara-status"
                            className="data-[state=checked]:bg-primary [&>span]:data-[state=checked]:translate-x-5 [&>span]:data-[state=unchecked]:translate-x-0"
                          />
                          <Label htmlFor="liara-status" className="text-sm text-muted-foreground" dir="rtl">
                            {liaraActive ? "فعال" : "غیرفعال"}
                          </Label>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSaveLiaraToken} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="liaraWorkspaceId">آدرس Base URL</Label>
                          <Input
                            id="liaraWorkspaceId"
                            type="text"
                            value={liaraWorkspaceId}
                            onChange={(e) => setLiaraWorkspaceId(e.target.value)}
                            placeholder="مثال: https://ai.liara.ir/api/v1/..."
                            dir="ltr"
                            data-testid="input-liara-workspace-id"
                          />
                          <p className="text-xs text-muted-foreground">
                            این آدرس را از پنل لیارا بعد از ساخت سرویس AI دریافت کنید
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="liaraToken">توکن Liara API</Label>
                          <div className="relative">
                            <Input
                              id="liaraToken"
                              type={showLiaraToken ? "text" : "password"}
                              value={liaraToken}
                              onChange={(e) => setLiaraToken(e.target.value)}
                              placeholder="توکن Liara AI خود را وارد کنید..."
                              className="pl-10"
                              data-testid="input-liara-token"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute left-2 top-1/2 transform -translate-y-1/2"
                              onClick={() => setShowLiaraToken(!showLiaraToken)}
                              data-testid="button-toggle-liara-visibility"
                            >
                              {showLiaraToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        <Button 
                          type="submit" 
                          disabled={saveTokenMutation.isPending}
                          data-testid="button-save-liara-token"
                        >
                          {saveTokenMutation.isPending ? "در حال ذخیره..." : "ذخیره توکن Liara"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
