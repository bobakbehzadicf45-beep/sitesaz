#!/usr/bin/env python3
"""
اسکریپت نصب خودکار Ariya Bot
نصب و راه‌اندازی کامل سایت روی سرور اوبونتو
"""

import os
import sys
import subprocess
import secrets
import string
import shutil
from pathlib import Path

class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header():
    print(f"""
{Colors.CYAN}{Colors.BOLD}
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                    🚀 Ariya Bot Installer                     ║
║                                                               ║
║        نصب و راه‌اندازی خودکار سایت روی اوبونتو                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
{Colors.RESET}
""")

def log_info(message):
    print(f"{Colors.BLUE}[INFO]{Colors.RESET} {message}")

def log_success(message):
    print(f"{Colors.GREEN}[✓]{Colors.RESET} {message}")

def log_warning(message):
    print(f"{Colors.YELLOW}[!]{Colors.RESET} {message}")

def log_error(message):
    print(f"{Colors.RED}[✗]{Colors.RESET} {message}")

def run_command(command, description="", check=True, capture_output=False):
    if description:
        log_info(description)
    try:
        result = subprocess.run(
            command,
            shell=True,
            check=check,
            capture_output=capture_output,
            text=True
        )
        return result
    except subprocess.CalledProcessError as e:
        log_error(f"خطا در اجرای دستور: {command}")
        if e.stderr:
            print(e.stderr)
        if check:
            sys.exit(1)
        return e

def generate_secret(length=64):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def check_root():
    if os.geteuid() != 0:
        log_error("این اسکریپت باید با دسترسی root اجرا شود!")
        log_info("لطفاً دستور زیر را اجرا کنید:")
        print(f"  sudo python3 {sys.argv[0]}")
        sys.exit(1)

def get_ubuntu_version():
    try:
        with open('/etc/os-release') as f:
            for line in f:
                if line.startswith('VERSION_ID'):
                    return line.split('=')[1].strip().strip('"')
    except:
        return None

def install_system_dependencies():
    log_info("نصب پیش‌نیازهای سیستم...")
    
    run_command("apt-get update -y", "به‌روزرسانی لیست پکیج‌ها...")
    
    core_packages = [
        "curl",
        "wget",
        "git",
        "build-essential",
        "ca-certificates",
        "gnupg",
        "nginx",
        "certbot",
        "python3-certbot-nginx",
        "ufw",
        "htop",
        "nano",
        "unzip",
        "fonts-liberation",
        "xdg-utils",
    ]
    
    run_command(
        f"apt-get install -y {' '.join(core_packages)}",
        "نصب پکیج‌های اصلی..."
    )
    
    optional_packages = [
        "lsb-release",
        "software-properties-common",
        "libgconf-2-4",
        "libatk1.0-0",
        "libatk-bridge2.0-0",
        "libgdk-pixbuf-2.0-0",
        "libgdk-pixbuf2.0-0",
        "libgtk-3-0",
        "libgbm-dev",
        "libgbm1",
        "libnss3-dev",
        "libnss3",
        "libxss1",
        "libasound2",
        "libasound2t64",
        "libappindicator3-1",
        "libayatana-appindicator3-1",
    ]
    
    log_info("نصب پکیج‌های اختیاری (برای Puppeteer)...")
    for pkg in optional_packages:
        result = run_command(f"apt-get install -y {pkg}", check=False, capture_output=True)
        if result.returncode == 0:
            log_success(f"پکیج {pkg} نصب شد")
    
    log_success("پیش‌نیازهای سیستم نصب شدند")

def install_nodejs():
    log_info("نصب Node.js 20...")
    
    result = run_command("node --version", check=False, capture_output=True)
    if result.returncode == 0 and "v20" in result.stdout:
        log_success("Node.js 20 از قبل نصب است")
        return
    
    run_command(
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
        "افزودن مخزن Node.js..."
    )
    run_command("apt-get install -y nodejs", "نصب Node.js...")
    
    log_success("Node.js نصب شد")
    run_command("node --version")
    run_command("npm --version")

def install_postgresql():
    log_info("نصب PostgreSQL...")
    
    result = run_command("systemctl is-active postgresql", check=False, capture_output=True)
    if result.returncode == 0:
        log_success("PostgreSQL از قبل نصب و فعال است")
        return
    
    run_command("apt-get install -y postgresql postgresql-contrib", "نصب PostgreSQL...")
    run_command("systemctl start postgresql", "راه‌اندازی PostgreSQL...")
    run_command("systemctl enable postgresql", "فعال‌سازی اتوماتیک PostgreSQL...")
    
    log_success("PostgreSQL نصب و راه‌اندازی شد")

