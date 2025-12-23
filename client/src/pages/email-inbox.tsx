import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail, Trash2, ArchiveX, CheckCircle2, Circle } from "lucide-react";
import { createAuthenticatedRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Email {
  id: string;
  sender: string;
  message: string;
  status: string;
  timestamp?: string;
  createdAt?: string;
}

export default function EmailInbox() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  // دریافت لیست ایمیل‌ها
  const { data: emails = [], isLoading, refetch } = useQuery<Email[]>({
    queryKey: ["/api/emails"],
    queryFn: async () => {
      const response = await createAuthenticatedRequest("/api/emails");
      if (!response.ok) return [];
      return response.json();
    },
  });

  // فیلتر ایمیل‌ها بر اساس جستجو
  const filteredEmails = emails.filter(
    (email) =>
      email.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.sender.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // تابع علامت‌گذاری به عنوان خوانده شده
  const markAsRead = async (emailId: string) => {
    await createAuthenticatedRequest(`/api/emails/${emailId}/read`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
    });
    refetch();
  };

  // تابع حذف ایمیل
  const deleteEmail = async (emailId: string) => {
    await createAuthenticatedRequest(`/api/emails/${emailId}`, {
      method: "DELETE",
    });
    setSelectedEmail(null);
    refetch();
  };

  const unreadCount = emails.filter((e) => e.status === "خوانده نشده").length;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-4">
                {unreadCount} خوانده نشده
              </Badge>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="جستجو بر اساس موضوع یا فرستنده..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-right"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email List */}
          <div className="lg:col-span-1 border rounded-lg overflow-hidden bg-card">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                در حال بارگذاری...
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                ایمیلی یافت نشد
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {filteredEmails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => {
                      setSelectedEmail(email);
                      if (email.status === "خوانده نشده") markAsRead(email.id);
                    }}
                    className={cn(
                      "w-full p-4 text-right hover:bg-accent transition-colors border-b",
                      selectedEmail?.id === email.id && "bg-accent",
                      email.status === "خوانده نشده" && "bg-blue-50 dark:bg-blue-950"
                    )}
                  >
                    <div className="flex items-start gap-2 mb-1">
                      {email.status === "خوانده نشده" && (
                        <Circle className="w-2 h-2 fill-blue-500 text-blue-500 mt-2 ml-2" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {email.sender}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {email.message.substring(0, 50)}...
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {new Date(email.createdAt || email.timestamp || Date.now()).toLocaleDateString("fa-IR")}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Email Detail */}
          <div className="lg:col-span-2">
            {selectedEmail ? (
              <div className="border rounded-lg bg-card p-6">
                <div className="mb-6 pb-6 border-b">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">
                        {selectedEmail.sender}
                      </h2>
                      <p className="text-muted-foreground mb-2">
                        از: {selectedEmail.sender}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedEmail.createdAt || selectedEmail.timestamp || Date.now()).toLocaleString(
                          "fa-IR"
                        )}
                      </p>
                      {selectedEmail.status && (
                        <Badge variant={selectedEmail.status === "خوانده شده" ? "secondary" : "default"} className="mt-2">
                          {selectedEmail.status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(selectedEmail.id)}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteEmail(selectedEmail.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Email Body */}
                <div className="prose max-w-none dark:prose-invert">
                  <div
                    className="text-right whitespace-pre-wrap"
                    style={{ direction: "rtl" }}
                  >
                    {selectedEmail.message}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border rounded-lg bg-card p-6 h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>یک ایمیل را انتخاب کنید</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
