Kuroki Ryota (TROY) — Portfolio

ローカルで `index.html` をブラウザで開くだけで閲覧できます。静的サイトなのでホスティングも簡単です（GitHub Pages / Vercel / Netlify など）。

構成
- `index.html` メインページ（Profile / Works / Information の3セクション）
- `assets/style.css` スタイル
- `assets/main.js` ふるまい（ESM：モバイルメニュー、スクロール連動、ライトボックス、遅延読み込み、View Transitions）
- `assets/favicon.svg` ファビコン
- `assets/placeholders/` プレースホルダー画像
- `manifest.webmanifest` PWA用マニフェスト
- `service-worker.js` オフライン対応のシンプルなService Worker

編集ポイント
- プロフィール: `index.html` の `#profile` セクションのテキストを書き換えてください。
- 連絡先: `Information` のメールを実アドレスへ差し替え。
- Instagram: 既に `@troy_loss` へのリンクが設定済みです。
- Works: `#works` の `.works-grid` に `figure.work` を追加してください。
  - YouTube: `<figure class="work" data-kind="youtube" data-video="{ID}">…`
  - Vimeo: `<figure class="work" data-kind="vimeo" data-video="{ID}">…`
  - 画像: `<figure class="work" data-kind="image" data-image="path/to.jpg">…`
  - タイトルは `<span class="work-title">`、メタ情報は `<span class="work-meta">` を編集。

動画サムネ（参考サイト風にホバー再生）
- 推奨: mp4(H.264), 1080p か 720p, 6–12秒, 16:9, 無音（muted）、短尺ループ向けにトリミング
- 追加方法の例:

```
<figure class="work" data-kind="video" data-video-src="assets/works/your-video.mp4" data-poster="assets/works/your-poster.jpg" tabindex="0">
  <div class="media-frame">
    <video class="work-video" muted playsinline loop preload="metadata" poster="assets/works/your-poster.jpg" data-src="assets/works/your-video.mp4"></video>
    <div class="overlay">
      <div class="ovl-title">Title</div>
      <div class="ovl-meta">2024 / Dir.</div>
    </div>
  </div>
  <!-- クリックでモーダル再生、ホバーでサムネ再生 -->
  <!-- モバイルではホバーなし（クリックでモーダル再生） -->
```

- data-src はビューポートに入ったタイミングで `src` に差し替えられ、遅延読み込みされます。
- クリック時はモーダルに動画（controlsあり・autoplay）を挿入して再生します。

アップロード時のポスター秒指定（管理画面）
- Admin → Upload File の「Poster start (sec)」にサムネ生成の開始秒を指定できます。
- 未指定（0）の場合は先頭フレームを使用します。
- 生成に失敗した場合は自動で 0 秒でリトライします。

最新技術（本プロジェクトで使用）
- PWA: `manifest.webmanifest` + `service-worker.js` でインストール可能＆キャッシュ（静的アセット）
- Container Queries: `.works-grid` をコンテナ化しカードの列落ちをサイズ自律で制御
- View Transitions API: モーダルの開閉に対応（対応ブラウザのみ）
- Reduced Motion: `prefers-reduced-motion` でホバー自動再生を抑制
- ESM: `type="module"` でモダンJSとして読み込み
- JSON-LD: `Person` スキーマを埋め込み、検索でのリッチ表示を補助

デプロイ
1) GitHub Pages: このフォルダをリポジトリにして `main` ブランチのルートを公開。
2) Vercel/Netlify: New Project → このフォルダをアップロード（ビルド不要）。

GitHub 管理（推奨）
- 初期化とプッシュ

```
cd /Users/sakagawa/Desktop/TROY-WEBSITE
git init
git branch -M main
git add .
git commit -m "chore: init"
git remote add origin git@github.com:<your-account>/<repo>.git
git push -u origin main
```

- 無視ファイル: `.gitignore` で `movies/`, `data/*.json`, `.env` などは除外
- 環境変数: `.env.example` をコピーして `.env` を作成（`ADMIN_PASSWORD`, `ADMIN_JWT_SECRET`, `PORT`）
- CI: `.github/workflows/node-ci.yml` で簡易チェックを実行

本番ホスティングの候補
- Render / Railway / Fly.io / Heroku 等で Node サービスとして起動
- 環境変数を配置
- アップロード先（`movies/`）や `data/` を永続化したい場合はストレージ連携を設定

デザインメモ
- 参照サイトのミニマルかつタイポ重視の方向性を踏襲。大きめのロゴ（TROY）、太字、余白、シンプルなライン。
- 黒ベース/白字にアクセントカラー（ピンク系）を一点だけ使用。
- 作品は16:9 グリッド。クリックでライトボックス再生（YouTube / Vimeo / 画像）。

改善アイデア（必要なら追加対応）
- 作品フィルター（Category / Year / Client）
- 日本語・英語切替
- 埋め込みのサムネイル自動生成（oEmbed 連携）
- OG画像の実画像差し替え（`assets/og-image.png`）