def setup_database(config):
    log_info("ایجاد دیتابیس و کاربر...")
    
    db_name = config['db_name']
    db_user = config['db_user']
    db_password = config['db_password']
    
    commands = [
        f"DROP DATABASE IF EXISTS {db_name};",
        f"DROP USER IF EXISTS {db_user};",
        f"CREATE USER {db_user} WITH PASSWORD '{db_password}';",
        f"CREATE DATABASE {db_name} OWNER {db_user};",
        f"GRANT ALL PRIVILEGES ON DATABASE {db_name} TO {db_user};",
    ]
    
    for cmd in commands:
        run_command(f'sudo -u postgres psql -c "{cmd}"', check=False)
    
    log_success(f"دیتابیس {db_name} ایجاد شد")

def install_app_dependencies(app_dir):
    log_info("نصب وابستگی‌های برنامه...")
    
    os.chdir(app_dir)
    run_command("npm install", "نصب پکیج‌های npm...")
    
    log_success("وابستگی‌های برنامه نصب شدند")

def create_env_file(app_dir, config):
    log_info("ایجاد فایل تنظیمات محیطی...")
    
    env_content = f"""# Ariya Bot Environment Configuration
# Generated by install.py

# Database
DATABASE_URL=postgresql://{config['db_user']}:{config['db_password']}@localhost:5432/{config['db_name']}
PGHOST=localhost
PGPORT=5432
PGUSER={config['db_user']}
PGPASSWORD={config['db_password']}
PGDATABASE={config['db_name']}

# Server
NODE_ENV=production
PORT=5000

# Security
JWT_SECRET={config['jwt_secret']}
SESSION_SECRET={config['session_secret']}

# Admin (change after first login)
ADMIN_PASSWORD={config['admin_password']}

# Optional AI Services (configure in admin panel)
# GEMINI_API_KEY=your_gemini_api_key
# LIARA_API_KEY=your_liara_api_key

# Optional Blockchain APIs
# CARDANOSCAN_API_KEY=your_cardanoscan_api_key
# TRONGRID_API_KEY=your_trongrid_api_key
"""
    
    env_path = os.path.join(app_dir, '.env')
    with open(env_path, 'w') as f:
        f.write(env_content)
    
    os.chmod(env_path, 0o600)
    
    log_success("فایل .env ایجاد شد")

def setup_database_schema(app_dir):
    log_info("ایجاد جداول دیتابیس...")
    
    os.chdir(app_dir)
    run_command("npm run db:push", "اعمال schema دیتابیس...")
    
    log_success("جداول دیتابیس ایجاد شدند")

def build_app(app_dir):
    log_info("ساخت نسخه production...")
    
    os.chdir(app_dir)
    run_command("npm run build", "ساخت برنامه...")
    
    log_success("برنامه با موفقیت ساخته شد")

def create_systemd_service(app_dir, config):
    log_info("ایجاد سرویس systemd...")
    
    service_content = f"""[Unit]
Description=Ariya Bot - Persian E-commerce Platform
After=network.target postgresql.service

[Service]
Type=simple
User={config['app_user']}
WorkingDirectory={app_dir}
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=ariyabot
Environment=NODE_ENV=production
EnvironmentFile={app_dir}/.env

[Install]
WantedBy=multi-user.target
"""
    
    service_path = '/etc/systemd/system/ariyabot.service'
    with open(service_path, 'w') as f:
        f.write(service_content)
    
    run_command("systemctl daemon-reload")
    run_command("systemctl enable ariyabot", "فعال‌سازی سرویس...")
    run_command("systemctl start ariyabot", "راه‌اندازی سرویس...")
    
    log_success("سرویس ariyabot ایجاد و راه‌اندازی شد")

def setup_nginx(config):
    log_info("پیکربندی Nginx...")
    
    domain = config.get('domain', 'localhost')
    
    nginx_config = f"""server {{
    listen 80;
    server_name {domain};

    client_max_body_size 50M;

    location / {{
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }}

    location /uploads {{
        alias {config['app_dir']}/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }}

    location /invoices {{
        alias {config['app_dir']}/public/invoices;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }}
}}
"""
    
    nginx_path = '/etc/nginx/sites-available/ariyabot'
    with open(nginx_path, 'w') as f:
        f.write(nginx_config)
    
    sites_enabled = '/etc/nginx/sites-enabled/ariyabot'
    if os.path.exists(sites_enabled):
        os.remove(sites_enabled)
    os.symlink(nginx_path, sites_enabled)
    
    default_site = '/etc/nginx/sites-enabled/default'
    if os.path.exists(default_site):
        os.remove(default_site)
    
    run_command("nginx -t", "بررسی تنظیمات Nginx...")
    run_command("systemctl reload nginx", "بارگذاری مجدد Nginx...")
    
    log_success("Nginx پیکربندی شد")

