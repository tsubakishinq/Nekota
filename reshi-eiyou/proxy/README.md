# レシート栄養カレンダー — AI読み取り中継サーバー

レシート写真を **Claude（AI画像認識）** で読み取り、アプリの食材に対応づけて返す小さなサーバーです。
APIキーをここに保管するので、公開HTMLにキーを埋め込まずに済みます。

デプロイは **1回だけ**。以降はアプリに出てきたURLを貼るだけで使えます。

## 必要なもの
- Anthropic の APIキー（https://console.anthropic.com で取得）
- Node.js（`npx` が使える環境）
- Cloudflare のアカウント（無料）

## 手順

```bash
cd reshi-eiyou/proxy

# 1. Cloudflare にログイン（ブラウザが開きます）
npx wrangler login

# 2. APIキーを秘密情報として登録（画面の指示に従って貼り付け）
npx wrangler secret put ANTHROPIC_API_KEY

# 3. デプロイ
npx wrangler deploy
```

デプロイに成功すると、次のようなURLが表示されます:

```
https://reshi-eiyou-proxy.<あなたのサブドメイン>.workers.dev
```

この **URLをコピー** して、アプリの「🥗 食材」タブ →「AI読み取り設定」の入力欄に貼り付けて保存してください。
以降、レシート写真を開いて「🤖 AIで読み取る」を押すと、中身が自動で候補に出ます。

## 補足
- **モデルを変えたい**：`wrangler.toml` の `MODEL` を設定（`claude-haiku-4-5` で安く、`claude-opus-4-8` で高精度）。
- **料金**：Anthropic APIの従量課金です。レシート1枚の読み取りは画像1枚＋短いテキストのやり取りなので少額ですが、使った分だけ課金されます。
- **セキュリティ**：`ANTHROPIC_API_KEY` は Cloudflare の secret に保管され、レスポンスにも出ません。誰でも叩けるURLになるため、心配なら Cloudflare 側でアクセス制限（例: Cloudflare Access）を追加してください。
