import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { createAuthenticatedRequest } from "@/lib/auth";
import { Puzzle, Plus, Trash2, MessageCircle, Settings, Loader2 } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface Plugin {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  icon: string;
  isEnabled: boolean;
  isBuiltIn: boolean;
  createdAt: string;
}

export default function PluginsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPlugin, setNewPlugin] = useState({
    name: "",
    displayName: "",
    description: "",
    icon: "Puzzle",
  });

  const { data: plugins = [], isLoading } = useQuery<Plugin[]>({
    queryKey: ["/api/admin/plugins"],
    queryFn: async () => {
      const response = await createAuthenticatedRequest("/api/admin/plugins");
      if (!response.ok) throw new Error("Failed to fetch plugins");
      return response.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await createAuthenticatedRequest(`/api/admin/plugins/${id}/toggle`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Failed to toggle plugin");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plugins"] });
      // آپدیت فوری وضعیت پلاگین در sidebar
      if (data?.name) {
        queryClient.invalidateQueries({ queryKey: [`/api/plugins/${data.name}/status`] });
      }
      // برای اطمینان همه پلاگین‌ها رو آپدیت کن
      queryClient.invalidateQueries({ queryKey: ["/api/plugins/whatsapp/status"] });
      toast({ title: "وضعیت پلاگین تغییر کرد" });
    },
    onError: () => {
      toast({ title: "خطا در تغییر وضعیت پلاگین", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (plugin: typeof newPlugin) => {
      const response = await createAuthenticatedRequest("/api/admin/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plugin),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create plugin");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plugins"] });
      toast({ title: "پلاگین با موفقیت ایجاد شد" });
      setIsAddDialogOpen(false);
      setNewPlugin({ name: "", displayName: "", description: "", icon: "Puzzle" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "خطا در ایجاد پلاگین", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await createAuthenticatedRequest(`/api/admin/plugins/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete plugin");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plugins"] });
      toast({ title: "پلاگین با موفقیت حذف شد" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "خطا در حذف پلاگین", variant: "destructive" });
    },
  });

  const getIconComponent = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className="w-8 h-8" /> : <Puzzle className="w-8 h-8" />;
  };

  if (isLoading) {
    return (
      <DashboardLayout title="مدیریت پلاگین‌ها">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="مدیریت پلاگین‌ها">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">پلاگین‌ها</h2>
            <p className="text-muted-foreground">مدیریت و کنترل پلاگین‌های سیستم</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 ml-2" />
                افزودن پلاگین
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>افزودن پلاگین جدید</DialogTitle>
                <DialogDescription>
                  اطلاعات پلاگین جدید را وارد کنید
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">شناسه (انگلیسی)</Label>
                  <Input
                    id="name"
                    placeholder="my-plugin"
                    value={newPlugin.name}
                    onChange={(e) => setNewPlugin({ ...newPlugin, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">نام نمایشی</Label>
                  <Input
                    id="displayName"
                    placeholder="پلاگین من"
                    value={newPlugin.displayName}
                    onChange={(e) => setNewPlugin({ ...newPlugin, displayName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">توضیحات</Label>
                  <Textarea
                    id="description"
                    placeholder="توضیحات پلاگین..."
                    value={newPlugin.description}
                    onChange={(e) => setNewPlugin({ ...newPlugin, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">آیکون (Lucide)</Label>
                  <Input
                    id="icon"
                    placeholder="Puzzle"
                    value={newPlugin.icon}
                    onChange={(e) => setNewPlugin({ ...newPlugin, icon: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    نام آیکون از کتابخانه Lucide مثل: Settings, MessageCircle, Puzzle
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  انصراف
                </Button>
                <Button
                  onClick={() => createMutation.mutate(newPlugin)}
                  disabled={createMutation.isPending || !newPlugin.name || !newPlugin.displayName}
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "ایجاد"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col gap-3">
          {plugins.map((plugin) => (
            <Card key={plugin.id} className={`relative ${!plugin.isEnabled ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-3 p-4">
                <div className={`p-2 rounded-lg ${plugin.isEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {getIconComponent(plugin.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm">{plugin.displayName}</h3>
                    <span className="text-xs text-muted-foreground">
                      ({plugin.isBuiltIn ? "پیش‌فرض" : "سفارشی"})
                    </span>
                  </div>
                  {plugin.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {plugin.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${plugin.isEnabled ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"}`}>
                    {plugin.isEnabled ? "فعال" : "غیرفعال"}
                  </span>
                  {!plugin.isBuiltIn && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(plugin.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Switch
                    checked={plugin.isEnabled}
                    onCheckedChange={() => toggleMutation.mutate(plugin.id)}
                    disabled={toggleMutation.isPending}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {plugins.length === 0 && (
          <div className="text-center py-12">
            <Puzzle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">هیچ پلاگینی وجود ندارد</h3>
            <p className="text-muted-foreground">برای شروع یک پلاگین جدید اضافه کنید</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
