import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createAuthenticatedRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Mail, FileText } from "lucide-react";

interface SentMessage {
  id: string;
  userId?: string;
  to: string;
  subject: string;
  body?: string;
  timestamp?: string;
  status?: string;
  attachments?: string[];
}

export default function SentMessages() {
  const [selected, setSelected] = useState<SentMessage | null>(null);

  const { data: items = [], isLoading, refetch } = useQuery<SentMessage[]>({
    queryKey: ["/api/sent-messages"],
    queryFn: async () => {
      const res = await createAuthenticatedRequest('/api/sent-messages');
      if (!res.ok) return [];
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">پیام‌های ارسالی</h1>
            <p className="text-sm text-muted-foreground">فهرست ایمیل‌هایی که از سیستم ارسال شده‌اند</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 border rounded-lg overflow-hidden bg-card">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">در حال بارگذاری...</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">هیچ پیامی پیدا نشد</div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {items.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m)}
                    className={cn(
                      "w-full p-4 text-right hover:bg-accent transition-colors border-b",
                      selected?.id === m.id && "bg-accent"
                    )}
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{m.to}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.subject || '(بدون موضوع)'}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-right">{new Date(m.timestamp || Date.now()).toLocaleString('fa-IR')}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            {selected ? (
              <div className="border rounded-lg bg-card p-6">
                <div className="mb-6 pb-6 border-b flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{selected.subject || 'بدون موضوع'}</h2>
                    <p className="text-sm text-muted-foreground">به: {selected.to}</p>
                    <p className="text-xs mt-2 text-muted-foreground">{new Date(selected.timestamp || Date.now()).toLocaleString('fa-IR')}</p>
                    {selected.status && <Badge className="mt-2">{selected.status}</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard?.writeText(selected.id); }}>
                      شناسه
                    </Button>
                  </div>
                </div>

                <div className="prose max-w-none dark:prose-invert">
                  <div className="text-right whitespace-pre-wrap" style={{ direction: 'rtl' }}>
                    {selected.body || 'متن پیام موجود نیست.'}
                  </div>

                  {selected.attachments && selected.attachments.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-medium">پیوست‌ها</h3>
                      <ul className="list-disc list-inside text-sm mt-2">
                        {selected.attachments.map((a, i) => (
                          <li key={i} className="truncate"><a href={a} target="_blank" rel="noreferrer" className="text-primary">{a}</a></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="border rounded-lg bg-card p-6 h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>یک پیام ارسالی را انتخاب کنید</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
