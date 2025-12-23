import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { PersianDatePicker } from "@/components/persian-date-picker";
import { createAuthenticatedRequest } from "@/lib/auth";
import { CheckCircle, Send, Paperclip, Clock, X } from "lucide-react";

export default function SendEmailPage() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [useSchedule, setUseSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const validateEmail = (email: string) => {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };



  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 5); // limit to 5 attachments
    setAttachments(prev => [...prev, ...arr]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    if (!validateEmail(to)) return setResult({ ok: false, text: 'آدرس گیرنده نامعتبر است' });
    if (!message.trim()) return setResult({ ok: false, text: 'متن پیام نمی‌تواند خالی باشد' });

    setLoading(true);
    try {
      const form = new FormData();
      form.append('to', to.trim());
      form.append('subject', subject);
      form.append('message', message);
      if (useSchedule && scheduledAt) form.append('scheduledAt', scheduledAt);
      attachments.forEach((f) => form.append('attachments', f));

      const res = await createAuthenticatedRequest('/api/emails/send', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'خطا در ارسال');

      setResult({ ok: true, text: 'ایمیل با موفقیت ارسال شد' });
      setTo(''); setCc(''); setBcc(''); setSubject(''); setMessage(''); setAttachments([]);
      setTo(''); setSubject(''); setMessage(''); setAttachments([]);
    } catch (err: any) {
      setResult({ ok: false, text: err?.message || 'خطا در ارسال ایمیل' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* هدر حذف شد */}

        <Card className="p-6">
          <form onSubmit={send} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 space-y-4">
              <div>
                <Label htmlFor="to">به (To)</Label>
                <Input id="to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@example.com" className="mt-1" aria-invalid={!validateEmail(to)} />
              </div>

              {/* فیلدهای cc و bcc حذف شدند */}

              <div>
                <Label htmlFor="subject">موضوع</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="موضوع ایمیل" className="mt-1" />
              </div>

              <div>
                <Label htmlFor="message">متن پیام</Label>
                <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="متن پیام..." rows={12} className="mt-1" />
              </div>

              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  <input type="file" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" id="attachments" />
                  <Button asChild variant="outline"><label htmlFor="attachments" className="cursor-pointer">پیوست اضافه کن</label></Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {attachments.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1 border rounded-md text-sm">
                      <span>{f.name}</span>
                      <button type="button" onClick={() => removeAttachment(i)} aria-label={`حذف ${f.name}`}>
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={loading} className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    {loading ? 'در حال ارسال...' : 'ارسال ایمیل'}
                  </Button>
                  <Button variant="ghost" onClick={() => { setTo(''); setSubject(''); setMessage(''); setAttachments([]); }}>پاک کردن</Button>
                </div>

                <div className="flex items-center gap-4">
                  <Clock className="w-4 h-4" />
                  <div className="text-sm">زمان‌بندی ارسال</div>
                  <Switch checked={useSchedule} onCheckedChange={(v: any) => setUseSchedule(Boolean(v))} />
                </div>
              </div>

              {useSchedule && (
                <div className="mt-2">
                  <Label>انتخاب تاریخ و زمان</Label>
                  <div className="mt-1">
                    <PersianDatePicker value={scheduledAt} onChange={(v) => setScheduledAt(v)} placeholder="تاریخ را انتخاب کنید" />
                  </div>
                </div>
              )}

              {result && (
                <div className={`mt-4 p-3 rounded-md ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {result.ok ? <span className="inline-flex items-center gap-2"><CheckCircle className="w-5 h-5"/>{result.text}</span> : result.text}
                </div>
              )}
            </section>

            <aside className="lg:col-span-1 space-y-4">
              <div className="p-4 border rounded-md bg-muted">
                <div className="text-sm font-medium">راهنمای ارسال</div>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li>از آدرس‌های معتبر استفاده کنید.</li>
                  <li>حداکثر ۵ فایل پیوست قابل انتخاب است.</li>
                  <li>ارسال زمان‌بندی‌شده نگه‌داری در صف لازم دارد.</li>
                </ul>
              </div>

              <div className="p-4 border rounded-md">
                <div className="text-sm font-medium">پیش‌نمایش سریع</div>
                <div className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                  {subject ? `موضوع: ${subject}\n\n` : ''}{message || 'متن پیام در اینجا نمایش داده می‌شود...'}
                </div>
              </div>
            </aside>
          </form>
        </Card>
      </div>
    </div>
  );
}
