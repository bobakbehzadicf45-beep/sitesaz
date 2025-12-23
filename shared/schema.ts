import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").unique(),
  phone: text("phone").notNull(),
  whatsappNumber: text("whatsapp_number"), // WhatsApp number for automatic registration
  whatsappToken: text("whatsapp_token"), // Individual WhatsApp token for level 1 users
  tronWalletAddress: text("tron_wallet_address"), // TRON wallet address for crypto transactions
  usdtTrc20WalletAddress: text("usdt_trc20_wallet_address"), // USDT (TRC20) wallet address
  rippleWalletAddress: text("ripple_wallet_address"), // Ripple (XRP) wallet address
  cardanoWalletAddress: text("cardano_wallet_address"), // Cardano (ADA) wallet address
  bankCardNumber: text("bank_card_number"), // شماره کارت بانکی (برای کاربران سطح 1)
  bankCardHolderName: text("bank_card_holder_name"), // نام صاحب کارت (برای کاربران سطح 1)
  bankCardApprovalStatus: text("bank_card_approval_status").default("pending"), // pending, approved, rejected
  password: text("password"),
  googleId: text("google_id"),
  role: text("role").notNull().default("user_level_1"), // admin, user_level_1, user_level_2
  parentUserId: varchar("parent_user_id"), // For hierarchical user management - will add reference later
  profilePicture: text("profile_picture"),
  isWhatsappRegistered: boolean("is_whatsapp_registered").notNull().default(false), // Track if user was auto-registered via WhatsApp
  welcomeMessage: text("welcome_message"), // Custom welcome message for WhatsApp auto-registration
  storeName: text("store_name"), // نام فروشگاه برای ویترین شخصی (کاربران سطح 1)
  storeDescription: text("store_description"), // توضیحات فروشگاه
  storeLogo: text("store_logo"), // لوگوی فروشگاه
  createdAt: timestamp("created_at").defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  subject: text("subject").notNull(),
  category: text("category").notNull(),
  priority: text("priority").notNull().default("medium"),
  message: text("message").notNull(),
  status: text("status").notNull().default("unread"), // unread, read, closed
  attachments: text("attachments").array(),
  adminReply: text("admin_reply"),
  adminReplyAt: timestamp("admin_reply_at"),
  lastResponseAt: timestamp("last_response_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  image: text("image"),
  userLevel: text("user_level").notNull(), // user_level_1, user_level_2
  priceBeforeDiscount: decimal("price_before_discount", { precision: 15, scale: 2 }),
  priceAfterDiscount: decimal("price_after_discount", { precision: 15, scale: 2 }),
  duration: text("duration").notNull().default("monthly"), // monthly, yearly
  features: text("features").array().default([]),
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: varchar("category_id").references(() => categories.id),
  image: text("image"),
  quantity: integer("quantity").notNull().default(0),
  priceBeforeDiscount: decimal("price_before_discount", { precision: 15, scale: 2 }).notNull(),
  priceAfterDiscount: decimal("price_after_discount", { precision: 15, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const whatsappSettings = pgTable("whatsapp_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  notifications: text("notifications").array().default([]),
  aiName: text("ai_name").notNull().default("من هوش مصنوعی هستم"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sentMessages = pgTable("sent_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  recipient: text("recipient").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("sent"), // sent, delivered, failed
  timestamp: timestamp("timestamp").defaultNow(),
});

export const receivedMessages = pgTable("received_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  whatsiPlusId: text("whatsiplus_id").notNull(), // شناسه اصلی از WhatsiPlus
  sender: text("sender").notNull(),
  message: text("message").notNull(),
  imageUrl: text("image_url"), // آدرس عکس در صورت وجود
  status: text("status").notNull().default("خوانده نشده"), // خوانده نشده, خوانده شده
  originalDate: text("original_date"), // تاریخ اصلی از WhatsiPlus
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => ({
  // Composite unique constraint on whatsiplus_id and user_id
  whatsiUserUnique: unique("received_messages_whatsi_user_unique").on(table.whatsiPlusId, table.userId),
}));

export const aiTokenSettings = pgTable("ai_token_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull(),
  provider: text("provider").notNull(), // gemini, liara
  workspaceId: text("workspace_id"), // workspace ID for Liara (optional)
  model: text("model"), // model name (e.g. gemini-1.5-flash, gemini-2.0-flash-exp)
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  providerUnique: unique("ai_token_settings_provider_unique").on(table.provider),
}));

export const blockchainSettings = pgTable("blockchain_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull(), // cardano, tron, ripple, etc.
  apiKey: text("api_key").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  metadata: text("metadata"), // JSON string for additional provider-specific settings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  providerUnique: unique("blockchain_settings_provider_unique").on(table.provider),
}));

