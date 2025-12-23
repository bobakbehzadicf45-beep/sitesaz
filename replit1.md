# Overview

**Ariya Bot** is an intelligent 24/7 customer support assistant and a modern, full-stack TypeScript Persian e-commerce platform. It aims to transform customer communication and streamline online business management, offering features from automated customer interactions to order processing. The project provides a comprehensive web application built for the Persian market, including intelligent customer support, e-commerce, user management, ticketing, inventory control, and subscription services with role-based access. It features a fully localized Farsi UI with RTL support, a responsive mobile-first design, and AI-powered functionalities like smart ordering and WhatsApp-based deposit receipt processing, enhancing user experience through advanced AI and robust system architecture.

# Recent Changes

**December 19, 2025**: Implemented email inbox and SMTP server integration
- Added SMTP server listening on port 2525 for receiving emails
- Created email management API endpoints (GET, POST, PUT, DELETE)
- Updated email-inbox component to display real emails from database
- Emails stored in receivedMessages table with proper status tracking
- Added test email endpoint for quick testing
- Fixed Postfix installation and SMTP receiver service
- Email support for authenticated users with proper authorization

**December 19, 2024**: Added Email plugin and fixed duplicate menu items
- Created "email" as a built-in plugin with Mail icon
- Email plugin initialized with displayName "ایمیل" and description "مدیریت و ارسال ایمیل‌ها، تنظیمات SMTP و نمونه‌های ایمیل"
- Removed email from admin settings menu (only exists as a plugin)
- Fixed duplicate menu rendering in sidebar - removed redundant "تنظیمات فروشگاه" section that was showing menu items twice
- Sidebar now has unified "تنظیمات" menu for admin and user_level_1 roles

**December 13, 2024**: Converted crypto-transactions and guest-chats pages to plugins
- Added crypto-transactions and guest-chats as built-in plugins (can be toggled on/off from admin plugins page)
- Created PluginAwareAdminRoute wrapper in App.tsx for plugin-gated routes
- Sidebar conditionally shows/hides menu items based on plugin status
- Home page landing page conditionally shows/hides guest chat widget based on plugin status
- Both plugins default to enabled but can be toggled by admin

**December 12, 2024**: Fresh GitHub import successfully configured for Replit environment
- Installed all npm dependencies (642 packages)
- Created PostgreSQL database and pushed schema using Drizzle
- Configured workflow "Start application" to run on port 5000 with webview
- Set up deployment configuration for autoscale deployment (build: npm run build, run: npm start)
- Verified Vite configuration with allowedHosts: true and proper HMR settings for Replit proxy
- Application running successfully with test data (admin, test seller, products, categories)
- All services initialized: AI service, crypto price cache, WhatsApp service, cleanup service

# User Preferences

Preferred communication style: Simple, everyday language in Farsi.

# System Architecture

## UI/UX Decisions
- **Frontend**: React 18 with TypeScript and Vite.
- **Components & Styling**: shadcn/ui (Radix UI-based) and Tailwind CSS, utilizing Vazirmatn font for Persian script and RTL support.
- **Responsiveness**: Mobile-first design with a hamburger menu and drawer for mobile, and a fixed sidebar for desktop.
- **Design Elements**: Compact card layouts, auto-sliding carousels, dynamic notifications, and Persian invoice templates with currency conversion.

## Technical Implementations
- **Backend**: Node.js with Express.js, TypeScript, and ES modules.
- **API**: RESTful, JSON-based.
- **Authentication**: JWT with bcrypt hashing and role-based access control (admin, user_level_1, user_level_2).
- **File Management**: Multer for uploads, local storage for images, Puppeteer for HTML-to-image invoice generation.
- **Data Storage**: PostgreSQL with Drizzle ORM, Neon Database for serverless hosting, Drizzle Kit for migrations, and connect-pg-simple for session storage.
- **Email System**: SMTP server listening on port 2525 for receiving emails, integrated with database for persistent storage.

