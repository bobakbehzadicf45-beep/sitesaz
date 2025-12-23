# راهنمای نصب Ariya Bot روی سرور اوبونتو

## پیش‌نیازها

- سرور با سیستم‌عامل Ubuntu 20.04 یا بالاتر
- دسترسی root یا sudo
- حداقل 2GB RAM
- حداقل 10GB فضای دیسک
- اتصال اینترنت

## نصب خودکار

### روش 1: اجرای مستقیم

```bash
# کپی فایل‌های پروژه به سرور
scp -r ./* user@your-server:/opt/ariyabot/

# اتصال به سرور
ssh user@your-server

# رفتن به پوشه پروژه
cd /opt/ariyabot

# اجرای اسکریپت نصب
sudo python3 install.py
```

### روش 2: با تعیین دامنه

```bash
sudo DOMAIN=yourdomain.com python3 install.py
```

## نصب دستی

اگر ترجیح می‌دهید نصب را به صورت دستی انجام دهید:

### 1. به‌روزرسانی سیستم

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. نصب Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3. نصب PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 4. ایجاد دیتابیس

```bash
sudo -u postgres psql
```

در محیط PostgreSQL:

```sql
CREATE USER ariyabot WITH PASSWORD 'your_password';
CREATE DATABASE ariyabot OWNER ariyabot;
GRANT ALL PRIVILEGES ON DATABASE ariyabot TO ariyabot;
\q
```

### 5. پیکربندی برنامه

```bash
cd /opt/ariyabot
cp .env.example .env
nano .env
```

محتوای فایل `.env`:

```env
DATABASE_URL=postgresql://ariyabot:your_password@localhost:5432/ariyabot
PGHOST=localhost
PGPORT=5432
PGUSER=ariyabot
PGPASSWORD=your_password
PGDATABASE=ariyabot
NODE_ENV=production
PORT=5000
JWT_SECRET=your_64_char_secret
SESSION_SECRET=your_64_char_secret
ADMIN_PASSWORD=admin123
```

### 6. نصب وابستگی‌ها و ساخت

```bash
npm install
npm run db:push
npm run build
```

### 7. ایجاد سرویس systemd

```bash
sudo nano /etc/systemd/system/ariyabot.service
```

محتوا:

```ini
[Unit]
Description=Ariya Bot
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/ariyabot
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
EnvironmentFile=/opt/ariyabot/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable ariyabot
sudo systemctl start ariyabot
```

### 8. پیکربندی Nginx

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/ariyabot
```

محتوا:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ariyabot /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 9. فعال‌سازی SSL (اختیاری ولی توصیه‌شده)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## دستورات مفید

```bash
# وضعیت سرویس
sudo systemctl status ariyabot

# ریستارت سرویس
sudo systemctl restart ariyabot

# مشاهده لاگ‌ها
sudo journalctl -u ariyabot -f

# متوقف کردن سرویس
sudo systemctl stop ariyabot
```

## اطلاعات پیش‌فرض

| مورد | مقدار |
|------|-------|
| پورت | 5000 |
| نام کاربری ادمین | ehsan |
| رمز عبور ادمین | admin123 |
| فروشنده تست | test_seller / test123 |

## تنظیمات اختیاری

### هوش مصنوعی

برای فعال‌سازی AI:
1. وارد پنل ادمین شوید
2. به تنظیمات هوش مصنوعی بروید
3. Gemini یا Liara را پیکربندی کنید

### بلاکچین

برای فعال‌سازی تراکنش‌های کریپتو:
- CARDANOSCAN_API_KEY
- TRONGRID_API_KEY

## عیب‌یابی

### سرویس کار نمی‌کند

```bash
sudo journalctl -u ariyabot -n 100
```

### مشکل دیتابیس

```bash
sudo -u postgres psql -c "SELECT 1;"
```

### مشکل Nginx

```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

## پشتیبان‌گیری

### دیتابیس

```bash
pg_dump -U ariyabot -h localhost ariyabot > backup.sql
```

### بازیابی

```bash
psql -U ariyabot -h localhost ariyabot < backup.sql
```

## به‌روزرسانی

```bash
cd /opt/ariyabot
git pull
npm install
npm run build
sudo systemctl restart ariyabot
```

## پشتیبانی

برای سوالات و مشکلات، یک Issue در GitHub ایجاد کنید.
