# 🚀 セットアップガイド

## 前提条件

### 必要なソフトウェア
- **Node.js 18.17.0以上** (推奨: .nvmrcで指定されたバージョン)
- **npm** (Node.jsに同梱)
- **PostgreSQL** (バージョン13以上推奨)
- **Docker & Docker Compose** (オプション)

### 外部サービス
- **Cloudflare R2アカウント** (S3互換ストレージ)

## 📋 詳細セットアップ手順

### 1. リポジトリのクローン
```bash
git clone <repository-url>
cd usei-reader
```

### 2. Node.jsバージョンの確認
```bash
# nvmを使用している場合
nvm use
# または直接確認
node --version  # 18.17.0以上であることを確認
```

### 3. 依存関係のインストール
```bash
npm run setup
```
このコマンドは以下を実行します：
- ルートディレクトリの依存関係インストール
- `client/`ディレクトリの依存関係インストール
- `server/`ディレクトリの依存関係インストール

### 4. データベースのセットアップ

#### PostgreSQLの準備
```sql
-- PostgreSQLに接続してデータベースを作成
CREATE DATABASE epub_reader;
CREATE USER epub_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE epub_reader TO epub_user;
```

#### データベーススキーマの初期化
```bash
cd server
node init-db.js
```

### 5. 環境変数の設定

#### server/.envファイルを作成
```bash
cd server
cp .env.example .env
```

#### .envファイルを編集
```bash
# 必須設定項目
DATABASE_URL=postgresql://epub_user:your_password@localhost:5432/epub_reader
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_BUCKET_NAME=your-bucket-name
JWT_SECRET=your-secure-random-string
```

### 6. Cloudflare R2の設定

#### R2バケットの作成
1. Cloudflareダッシュボードにログイン
2. R2 Object Storageを選択
3. 新しいバケットを作成
4. API トークンを生成（読み書き権限）

#### CORS設定（必要に応じて）
```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"]
  }
]
```

## 🏃‍♂️ 実行方法

### 開発環境での実行
```bash
# ルートディレクトリから
npm run dev
```
これにより以下が同時に起動します：
- フロントエンド（React）: http://localhost:3000
- バックエンド（Express）: http://localhost:3001

### Docker環境での実行
```bash
docker-compose up
```
アクセス: http://localhost:8423

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### データベース接続エラー
```bash
# PostgreSQLサービスの状態確認
sudo systemctl status postgresql
# サービス開始
sudo systemctl start postgresql
```

#### ポート競合エラー
```bash
# ポート使用状況確認
lsof -i :3000
lsof -i :3001
# プロセス終了
kill -9 <PID>
```

#### npm依存関係エラー
```bash
# node_modulesとpackage-lock.jsonを削除して再インストール
rm -rf node_modules package-lock.json
rm -rf client/node_modules client/package-lock.json
rm -rf server/node_modules server/package-lock.json
npm run setup
```

#### Cloudflare R2接続エラー
- R2エンドポイントURLが正しいことを確認
- APIキーの権限設定を確認
- バケット名のスペルを確認

## 📊 動作確認

### ヘルスチェック
1. http://localhost:3000 にアクセス
2. フロントエンドが正常に読み込まれることを確認
3. バックエンドとの接続状態がUIに表示されることを確認

### 機能テスト
1. ユーザー登録・ログイン
2. EPUBファイルのアップロード
3. 読書開始と進度保存

## 🔐 セキュリティ注意事項

- `.env`ファイルは絶対にGitにコミットしないでください
- JWT_SECRETは十分に長い（32文字以上）ランダム文字列を使用してください
- 本番環境では、より強固なパスワードとアクセス制御を設定してください

## 📞 サポート

セットアップで問題が発生した場合は、以下を確認してください：
1. Node.jsとnpmのバージョン
2. PostgreSQLの接続設定
3. 環境変数の設定内容
4. ファイアウォール設定

---

*このガイドで解決しない問題がある場合は、GitHubのIssuesでお知らせください。*