def setup_firewall():
    log_info("پیکربندی فایروال...")
    
    run_command("ufw allow ssh", check=False)
    run_command("ufw allow 'Nginx Full'", check=False)
    run_command("ufw --force enable", check=False)
    
    log_success("فایروال پیکربندی شد")

def create_directories(app_dir):
    log_info("ایجاد پوشه‌های مورد نیاز...")
    
    directories = [
        os.path.join(app_dir, 'uploads'),
        os.path.join(app_dir, 'public', 'invoices'),
        os.path.join(app_dir, 'stamppic'),
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
    
    log_success("پوشه‌ها ایجاد شدند")

def set_permissions(app_dir, config):
    log_info("تنظیم دسترسی‌ها...")
    
    app_user = config['app_user']
    
    run_command(f"chown -R {app_user}:{app_user} {app_dir}")
    run_command(f"chmod -R 755 {app_dir}")
    run_command(f"chmod 600 {app_dir}/.env")
    
    log_success("دسترسی‌ها تنظیم شدند")

def print_summary(config):
    print(f"""
{Colors.GREEN}{Colors.BOLD}
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                    ✅ نصب با موفقیت انجام شد!                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
{Colors.RESET}

{Colors.CYAN}اطلاعات مهم:{Colors.RESET}

{Colors.YELLOW}آدرس سایت:{Colors.RESET}
  http://{config.get('domain', 'localhost')}

{Colors.YELLOW}پنل ادمین:{Colors.RESET}
  آدرس:      http://{config.get('domain', 'localhost')}/admin/login
  نام کاربری: ehsan
  رمز عبور:  {config['admin_password']}

{Colors.YELLOW}دیتابیس:{Colors.RESET}
  نام:      {config['db_name']}
  کاربر:    {config['db_user']}
  رمز:      {config['db_password']}

{Colors.YELLOW}مسیر برنامه:{Colors.RESET}
  {config['app_dir']}

{Colors.YELLOW}دستورات مفید:{Colors.RESET}
  sudo systemctl status ariyabot    # وضعیت سرویس
  sudo systemctl restart ariyabot   # ریستارت سرویس
  sudo journalctl -u ariyabot -f    # مشاهده لاگ‌ها
  sudo systemctl status nginx       # وضعیت Nginx
  sudo systemctl status postgresql  # وضعیت دیتابیس

{Colors.YELLOW}برای SSL (HTTPS):{Colors.RESET}
  sudo certbot --nginx -d {config.get('domain', 'yourdomain.com')}

{Colors.RED}مهم:{Colors.RESET}
  - رمز عبور ادمین را پس از اولین ورود تغییر دهید
  - تنظیمات AI را در پنل ادمین انجام دهید
  - برای دامنه واقعی، SSL را فعال کنید

""")

def main():
    print_header()
    check_root()
    
    ubuntu_version = get_ubuntu_version()
    if ubuntu_version:
        log_info(f"سیستم‌عامل: Ubuntu {ubuntu_version}")
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    app_dir = script_dir if os.path.exists(os.path.join(script_dir, 'package.json')) else '/opt/ariyabot'
    
    if not os.path.exists(os.path.join(app_dir, 'package.json')):
        log_error(f"فایل package.json در مسیر {app_dir} یافت نشد!")
        log_info("لطفاً این اسکریپت را در پوشه پروژه اجرا کنید")
        sys.exit(1)
    
    config = {
        'app_dir': app_dir,
        'app_user': os.environ.get('SUDO_USER', 'www-data'),
        'db_name': 'ariyabot',
        'db_user': 'ariyabot',
        'db_password': generate_secret(32),
        'jwt_secret': generate_secret(64),
        'session_secret': generate_secret(64),
        'admin_password': 'admin123',
        'domain': os.environ.get('DOMAIN', 'localhost'),
    }
    
    log_info(f"مسیر برنامه: {app_dir}")
    log_info(f"کاربر برنامه: {config['app_user']}")
    
    print(f"\n{Colors.YELLOW}شروع نصب در 5 ثانیه...{Colors.RESET}\n")
    import time
    time.sleep(5)
    
    install_system_dependencies()
    install_nodejs()
    install_postgresql()
    setup_database(config)
    create_directories(app_dir)
    create_env_file(app_dir, config)
    install_app_dependencies(app_dir)
    setup_database_schema(app_dir)
    build_app(app_dir)
    set_permissions(app_dir, config)
    create_systemd_service(app_dir, config)
    setup_nginx(config)
    setup_firewall()
    
    print_summary(config)
    
    config_file = os.path.join(app_dir, '.install_config.txt')
    with open(config_file, 'w') as f:
        for key, value in config.items():
            f.write(f"{key}={value}\n")
    os.chmod(config_file, 0o600)
    
    log_success(f"اطلاعات نصب در فایل {config_file} ذخیره شد")

if __name__ == "__main__":
    main()