export const internalChats = pgTable("internal_chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  subscriptionId: varchar("subscription_id").notNull().references(() => subscriptions.id),
  status: text("status").notNull().default("active"), // active, inactive, expired
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date").notNull(),
  remainingDays: integer("remaining_days").notNull().default(0),
  isTrialPeriod: boolean("is_trial_period").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  parentId: varchar("parent_id"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const carts = pgTable("carts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  itemCount: integer("item_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cartId: varchar("cart_id").notNull().references(() => carts.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const addresses = pgTable("addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(), // عنوان آدرس مثل "منزل" یا "محل کار"
  fullAddress: text("full_address").notNull(), // آدرس کامل متنی
  latitude: decimal("latitude", { precision: 10, scale: 7 }), // عرض جغرافیایی
  longitude: decimal("longitude", { precision: 10, scale: 7 }), // طول جغرافیایی
  postalCode: text("postal_code"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id), // کاربر سطح 2 که سفارش داده
  sellerId: varchar("seller_id").notNull().references(() => users.id), // کاربر سطح 1 که فروشنده است
  addressId: varchar("address_id").references(() => addresses.id), // آدرس تحویل
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("awaiting_payment"), // awaiting_payment, pending, confirmed, preparing, shipped, delivered, cancelled
  statusHistory: text("status_history").array().default([]), // تاریخچه تغییر وضعیت
  orderNumber: text("order_number").notNull().unique(), // شماره سفارش منحصر به فرد
  shippingMethod: text("shipping_method"), // روش ارسال: post_pishtaz, post_normal, piyk, free
  notes: text("notes"), // یادداشت‌های کاربر
  paymentStartedAt: timestamp("payment_started_at"), // زمان شروع پرداخت برای تایمر 10 دقیقه‌ای
  selectedCryptoType: text("selected_crypto_type"), // نوع ارز دیجیتال انتخاب شده: TRX, USDT, XRP, ADA
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  orderId: varchar("order_id").references(() => orders.id), // اختیاری - ممکن است واریز مستقل باشد
  type: text("type").notNull(), // deposit, withdraw, order_payment, commission
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  transactionDate: text("transaction_date"), // تاریخ انجام تراکنش
  transactionTime: text("transaction_time"), // ساعت انجام تراکنش
  accountSource: text("account_source"), // از حساب
  paymentMethod: text("payment_method"), // cash, card, bank_transfer, etc.
  referenceId: text("reference_id"), // شماره پیگیری
  // Parent-child deposit approval fields
  initiatorUserId: varchar("initiator_user_id").references(() => users.id), // کاربر فرزند که تراکنش را ایجاد کرده
  parentUserId: varchar("parent_user_id").references(() => users.id), // کاربر والد که باید تایید کند
  approvedByUserId: varchar("approved_by_user_id").references(() => users.id), // کاربر والد که تایید کرده
  approvedAt: timestamp("approved_at"), // زمان تایید
  createdAt: timestamp("created_at").defaultNow(),
});

export const faqs = pgTable("faqs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shippingSettings = pgTable("shipping_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id), // کاربر سطح 1 فروشنده
  postPishtazEnabled: boolean("post_pishtaz_enabled").notNull().default(false),
  postNormalEnabled: boolean("post_normal_enabled").notNull().default(true),
  piykEnabled: boolean("piyk_enabled").notNull().default(true),
  freeShippingEnabled: boolean("free_shipping_enabled").notNull().default(false),
  freeShippingMinAmount: decimal("free_shipping_min_amount", { precision: 15, scale: 2 }), // مبلغ حداقل برای ارسال رایگان
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const passwordResetOtps = pgTable("password_reset_otps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  otp: text("otp").notNull(), // کد 6 رقمی
  isUsed: boolean("is_used").notNull().default(false), // آیا استفاده شده
  expiresAt: timestamp("expires_at").notNull(), // زمان انقضا (5 دقیقه)
  createdAt: timestamp("created_at").defaultNow(),
});

export const vatSettings = pgTable("vat_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id), // کاربر سطح 1 فروشنده
  vatPercentage: decimal("vat_percentage", { precision: 5, scale: 2 }).notNull().default("9"), // درصد ارزش افزوده (پیش‌فرض 9%)
  isEnabled: boolean("is_enabled").notNull().default(false), // فعال/غیرفعال
  companyName: text("company_name"), // نام شرکت
  address: text("address"), // آدرس
  phoneNumber: varchar("phone_number", { length: 20 }), // شماره تلفن ثابت
  nationalId: varchar("national_id", { length: 20 }), // شناسه ملی
  economicCode: varchar("economic_code", { length: 20 }), // کد اقتصادی
  stampImage: text("stamp_image"), // عکس مهر و امضا شرکت
  thankYouMessage: text("thank_you_message").default("از خرید شما متشکریم"), // متن تشکر در فاکتور
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const maintenanceMode = pgTable("maintenance_mode", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  isEnabled: boolean("is_enabled").notNull().default(false), // فعال/غیرفعال
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cryptoPrices = pgTable("crypto_prices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(), // TRX, USDT, XRP, ADA
  priceInRial: decimal("price_in_rial", { precision: 20, scale: 2 }).notNull(), // قیمت به ریال
  priceInToman: decimal("price_in_toman", { precision: 20, scale: 2 }).notNull(), // قیمت به تومان
  fetchedAt: timestamp("fetched_at").notNull(), // زمان دریافت قیمت
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  symbolUnique: unique("crypto_prices_symbol_unique").on(table.symbol),
}));

// Guest Chat Sessions - برای چت کاربران مهمان با ادمین
export const guestChatSessions = pgTable("guest_chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionToken: text("session_token").notNull().unique(), // توکن منحصر به فرد برای session مهمان
  guestName: text("guest_name"), // نام مهمان (اختیاری)
  guestPhone: text("guest_phone"), // شماره تلفن مهمان (اختیاری)
  guestIpAddress: text("guest_ip_address"), // آدرس IP مهمان
  isActive: boolean("is_active").notNull().default(true), // آیا session فعال است
  lastMessageAt: timestamp("last_message_at").defaultNow(), // آخرین پیام
  unreadByAdmin: integer("unread_by_admin").notNull().default(0), // تعداد پیام‌های خوانده نشده توسط ادمین
  unreadByGuest: integer("unread_by_guest").notNull().default(0), // تعداد پیام‌های خوانده نشده توسط مهمان
  createdAt: timestamp("created_at").defaultNow(),
});

// Guest Chat Messages - پیام‌های چت مهمانان
export const guestChatMessages = pgTable("guest_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => guestChatSessions.id),
  message: text("message").notNull(),
  sender: text("sender").notNull(), // 'guest' | 'admin'
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Crypto Transactions - تراکنش‌های ارز دیجیتال
export const cryptoTransactions = pgTable("crypto_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  cryptoType: text("crypto_type").notNull(), // TRX, USDT, XRP, ADA
  cryptoAmount: decimal("crypto_amount", { precision: 20, scale: 8 }).notNull(), // مقدار ارز
  tomanEquivalent: decimal("toman_equivalent", { precision: 15, scale: 2 }).notNull(), // معادل تومان
  transactionDate: text("transaction_date").notNull(), // تاریخ تراکنش
  walletAddress: text("wallet_address"), // آدرس ولت فروشنده
  paymentStatus: text("payment_status").notNull().default("not_paid"), // paid, not_paid
  registeredAt: timestamp("registered_at").defaultNow(), // زمان ثبت
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  email: z.string().email("ایمیل معتبر وارد کنید").optional(),
});

// Schema for level 2 users where email and username are optional (username auto-generated from phone)
export const insertSubUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  email: true, // Remove email from required fields
  username: true, // Remove username from required fields - auto-generated from phone
}).extend({
  email: z.string().email("ایمیل معتبر وارد کنید").optional(), // Make email optional
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  lastResponseAt: true,
  adminReply: true,
  adminReplyAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  isDefault: true, // Prevent clients from setting isDefault
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
}).extend({
  priceBeforeDiscount: z.union([z.string(), z.number()]).transform(val => String(val)),
  priceAfterDiscount: z.union([z.string(), z.number(), z.null()]).transform(val => val === null ? null : String(val)),
});

