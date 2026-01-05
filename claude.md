# 防災備蓄用食品管理LINEアプリ 仕様書

## 1. プロジェクト概要

### 1.1 目的
防災備蓄用食品の賞味期限を管理し、適切なタイミングで通知することで、食品ロスを防ぎ、常に有効な備蓄を維持する。

### 1.2 対象ユーザー
個人ユーザー（各LINEアカウント単位で管理）

### 1.3 主要機能
- 防災食品の登録（食品名、カテゴリ、数量、賞味期限）
- 賞味期限の通知（30日前、7日前、当日）
- 食品消費時の数量変更
- 食品の一覧表示・削除

---

## 2. 技術スタック

### 2.1 使用サービス
- **LINE Messaging API**: ユーザーインターフェース
- **AWS Lambda**: サーバーレスバックエンド処理
- **Amazon DynamoDB**: データベース
- **Amazon EventBridge**: 定期的な賞味期限チェックのトリガー

### 2.2 開発言語
- **TypeScript** (Node.js 18.x以降)
- **フレームワーク**: AWS SDK v3, @line/bot-sdk

---

## 3. 機能要件

### 3.1 食品登録機能
- **トリガー**: ユーザーがリッチメニューから「登録」を選択
- **入力項目**:
  - 食品名（テキスト入力）
  - カテゴリ（選択式）
    - 水
    - 主食（ご飯、パン、麺など）
    - おかず（缶詰、レトルトなど）
    - お菓子
    - その他
  - 数量（数値入力）
  - 賞味期限（日付選択）
- **処理フロー**:
  1. リッチメニュー「登録」ボタンをタップ
  2. クイックリプライでカテゴリを選択
  3. テンプレートメッセージで食品名、数量、賞味期限を入力
  4. 確認メッセージを表示し、登録完了

### 3.2 食品一覧表示機能
- **トリガー**: リッチメニューから「一覧」を選択
- **表示内容**:
  - カテゴリ別に食品をグループ化
  - 各食品: 食品名、数量、賞味期限、残り日数
  - 賞味期限が近い順にソート
  - 期限切れ食品は赤色で警告表示
- **アクション**:
  - 各食品に「消費」「削除」ボタンを配置

### 3.3 数量変更機能
- **トリガー**: 一覧から「消費」ボタンをタップ
- **処理フロー**:
  1. 消費する数量を入力（デフォルト: 1）
  2. 在庫数量を減算
  3. 数量が0になった場合は自動削除
  4. 更新完了メッセージを表示

### 3.4 食品削除機能
- **トリガー**: 一覧から「削除」ボタンをタップ
- **処理フロー**:
  1. 確認メッセージを表示
  2. ユーザーが確認したら削除実行
  3. 削除完了メッセージを表示

### 3.5 賞味期限通知機能
- **通知タイミング**:
  - 毎週日曜日の朝9:00に実行
  - 賞味期限が30日前、7日前、当日の食品を通知
- **通知内容**:
  - 賞味期限が近い食品のリスト
  - 各食品: 食品名、数量、残り日数
  - 「一覧を見る」ボタン

---

## 4. システムアーキテクチャ

### 4.1 全体構成図

```
[LINE ユーザー]
     ↓ メッセージ送信
[LINE Messaging API]
     ↓ Webhook
[API Gateway]
     ↓
[Lambda: Webhook Handler] ← メッセージ受信・処理
     ↓
[DynamoDB]

[EventBridge (週次トリガー)]
     ↓
[Lambda: Notification Checker] ← 賞味期限チェック
     ↓
[LINE Messaging API] → [LINE ユーザー]
```

### 4.2 Lambda関数構成

#### 4.2.1 Webhook Handler Lambda
- **役割**: LINEからのメッセージを受信し、適切な処理を実行
- **主要処理**:
  - ユーザーメッセージの解析
  - 食品の登録・更新・削除
  - 一覧表示のレスポンス生成
  - リッチメニュー・クイックリプライの制御

#### 4.2.2 Notification Checker Lambda
- **役割**: 定期的に賞味期限をチェックし、通知を送信
- **主要処理**:
  - 全ユーザーの食品データをスキャン
  - 賞味期限が30日前、7日前、当日の食品を抽出
  - 対象ユーザーに通知メッセージを送信

---

## 5. データベース設計（DynamoDB）

### 5.1 テーブル: StockItems

#### プライマリキー
- **Partition Key**: `userId` (String) - LINEユーザーID
- **Sort Key**: `itemId` (String) - 食品ID（UUID）