## Feature Specifications
- **WhatsApp Integration**: AI-powered OCR for deposit receipts (Gemini Vision), smart product ordering, duplicate transaction detection, automated notifications, and invoice delivery. Includes an intelligent, rate-limited queue system.
- **Internal Chat**: Real-time unread message badges with role-based visibility.
- **Order Management**: Enhanced order display, new order notifications, unshipped orders dashboard, and automatic invoice generation.
- **Transaction Management**: Duplicate transaction detection and automated WhatsApp notifications.
- **Shipping Management**: Configurable shipping methods for sellers, with buyer selection.
- **VAT Management**: Seller-configurable VAT with customizable percentage, toggle, and invoice thank you message.
- **Password Reset**: Secure OTP-based recovery via WhatsApp with rate limiting.
- **Cart Page Redesign**: Responsive two-column layout for product details and order summary.
- **Automatic Order Processing**: Processes pending orders chronologically upon deposit transaction approval.
- **Database Backup & Restore**: Full PostgreSQL backup and restore system for admins, including download, deletion, and path traversal protection.
- **Blockchain Settings Management**: Centralized blockchain API token management system via admin UI for Cardano, Tron, Ripple, with runtime token reload and environment variable fallback.
- **Cardano Integration**: Cardanoscan API integration for transaction history retrieval, pagination, ADA amount formatting, and direct links to explorer.
- **Cryptocurrency Price Tracking**: Real-time scraping-based price retrieval from TGJU.org for Tron, USDT, Ripple, Cardano, stored in Rial, with frontend auto-refresh and validation ranges.
- **Vitrin AI Chat Redesign**: New mobile-only storefront design with AI chat functionality (Gemini AI), product display, and shopping cart tabs. Includes intelligent context for AI chat.
- **Personal Storefront (Vitrin)**: Public storefront pages (`/vitrin/:username`) for Level 1 sellers to display products, with seller-configurable settings.
- **Auto-Save Crypto Transactions**: System to automatically save cryptocurrency transaction details for orders.
- **Guest Chat System**: Chat system for non-member visitors on the home page, with admin management.
- **New Homepage**: Modern landing page with Framer Motion animations and news carousel.
- **Email Inbox**: Real email receiving system via SMTP server, database storage, and web UI for viewing and managing emails.

## System Design Choices
- **AI Architecture**: Dual AI provider system (Gemini AI, Liara AI) with an AI Service Orchestrator for centralized management and automatic failover.
- **Development & Deployment**: Vite for frontend bundling; Express serves static assets. Configured for VM deployment.
- **Security**: JWT_SECRET and ADMIN_PASSWORD managed via Replit Secrets.
- **Email System**: SMTP server on port 2525 for development, with mailparser for email parsing and database integration.

## Replit Environment Setup

### Database
- PostgreSQL database is automatically provisioned via Replit
- DATABASE_URL is automatically set in secrets
- Schema is managed via Drizzle ORM
- Run `npm run db:push` to sync schema changes

### Default Credentials (Development)
- Admin username: `ehsan`
- Admin password: `admin123` (can be changed via ADMIN_PASSWORD secret)
- Test seller username: `test_seller`, password: `test123`

### Optional Environment Variables (Secrets)
- `JWT_SECRET`: JWT signing secret (defaults to dev secret in development)
- `ADMIN_PASSWORD`: Admin user password (defaults to "admin123")
- `GEMINI_API_KEY`: Google Gemini AI API key (for AI features)
- `LIARA_API_KEY`: Liara AI API key (alternative AI provider)
- `CARDANOSCAN_API_KEY`: Cardanoscan API key (for Cardano blockchain integration)
- `TRONGRID_API_KEY`: TronGrid API key (for Tron blockchain integration)

### Email System Configuration
- SMTP Server running on port 2525
- Listens on 0.0.0.0 for all interfaces
- Receives emails from external mail clients
- Stores emails in receivedMessages table
- Email format: `sender@domain.com` -> User's inbox
- Test endpoint: POST `/api/test/send-email` (authenticated)

### Running the Application
- Development: `npm run dev` (runs on port 5000)
- Production build: `npm run build`
- Production start: `npm start`

### Deployment
- Configured for autoscale deployment on Replit
- Build command: `npm run build`
- Run command: `npm start`
- Serves on port 5000 (auto-configured via PORT env var)

# External Dependencies

## Core Frameworks
- React 18, React Hook Form, TanStack Query, Wouter, Vite.

## UI & Styling
- Radix UI, shadcn/ui, Tailwind CSS, PostCSS, Lucide React, Google Fonts.

## Backend Services
- Express.js, Drizzle ORM, Multer, jsonwebtoken, bcrypt, Puppeteer.

## Email Services
- SMTP Server, mailparser

## AI Services
- Gemini AI
- Liara AI (OpenAI-compatible)

## Database & Storage
- Neon Database (PostgreSQL), Drizzle Kit.

## Blockchain Services
- Cardanoscan API
- TGJU.org (for cryptocurrency price scraping)