export const insertWhatsappSettingsSchema = createInsertSchema(whatsappSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertSentMessageSchema = createInsertSchema(sentMessages).omit({
  id: true,
  timestamp: true,
});

export const insertReceivedMessageSchema = createInsertSchema(receivedMessages).omit({
  id: true,
  timestamp: true,
});

export const insertAiTokenSettingsSchema = createInsertSchema(aiTokenSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBlockchainSettingsSchema = createInsertSchema(blockchainSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInternalChatSchema = createInsertSchema(internalChats).omit({
  id: true,
  createdAt: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdBy: true, // Server controls this field
  createdAt: true,
  updatedAt: true,
});

export const insertCartSchema = createInsertSchema(carts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  unitPrice: z.union([z.string(), z.number()]).transform(val => String(val)),
  totalPrice: z.union([z.string(), z.number()]).transform(val => String(val)),
});

export const insertAddressSchema = createInsertSchema(addresses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateAddressSchema = createInsertSchema(addresses).omit({
  id: true,
  userId: true, // منع تغییر مالکیت
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  orderNumber: true, // Server generates this
}).extend({
  totalAmount: z.union([z.string(), z.number()]).transform(val => String(val)),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
  createdAt: true,
}).extend({
  unitPrice: z.union([z.string(), z.number()]).transform(val => String(val)),
  totalPrice: z.union([z.string(), z.number()]).transform(val => String(val)),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.union([z.string(), z.number()]).transform(val => String(val)),
});

export const insertFaqSchema = createInsertSchema(faqs).omit({
  id: true,
  createdBy: true, // Server controls this field
  createdAt: true,
  updatedAt: true,
});

export const updateFaqSchema = createInsertSchema(faqs).omit({
  id: true,
  createdBy: true, // Cannot change creator
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertShippingSettingsSchema = createInsertSchema(shippingSettings).omit({
  id: true,
  userId: true, // Server controls this field
  createdAt: true,
  updatedAt: true,
}).extend({
  freeShippingMinAmount: z.union([z.string(), z.number(), z.null()]).transform(val => val === null ? null : String(val)),
});

export const updateShippingSettingsSchema = createInsertSchema(shippingSettings).omit({
  id: true,
  userId: true, // Cannot change owner
  createdAt: true,
  updatedAt: true,
}).extend({
  freeShippingMinAmount: z.union([z.string(), z.number(), z.null()]).transform(val => val === null ? null : String(val)),
}).partial();

export const insertPasswordResetOtpSchema = createInsertSchema(passwordResetOtps).omit({
  id: true,
  createdAt: true,
});

export const insertVatSettingsSchema = createInsertSchema(vatSettings).omit({
  id: true,
  userId: true, // Server controls this field
  createdAt: true,
  updatedAt: true,
}).extend({
  vatPercentage: z.union([z.string(), z.number()]).transform(val => String(val)),
  companyName: z.string().optional(),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
  nationalId: z.string().optional(),
  economicCode: z.string().optional(),
}).refine((data) => {
  // اگر ارزش افزوده فعال باشد، باید تمام فیلدها پر شوند
  if (data.isEnabled) {
    return !!(data.companyName && data.address && data.phoneNumber && data.nationalId && data.economicCode);
  }
  return true;
}, {
  message: "هنگام فعال‌سازی ارزش افزوده، تمام فیلدهای اطلاعات شرکت باید پر شوند",
});

export const updateVatSettingsSchema = createInsertSchema(vatSettings).omit({
  id: true,
  userId: true, // Cannot change owner
  createdAt: true,
  updatedAt: true,
}).extend({
  vatPercentage: z.union([z.string(), z.number()]).transform(val => String(val)),
  companyName: z.string().optional(),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
  nationalId: z.string().optional(),
  economicCode: z.string().optional(),
}).partial().refine((data) => {
  // اگر ارزش افزوده فعال باشد، باید تمام فیلدها پر شوند
  if (data.isEnabled) {
    return !!(data.companyName && data.address && data.phoneNumber && data.nationalId && data.economicCode);
  }
  return true;
}, {
  message: "هنگام فعال‌سازی ارزش افزوده، تمام فیلدهای اطلاعات شرکت باید پر شوند",
});

export const updateCategoryOrderSchema = z.object({
  categoryId: z.string().uuid(),
  newOrder: z.number().int().min(0),
  newParentId: z.string().uuid().nullable().optional(),
});

// Ticket reply validation schema
export const ticketReplySchema = z.object({
  message: z.string().min(1, "پیام نمی‌تواند خالی باشد").max(1000, "پیام نمی‌تواند بیش از 1000 کاراکتر باشد"),
});

// Reset password validation schema
export const resetPasswordSchema = z.object({
  password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد"),
});

// Guest Chat schemas
export const insertGuestChatSessionSchema = createInsertSchema(guestChatSessions).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
});

export const insertGuestChatMessageSchema = createInsertSchema(guestChatMessages).omit({
  id: true,
  createdAt: true,
});

// Crypto Transactions schema
export const insertCryptoTransactionSchema = createInsertSchema(cryptoTransactions).omit({
  id: true,
  registeredAt: true,
  createdAt: true,
}).extend({
  cryptoAmount: z.union([z.string(), z.number()]).transform(val => String(val)),
  tomanEquivalent: z.union([z.string(), z.number()]).transform(val => String(val)),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type WhatsappSettings = typeof whatsappSettings.$inferSelect;
export type InsertWhatsappSettings = z.infer<typeof insertWhatsappSettingsSchema>;

export type SentMessage = typeof sentMessages.$inferSelect;
export type InsertSentMessage = z.infer<typeof insertSentMessageSchema>;

export type ReceivedMessage = typeof receivedMessages.$inferSelect;
export type InsertReceivedMessage = z.infer<typeof insertReceivedMessageSchema>;

export type AiTokenSettings = typeof aiTokenSettings.$inferSelect;
export type InsertAiTokenSettings = z.infer<typeof insertAiTokenSettingsSchema>;

export type BlockchainSettings = typeof blockchainSettings.$inferSelect;
export type InsertBlockchainSettings = z.infer<typeof insertBlockchainSettingsSchema>;

export type InternalChat = typeof internalChats.$inferSelect;
export type InsertInternalChat = z.infer<typeof insertInternalChatSchema>;

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Cart = typeof carts.$inferSelect;
export type InsertCart = z.infer<typeof insertCartSchema>;

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

export type Address = typeof addresses.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Faq = typeof faqs.$inferSelect;
export type InsertFaq = z.infer<typeof insertFaqSchema>;
export type UpdateFaq = z.infer<typeof updateFaqSchema>;

export type ShippingSettings = typeof shippingSettings.$inferSelect;
export type InsertShippingSettings = z.infer<typeof insertShippingSettingsSchema>;
export type UpdateShippingSettings = z.infer<typeof updateShippingSettingsSchema>;

export type PasswordResetOtp = typeof passwordResetOtps.$inferSelect;
export type InsertPasswordResetOtp = z.infer<typeof insertPasswordResetOtpSchema>;

export type VatSettings = typeof vatSettings.$inferSelect;
export type InsertVatSettings = z.infer<typeof insertVatSettingsSchema>;
export type UpdateVatSettings = z.infer<typeof updateVatSettingsSchema>;

export type CryptoTransaction = typeof cryptoTransactions.$inferSelect;
export type InsertCryptoTransaction = z.infer<typeof insertCryptoTransactionSchema>;

// Content Management for Website
export const contentSections = pgTable("content_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectionKey: text("section_key").notNull().unique(), // e.g., "hero", "features", "pricing", etc.
  title: text("title"),
  subtitle: text("subtitle"),
  description: text("description"),
  content: text("content"), // JSON string for complex content
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContentSectionSchema = createInsertSchema(contentSections);
export const updateContentSectionSchema = createInsertSchema(contentSections).partial().required({ id: true });

export type ContentSection = typeof contentSections.$inferSelect;
export type InsertContentSection = z.infer<typeof insertContentSectionSchema>;
export type UpdateContentSection = z.infer<typeof updateContentSectionSchema>;

// Login Logs for tracking user logins
export const loginLogs = pgTable("login_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  username: text("username").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  loginAt: timestamp("login_at").defaultNow(),
});

export const insertLoginLogSchema = createInsertSchema(loginLogs);

export type LoginLog = typeof loginLogs.$inferSelect;
export type InsertLoginLog = z.infer<typeof insertLoginLogSchema>;

export const insertCryptoPriceSchema = createInsertSchema(cryptoPrices).omit({
  id: true,
  createdAt: true,
}).extend({
  priceInRial: z.union([z.string(), z.number()]).transform(val => String(val)),
  priceInToman: z.union([z.string(), z.number()]).transform(val => String(val)),
});

export type CryptoPrice = typeof cryptoPrices.$inferSelect;
export type InsertCryptoPrice = z.infer<typeof insertCryptoPriceSchema>;

// Guest Chat Types
export type GuestChatSession = typeof guestChatSessions.$inferSelect;
export type InsertGuestChatSession = z.infer<typeof insertGuestChatSessionSchema>;

export type GuestChatMessage = typeof guestChatMessages.$inferSelect;
export type InsertGuestChatMessage = z.infer<typeof insertGuestChatMessageSchema>;

// Project Order Requests - Submissions from homepage popup
export const projectOrderRequests = pgTable("project_order_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"), // pending, reviewed, contacted, completed
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProjectOrderRequestSchema = createInsertSchema(projectOrderRequests).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const updateProjectOrderRequestSchema = createInsertSchema(projectOrderRequests).partial().required({ id: true });

export type ProjectOrderRequest = typeof projectOrderRequests.$inferSelect;
export type InsertProjectOrderRequest = z.infer<typeof insertProjectOrderRequestSchema>;
export type UpdateProjectOrderRequest = z.infer<typeof updateProjectOrderRequestSchema>;

// Emails - For storing received and sent emails
export const emails = pgTable("emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  subject: text("subject").notNull(),
  body: text("body"),
  htmlBody: text("html_body"),
  isRead: boolean("is_read").notNull().default(false),
  isSent: boolean("is_sent").notNull().default(false), // true if sent, false if received
  attachments: text("attachments"), // JSON array of attachment objects
  messageId: text("message_id"), // Email message ID (for threading)
  inReplyTo: text("in_reply_to"), // Message ID of the email this replies to
  receivedAt: timestamp("received_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailSchema = createInsertSchema(emails).omit({
  id: true,
  receivedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const updateEmailSchema = createInsertSchema(emails).partial().required({ id: true });

export type Email = typeof emails.$inferSelect;
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type UpdateEmail = z.infer<typeof updateEmailSchema>;

// Plugins Management - For enabling/disabling features
export const plugins = pgTable("plugins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // Unique identifier for the plugin
  displayName: text("display_name").notNull(), // Persian display name
  description: text("description"), // Plugin description
  icon: text("icon").notNull().default("Puzzle"), // Lucide icon name
  isEnabled: boolean("is_enabled").notNull().default(true), // Plugin status
  isBuiltIn: boolean("is_built_in").notNull().default(false), // Built-in plugins cannot be deleted
  settings: text("settings"), // JSON string for plugin-specific settings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPluginSchema = createInsertSchema(plugins).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updatePluginSchema = createInsertSchema(plugins).partial().required({ id: true });

export type Plugin = typeof plugins.$inferSelect;
export type InsertPlugin = z.infer<typeof insertPluginSchema>;
export type UpdatePlugin = z.infer<typeof updatePluginSchema>;
