# Xserver デプロイメントガイド

XserverでTROYポートフォリオサイト（管理画面付き）をデプロイする手順です。

## 事前準備

### 必要なもの
- Xserver アカウント（スタンダードプラン以上推奨）
- Node.js対応プラン（Xserver Business以上、またはVPS）
- FTPクライアント（FileZilla等）

## デプロイ手順

### 1. ファイルの準備

```bash
# 本番用ファイルを準備
npm install --production
```

### 2. 環境変数の設定

`.env`ファイルを作成：

```bash
# .env
ADMIN_PASSWORD=your-secure-password-here
ADMIN_JWT_SECRET=your-jwt-secret-key-here
PORT=3000
NODE_ENV=production
```

### 3. Xserverへのアップロード

以下のファイル・フォルダをXserverにアップロード：

```
public_html/
├── assets/
├── data/
├── movies/
├── node_modules/
├── server/
├── .env
├── package.json
├── package-lock.json
├── index.html
├── admin.html
├── top.html
├── info.html
├── profile.html
└── manifest.webmanifest
```

### 4. Node.jsアプリケーションの設定

Xserver管理パネルで：

1. 「Node.js設定」を開く
2. 「Node.jsアプリケーションを追加する」
3. 設定：
   - **Node.jsバージョン**: 18.x 以上
   - **アプリケーションルート**: `/public_html`
   - **アプリケーションURL**: `https://yourdomain.com`
   - **スタートアップファイル**: `server/server.js`

### 5. 依存関係のインストール

Xserver SSH接続で：

```bash
cd /home/your-account/yourdomain.com/public_html
npm install --production
```

### 6. アプリケーションの起動

Xserver管理パネルで「アプリケーションを開始」をクリック

## アクセス方法

- **メインサイト**: `https://yourdomain.com`
- **管理画面**: `https://yourdomain.com/admin`
- **API**: `https://yourdomain.com/api/*`

## 管理画面の使用方法

1. `https://yourdomain.com/admin` にアクセス
2. `.env`で設定したパスワードでログイン
3. 作品のアップロード・編集・公開設定が可能

### 主な機能
- 動画・画像ファイルのアップロード
- 作品メタデータの編集
- 公開・非公開の切り替え
- カテゴリ管理
- サムネイル自動生成

## トラブルシューティング

### アプリケーションが起動しない場合

1. Node.jsバージョンを確認
2. `package.json`の`dependencies`を確認
3. `.env`ファイルの設定を確認
4. ログを確認：`/home/your-account/logs/`

### アップロードができない場合

1. `movies/`フォルダの権限を確認（755推奨）
2. ディスク容量を確認
3. ファイルサイズ制限を確認

### 動画が再生されない場合

1. 動画ファイルの形式を確認（MP4推奨）
2. ファイルパスを確認
3. MIME TypeがX server側で設定されているか確認

## セキュリティ対策

- `.env`ファイルは必ずWebアクセス不可の場所に配置
- 強固なパスワードを使用
- 定期的なバックアップ
- SSL証明書の設定

## パフォーマンス最適化

- 動画ファイルの圧縮
- 画像の最適化
- CDNの利用検討
- キャッシュ設定

---

**注意**: Xserverの仕様は変更される場合があります。最新の情報は公式ドキュメントを確認してください。