#### 属性
| 属性名 | 型 | 説明 | 必須 |
|--------|-----|------|------|
| userId | String | LINEユーザーID | ○ |
| itemId | String | 食品ID（UUID） | ○ |
| itemName | String | 食品名 | ○ |
| category | String | カテゴリ（water, staple, dish, snack, other） | ○ |
| quantity | Number | 数量 | ○ |
| expiryDate | String | 賞味期限（ISO 8601形式: YYYY-MM-DD） | ○ |
| createdAt | String | 登録日時（ISO 8601形式） | ○ |
| updatedAt | String | 更新日時（ISO 8601形式） | ○ |

#### GSI (Global Secondary Index)
- **インデックス名**: ExpiryDateIndex
- **Partition Key**: `userId`
- **Sort Key**: `expiryDate`
- **用途**: 賞味期限順の取得、期限チェック

#### サンプルデータ
```json
{
  "userId": "U1234567890abcdef",
  "itemId": "550e8400-e29b-41d4-a716-446655440000",
  "itemName": "アルファ米（五目ご飯）",
  "category": "staple",
  "quantity": 5,
  "expiryDate": "2026-12-31",
  "createdAt": "2026-01-05T10:30:00Z",
  "updatedAt": "2026-01-05T10:30:00Z"
}
```

---

## 6. LINE Bot機能

### 6.1 リッチメニュー

4分割のリッチメニューを設定:
```
┌─────────┬─────────┐
│  登録   │  一覧   │
├─────────┼─────────┤
│  設定   │ ヘルプ  │
└─────────┴─────────┘
```

- **登録**: 新しい食品を登録
- **一覧**: 現在の備蓄食品を表示
- **設定**: 通知設定など（将来拡張）
- **ヘルプ**: 使い方の説明

### 6.2 メッセージタイプ

#### 6.2.1 テンプレートメッセージ
- カルーセル形式での食品一覧表示
- 各カードに「消費」「削除」アクションボタン

#### 6.2.2 クイックリプライ
- カテゴリ選択
- 数量選択（1, 2, 3, 5, 10, カスタム）

#### 6.2.3 Flex Message
- 詳細な一覧表示
- 賞味期限の色分け表示

---

## 7. 処理フロー詳細

### 7.1 食品登録フロー

```
1. ユーザー: リッチメニュー「登録」タップ
   ↓
2. Bot: カテゴリ選択をクイックリプライで表示
   ↓
3. ユーザー: カテゴリを選択
   ↓
4. Bot: 食品名入力を促すメッセージ
   ↓
5. ユーザー: 食品名を入力
   ↓
6. Bot: 数量入力を促すメッセージ（クイックリプライ）
   ↓
7. ユーザー: 数量を選択/入力
   ↓
8. Bot: 賞味期限入力を促すメッセージ
   ↓
9. ユーザー: 賞味期限を入力（例: 2026-12-31）
   ↓
10. Bot: 入力内容を確認メッセージで表示
   ↓
11. ユーザー: 「登録」または「キャンセル」ボタンをタップ
   ↓
12. Bot: DynamoDBに保存 & 完了メッセージ
```

### 7.2 賞味期限チェック・通知フロー

```
1. EventBridge: 毎週日曜日 9:00にLambdaをトリガー
   ↓
2. Lambda (Notification Checker):
   - DynamoDBから全ユーザーの食品データを取得
   - 現在日時を基準に判定:
     * 賞味期限まで30日: 30日前通知
     * 賞味期限まで7日: 7日前通知
     * 賞味期限当日: 当日通知
   ↓
3. ユーザーごとに通知対象食品をグループ化
   ↓
4. LINE Messaging APIでプッシュメッセージを送信
   - 通知内容: 食品名、数量、残り日数
   - アクションボタン: 「一覧を見る」
```

---

## 8. エラーハンドリング

### 8.1 入力エラー
- **無効な日付形式**: 「正しい形式で入力してください（例: 2026-12-31）」
- **過去の日付**: 「賞味期限は今日以降の日付を入力してください」
- **数量が0以下**: 「数量は1以上を入力してください」

### 8.2 システムエラー
- DynamoDB接続エラー: 「一時的なエラーが発生しました。しばらくしてから再度お試しください」
- Lambda実行エラー: CloudWatch Logsに記録、ユーザーには汎用エラーメッセージ

---

## 9. セキュリティ要件

### 9.1 認証
- LINE Messaging APIの署名検証を実装
- Webhook URLでLINEからのリクエストのみを受け付け

