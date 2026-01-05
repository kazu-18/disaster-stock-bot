# 防災備蓄用食品管理LINEアプリ

防災備蓄用食品の賞味期限を管理し、適切なタイミングで通知するLINE Botアプリケーション

## 🚀 機能

- 防災食品の登録（食品名、カテゴリ、数量、賞味期限）
- 賞味期限の通知（30日前、7日前、当日）
- 食品消費時の数量変更
- 食品の一覧表示・削除
- リッチメニューによる直感的な操作

## 🛠️ 技術スタック

- **Language**: TypeScript
- **Platform**: AWS Lambda + DynamoDB
- **API**: LINE Messaging API
- **Scheduler**: Amazon EventBridge

## 📋 前提条件

- Node.js 18.x以降
- npm
- AWSアカウント
- LINE Developersアカウント

## 🔧 セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env`ファイルを作成し、以下の環境変数を設定してください：

```bash
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
LINE_CHANNEL_SECRET=your_channel_secret_here

# AWS Configuration
AWS_REGION=ap-northeast-1
DYNAMODB_TABLE_NAME=StockItems

# Application Settings
NOTIFICATION_HOUR=0
```

### 3. ビルド

```bash
npm run build
```

### 4. テスト

```bash
npm test
```

## 📁 プロジェクト構造

```
.
├── src/
│   ├── handlers/          # Lambda関数のハンドラー
│   │   ├── webhookHandler.ts
│   │   └── notificationChecker.ts
│   ├── services/          # ビジネスロジック
│   │   ├── dynamoService.ts
│   │   └── lineService.ts
│   ├── types/             # TypeScript型定義
│   │   └── index.ts
│   ├── utils/             # ユーティリティ関数
│   │   └── dateUtils.ts
│   └── config/            # 設定ファイル
│       └── constants.ts
├── dist/                  # コンパイル後のJavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 デプロイ

詳細なデプロイ手順については、[TODO.md](./TODO.md)を参照してください。

## 📖 ドキュメント

- [仕様書](./claude.md)
- [実行計画](./TODO.md)

## 📝 ライセンス

MIT
