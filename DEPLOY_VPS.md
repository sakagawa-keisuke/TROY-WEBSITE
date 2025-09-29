# VPS デプロイメントガイド

VPS (2GB RAM推奨) でTROYポートフォリオサイトをデプロイする完全ガイドです。

## 📋 システム要件

### 推奨スペック
- **RAM**: 2GB（最低1GB）
- **ストレージ**: 20GB SSD
- **CPU**: 1コア以上
- **OS**: Ubuntu 20.04 LTS / Ubuntu 22.04 LTS

### 推奨プロバイダー
- さくらVPS（国内・安定）
- ConoHa VPS（高速）
- DigitalOcean（開発者向け）
- Vultr（高性能）

## 🚀 セットアップ手順

### 1. VPS初期設定

```bash
# root権限でログイン
# ユーザー作成
adduser troy
usermod -aG sudo troy

# セキュリティ更新
apt update && apt upgrade -y

# 必要なパッケージをインストール
apt install -y curl wget git nginx ufw fail2ban
```

### 2. Node.js インストール

```bash
# Node.js 18.x LTSをインストール
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# バージョン確認
node --version
npm --version
```

### 3. アプリケーションデプロイ

```bash
# アプリユーザーに切り替え
su - troy

# リポジトリクローン
git clone https://github.com/sakagawa-keisuke/TROY-WEBSITE.git
cd TROY-WEBSITE

# 依存関係インストール
npm install --production

# 環境設定
cp .env.example .env
nano .env
```

#### .env 設定例：
```env
ADMIN_PASSWORD=your-secure-password-123
ADMIN_JWT_SECRET=your-very-secure-jwt-secret-key-456
PORT=3000
NODE_ENV=production
```

### 4. PM2 で永続化

```bash
# PM2インストール
npm install -g pm2

# アプリケーション起動
pm2 start server/server.js --name "troy-portfolio"

# 自動起動設定
pm2 startup
pm2 save
```

### 5. Nginx リバースプロキシ設定

```bash
sudo nano /etc/nginx/sites-available/troy-portfolio
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # セキュリティヘッダー
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    
    # 静的ファイル用の設定
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|mp4|webm|mov)$ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 1h;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
    
    # メイン設定
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # タイムアウト設定
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # ファイルアップロード制限
    client_max_body_size 1G;
    
    # gzip圧縮
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

```bash
# サイト有効化
sudo ln -s /etc/nginx/sites-available/troy-portfolio /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL証明書設定 (Let's Encrypt)

```bash
# Certbot インストール
sudo apt install certbot python3-certbot-nginx

# SSL証明書取得
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自動更新設定
sudo systemctl enable certbot.timer
```

### 7. ファイアウォール設定

```bash
# UFWファイアウォール設定
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 🔧 運用・管理

### ログ確認

```bash
# アプリケーションログ
pm2 logs troy-portfolio

# Nginxログ
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# システムリソース監視
pm2 monit
```

### バックアップ

```bash
# 毎日午前2時にバックアップを実行
echo "0 2 * * * /home/troy/backup.sh" | crontab -
```

#### backup.sh の例：
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/troy/backups"
APP_DIR="/home/troy/TROY-WEBSITE"

mkdir -p $BACKUP_DIR

# アプリケーションファイルバックアップ
tar -czf "$BACKUP_DIR/troy-app-$DATE.tar.gz" -C $APP_DIR .

# データベースバックアップ（将来対応）
# mysqldump troy_portfolio > "$BACKUP_DIR/troy-db-$DATE.sql"

# 古いバックアップ削除（7日以上前）
find $BACKUP_DIR -name "troy-*" -mtime +7 -delete
```

### アップデート手順

```bash
cd /home/troy/TROY-WEBSITE

# アプリ停止
pm2 stop troy-portfolio

# 最新コード取得
git pull origin main

# 依存関係更新
npm install --production

# アプリ再起動
pm2 start troy-portfolio
```

## 📊 パフォーマンス監視

### リソース使用量確認

```bash
# メモリ使用量
free -h

# CPU使用量
htop

# ディスク使用量
df -h

# PM2ステータス
pm2 status
```

### メモリ不足の場合

```bash
# スワップファイル作成（1GB）
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永続化
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 🛡️ セキュリティ対策

### SSH セキュリティ強化

```bash
sudo nano /etc/ssh/sshd_config
```

```
Port 2222  # デフォルトポート変更
PermitRootLogin no
PasswordAuthentication no  # 鍵認証のみ
```

### Fail2Ban 設定

```bash
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
```

## ❗ トラブルシューティング

### よくある問題と解決方法

1. **メモリ不足でクラッシュ**
   - スワップファイル作成
   - PM2のmax_memory_restart設定

2. **アップロードファイルが大きすぎる**
   - Nginx client_max_body_size設定
   - Node.jsの制限確認

3. **動画処理が重い**
   - ffmpegの並列処理制限
   - 処理キューイング実装

4. **SSL証明書の更新失敗**
   - Webroot設定確認
   - ドメイン設定確認

---

**メモリ使用量の実測値**:
- Node.js基本: ~50MB
- アプリケーション: ~200MB
- Nginx: ~20MB
- 合計: 約270MB（2GBに対して余裕あり）