### 9.2 データ保護
- DynamoDBのデータは暗号化（at rest）
- 通信はすべてHTTPS

---

## 10. 非機能要件

### 10.1 パフォーマンス
- Webhookレスポンス: 5秒以内
- 通知送信: 全ユーザーに30分以内

### 10.2 可用性
- Lambda: 自動スケーリング
- DynamoDB: オンデマンドキャパシティモード

### 10.3 コスト
- AWS無料枠内での運用を想定
- DynamoDB: オンデマンドモード（低トラフィック想定）
- Lambda: 月間100万リクエスト以内

---

## 11. 今後の拡張可能性

### 11.1 機能拡張案
- [ ] 複数人での共有機能（家族グループ）
- [ ] バーコードスキャン機能
- [ ] 賞味期限のカスタム通知設定
- [ ] 統計情報表示（消費履歴、カテゴリ別在庫など）
- [ ] レシピ提案（賞味期限が近い食品を使ったレシピ）
- [ ] LIFF画面での詳細管理

### 11.2 技術的改善案
- [ ] ユニットテスト・E2Eテストの追加（Jest + ts-jest）
- [ ] CI/CDパイプライン構築（GitHub Actions）
- [ ] Infrastructure as Code (AWS CDK with TypeScript / SAM)

---

## 12. 開発スケジュール（参考）

### フェーズ1: 基本機能（MVP）
- DynamoDBテーブル設計・作成
- Lambda関数実装（Webhook Handler）
- LINE Bot基本機能（登録・一覧・削除）

### フェーズ2: 通知機能
- Notification Checker Lambda実装
- EventBridge設定
- 通知メッセージのデザイン

### フェーズ3: UI改善
- リッチメニュー作成
- Flex Message対応
- エラーハンドリング強化

### フェーズ4: テスト・デプロイ
- 動作テスト
- 本番環境デプロイ
- ドキュメント整備

---

## 13. 参考資料

- [LINE Messaging API ドキュメント](https://developers.line.biz/ja/docs/messaging-api/)
- [AWS Lambda ドキュメント](https://docs.aws.amazon.com/lambda/)
- [Amazon DynamoDB ドキュメント](https://docs.aws.amazon.com/dynamodb/)
- [Amazon EventBridge ドキュメント](https://docs.aws.amazon.com/eventbridge/)

---

## 付録A: TypeScript環境設定

### package.json（例）
```json
{
  "name": "disaster-stock-bot",
  "version": "1.0.0",
  "description": "防災備蓄用食品管理LINEアプリ",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "deploy": "npm run build && zip -r function.zip dist node_modules",
    "test": "jest",
    "lint": "eslint src/**/*.ts"
  },
  "dependencies": {
    "@line/bot-sdk": "^8.0.0",
    "@aws-sdk/client-dynamodb": "^3.0.0",
    "@aws-sdk/lib-dynamodb": "^3.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "@types/uuid": "^9.0.0",
    "@types/aws-lambda": "^8.10.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0"
  }
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

## 付録B: 環境変数

### Lambda関数で使用する環境変数
```
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
DYNAMODB_TABLE_NAME=StockItems
REGION=ap-northeast-1
```

---

## 付録C: IAMポリシー

### Lambda実行ロールに必要な権限
- DynamoDB: PutItem, GetItem, UpdateItem, DeleteItem, Query, Scan
- CloudWatch Logs: CreateLogGroup, CreateLogStream, PutLogEvents

---

## 付録D: 型定義（TypeScript）

### 主要な型定義例
```typescript
// 食品アイテムの型
export interface StockItem {
  userId: string;
  itemId: string;
  itemName: string;
  category: 'water' | 'staple' | 'dish' | 'snack' | 'other';
  quantity: number;
  expiryDate: string; // YYYY-MM-DD
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// LINE Webhookイベントのペイロード
export interface WebhookEvent {
  type: string;
  replyToken?: string;
  source: {
    userId: string;
    type: string;
  };
  message?: {
    type: string;
    text?: string;
  };
  postback?: {
    data: string;
  };
}

// 通知対象の型
export interface NotificationTarget {
  userId: string;
  items: Array<{
    itemName: string;
    quantity: number;
    daysRemaining: number;
    expiryDate: string;
  }>;
}
```

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 作成者 |
|------|-----------|---------|--------|
| 2026-01-05 | 1.0 | 初版作成 | - |
| 2026-01-05 | 1.1 | 開発言語をTypeScriptに変更、TypeScript関連の設定と型定義を追加 | - |
