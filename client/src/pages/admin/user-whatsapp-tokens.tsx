import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Edit, Save, X, MessageCircle, Calendar, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createAuthenticatedRequest } from "@/lib/auth";
import type { User as UserType } from "@shared/schema";
import moment from "moment-jalaali";

export default function UserWhatsappTokens() {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editToken, setEditToken] = useState("");
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await createAuthenticatedRequest("/api/users");
      if (!response.ok) throw new Error("خطا در دریافت کاربران");
      const allUsers = await response.json();
      return allUsers.filter((user: UserType) => user.role === 'user_level_1');
    },
  });

  const updateTokenMutation = useMutation({
    mutationFn: async ({ userId, token }: { userId: string; token: string }) => {
      const response = await createAuthenticatedRequest(`/api/admin/users/${userId}/whatsapp-token`, {
        method: "PUT",
        body: JSON.stringify({ whatsappToken: token }),
      });
      if (!response.ok) throw new Error("خطا در بروزرسانی توکن");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUserId(null);
      setEditToken("");
      toast({
        title: "✅ موفقیت",
        description: "توکن واتس‌اپ با موفقیت بروزرسانی شد",
      });
    },
    onError: () => {
      toast({
        title: "❌ خطا",
        description: "خطا در بروزرسانی توکن",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (user: UserType) => {
    setEditingUserId(user.id);
    setEditToken(user.whatsappToken || "");
  };

  const handleSave = (userId: string) => {
    updateTokenMutation.mutate({ userId, token: editToken });
  };

  const handleCancel = () => {
    setEditingUserId(null);
    setEditToken("");
  };

  const toggleShowToken = (userId: string) => {
    setShowTokens(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "-";
    return moment(dateString).format('jYYYY/jMM/jDD HH:mm');
  };

  if (isLoading) {
    return (
      <DashboardLayout title="توکن واتس‌اپ کاربران">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="توکن واتس‌اپ کاربران">
      <div className="space-y-4">
        
        <Card>
          <CardContent className="pt-6">
            {users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>هیچ کاربر سطح 1 یافت نشد</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">نام کاربری</TableHead>
                      <TableHead className="text-right">نام و نام خانوادگی</TableHead>
                      <TableHead className="text-right">تاریخ ثبت‌نام</TableHead>
                      <TableHead className="text-right">توکن واتس‌اپ</TableHead>
                      <TableHead className="text-right">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const isEditing = editingUserId === user.id;
                      const showToken = showTokens[user.id];
                      const hasToken = !!user.whatsappToken;

                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              {user.username}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}`
                              : "-"
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-3 h-3" />
                              {formatDate(user.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="relative max-w-xs">
                                <Input
                                  type={showToken ? "text" : "password"}
                                  value={editToken}
                                  onChange={(e) => setEditToken(e.target.value)}
                                  placeholder="توکن واتس‌اپ"
                                  className="pr-8 text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleShowToken(user.id)}
                                  className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="relative max-w-xs flex-1">
                                  <Input
                                    type={showToken ? "text" : "password"}
                                    value={user.whatsappToken || ""}
                                    readOnly
                                    disabled
                                    placeholder="تنظیم نشده"
                                    className="pr-8 text-sm bg-gray-50"
                                  />
                                  {hasToken && (
                                    <button
                                      type="button"
                                      onClick={() => toggleShowToken(user.id)}
                                      className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                  )}
                                </div>
                                {!hasToken && (
                                  <Badge variant="secondary" className="text-xs">
                                    بدون توکن
                                  </Badge>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSave(user.id)}
                                  disabled={updateTokenMutation.isPending}
                                  className="h-8"
                                >
                                  <Save className="w-3 h-3 ml-1" />
                                  ذخیره
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancel}
                                  disabled={updateTokenMutation.isPending}
                                  className="h-8"
                                >
                                  <X className="w-3 h-3 ml-1" />
                                  لغو
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(user)}
                                className="h-8"
                              >
                                <Edit className="w-3 h-3 ml-1" />
                                ویرایش
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
