# 防災備蓄用食品管理LINEアプリ - 実行計画

## 📋 プロジェクト概要
TypeScript + AWS Lambda + DynamoDB + LINE Messaging APIを使用した防災備蓄用食品管理アプリケーションの構築

---

## ✅ 実行計画（TODO リスト）

### フェーズ1: プロジェクト初期設定 ✅

- [x] **1.1 開発環境セットアップ**
  - [x] Node.js 18.x以降のインストール確認 (v22.16.0)
  - [ ] AWS CLIのインストール・設定 (後で必要に応じて設定)
  - [x] プロジェクトディレクトリの作成
  - [x] Gitリポジトリの初期化

- [x] **1.2 TypeScriptプロジェクトの初期化**
  - [x] `package.json` の作成
  - [x] 必要な依存関係のインストール
    ```bash
    npm init -y
    npm install @line/bot-sdk @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb uuid
    npm install -D typescript @types/node @types/uuid @types/aws-lambda ts-jest jest eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
    ```
  - [x] `tsconfig.json` の作成
  - [x] `.gitignore` の作成
  - [x] ディレクトリ構造の作成
    ```
    src/
    ├── handlers/
    │   ├── webhookHandler.ts
    │   └── notificationChecker.ts
    ├── services/
    │   ├── dynamoService.ts
    │   └── lineService.ts
    ├── types/
    │   └── index.ts
    ├── utils/
    │   └── dateUtils.ts
    └── config/
        └── constants.ts
    ```

- [x] **1.3 環境変数の設定**
  - [x] `.env.example` ファイルの作成
  - [x] `.env` ファイルの作成（ローカル開発用）

---

### フェーズ2: LINE チャネル設定

- [ ] **2.1 LINE Developersアカウント設定**
  - [ ] LINE Developersコンソールにログイン (https://developers.line.biz/)
  - [ ] プロバイダーの作成

- [ ] **2.2 Messaging APIチャネルの作成**
  - [ ] 新規チャネルの作成
  - [ ] チャネル名: 「防災備蓄管理Bot」
  - [ ] チャネル説明の入力
  - [ ] カテゴリの選択

- [ ] **2.3 チャネル設定**
  - [ ] チャネルアクセストークンの発行（長期）
  - [ ] チャネルシークレットの取得
  - [ ] Webhook URLの設定（後で設定）
  - [ ] 応答メッセージの無効化
  - [ ] Webhookの有効化

- [ ] **2.4 Bot情報の設定**
  - [ ] Botアイコン画像のアップロード
  - [ ] Bot名の設定
  - [ ] ステータスメッセージの設定

---

### フェーズ3: AWS環境構築

- [ ] **3.1 DynamoDBテーブルの作成**
  - [ ] テーブル名: `StockItems`
  - [ ] パーティションキー: `userId` (String)
  - [ ] ソートキー: `itemId` (String)
  - [ ] キャパシティモード: オンデマンド
  - [ ] GSIの作成: `ExpiryDateIndex`
    - パーティションキー: `userId`
    - ソートキー: `expiryDate`
  - [ ] テーブルARNの記録

- [ ] **3.2 IAMロールの作成（Lambda実行ロール）**
  - [ ] ロール名: `DisasterStockBotLambdaRole`
  - [ ] 信頼関係: Lambda service
  - [ ] ポリシーのアタッチ:
    - [ ] `AWSLambdaBasicExecutionRole` (CloudWatch Logs用)
    - [ ] DynamoDB カスタムポリシーの作成・アタッチ
      ```json
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": [
              "dynamodb:PutItem",
              "dynamodb:GetItem",
              "dynamodb:UpdateItem",
              "dynamodb:DeleteItem",
              "dynamodb:Query",
              "dynamodb:Scan"
            ],
            "Resource": [
              "arn:aws:dynamodb:ap-northeast-1:*:table/StockItems",
              "arn:aws:dynamodb:ap-northeast-1:*:table/StockItems/index/*"
            ]
          }
        ]
      }
      ```

---

### フェーズ4: バックエンド開発（Webhook Handler） ✅

- [x] **4.1 型定義の作成**
  - [x] `src/types/index.ts` の実装
    - [x] `StockItem` インターフェース
    - [x] `WebhookEvent` インターフェース
    - [x] `Category` 型
    - [x] その他必要な型

- [x] **4.2 ユーティリティ関数の実装**
  - [x] `src/utils/dateUtils.ts` の実装
    - [x] 日付フォーマット関数
    - [x] 賞味期限までの日数計算関数
    - [x] 日付バリデーション関数

- [x] **4.3 DynamoDBサービスの実装**
  - [x] `src/services/dynamoService.ts` の実装
    - [x] DynamoDB クライアントの初期化
    - [x] `createItem()` - 食品登録
    - [x] `getItemsByUserId()` - ユーザーの食品一覧取得
    - [x] `updateItemQuantity()` - 数量更新
    - [x] `deleteItem()` - 食品削除
    - [x] `queryByExpiryDate()` - 賞味期限でのクエリ

- [x] **4.4 LINEサービスの実装**
  - [x] `src/services/lineService.ts` の実装
    - [x] LINE Bot クライアントの初期化
    - [x] `replyMessage()` - 返信メッセージ送信
    - [x] `pushMessage()` - プッシュメッセージ送信
    - [x] `buildFoodListMessage()` - 食品一覧のFlex Message生成
    - [x] `buildQuickReply()` - クイックリプライ生成
    - [x] `buildConfirmTemplate()` - 確認テンプレート生成

- [x] **4.5 Webhook Handlerの実装**
  - [x] `src/handlers/webhookHandler.ts` の実装
    - [x] Lambda ハンドラー関数のエクスポート
    - [x] LINE署名検証
    - [x] イベントタイプ別のルーティング
    - [x] メッセージイベントの処理
    - [x] ポストバックイベントの処理
    - [x] 会話フローの状態管理（登録フロー）
    - [x] エラーハンドリング

- [x] **4.6 会話フロー実装**
  - [x] 食品登録フローの実装
    - [x] カテゴリ選択
    - [x] 食品名入力
    - [x] 数量入力
    - [x] 賞味期限入力
    - [x] 確認・登録完了
  - [x] 一覧表示の実装
  - [x] 消費（数量変更）の実装
  - [x] 削除の実装

---

### フェーズ5: バックエンド開発（Notification Checker） ✅

- [x] **5.1 Notification Checkerの実装**
  - [x] `src/handlers/notificationChecker.ts` の実装
    - [x] Lambda ハンドラー関数のエクスポート
    - [x] 全ユーザーのスキャン
    - [x] 賞味期限チェックロジック（30日前、7日前、当日）
    - [x] 通知対象のグループ化
    - [x] 通知メッセージの生成
    - [x] LINE Push APIでの通知送信
    - [x] エラーハンドリング・リトライロジック

---

### フェーズ6: ローカルテスト

- [ ] **6.1 ユニットテストの作成**
  - [ ] DynamoDBサービスのテスト
  - [ ] LINEサービスのテスト
  - [ ] 日付ユーティリティのテスト
  - [ ] テスト実行: `npm test`

- [ ] **6.2 ローカル統合テスト**
  - [ ] Lambda関数のローカル実行テスト（AWS SAM CLI使用推奨）
  - [ ] モックデータでのテスト
  - [ ] エラーケースのテスト

---

### フェーズ7: Lambda関数のデプロイ

- [ ] **7.1 ビルド**
  - [ ] TypeScriptのコンパイル: `npm run build`
  - [ ] node_modulesを含むデプロイパッケージの作成
    ```bash
    cd dist
    zip -r ../webhook-handler.zip .
    cd ..
    zip -r webhook-handler.zip node_modules
    ```
  - [ ] 同様にNotification Checker用のzipも作成

- [ ] **7.2 Webhook Handler Lambdaの作成**
  - [ ] 関数名: `DisasterStockBot-WebhookHandler`
  - [ ] ランタイム: Node.js 18.x
  - [ ] ハンドラー: `handlers/webhookHandler.handler`
  - [ ] 実行ロール: `DisasterStockBotLambdaRole`
  - [ ] 環境変数の設定:
    - `LINE_CHANNEL_ACCESS_TOKEN`
    - `LINE_CHANNEL_SECRET`
    - `DYNAMODB_TABLE_NAME=StockItems`
    - `REGION=ap-northeast-1`
  - [ ] タイムアウト: 30秒
  - [ ] メモリ: 256MB

- [ ] **7.3 Notification Checker Lambdaの作成**
  - [ ] 関数名: `DisasterStockBot-NotificationChecker`
  - [ ] ランタイム: Node.js 18.x
  - [ ] ハンドラー: `handlers/notificationChecker.handler`
  - [ ] 実行ロール: `DisasterStockBotLambdaRole`
  - [ ] 環境変数の設定（同上）
  - [ ] タイムアウト: 5分
  - [ ] メモリ: 512MB

---

### フェーズ8: API Gateway設定

- [ ] **8.1 REST APIの作成**
  - [ ] API名: `DisasterStockBot-API`
  - [ ] エンドポイントタイプ: リージョナル

- [ ] **8.2 リソースとメソッドの作成**
  - [ ] リソース: `/webhook`
  - [ ] メソッド: `POST`
  - [ ] 統合タイプ: Lambda関数
  - [ ] Lambda関数: `DisasterStockBot-WebhookHandler`
  - [ ] Lambda プロキシ統合の有効化

- [ ] **8.3 APIのデプロイ**
  - [ ] ステージ名: `prod`
  - [ ] APIエンドポイントURLの取得・記録

---

### フェーズ9: LINE Webhook設定

- [ ] **9.1 Webhook URLの設定**
  - [ ] LINE Developersコンソールで設定
  - [ ] Webhook URL: `https://<api-gateway-url>/prod/webhook`
  - [ ] Webhookの有効化
  - [ ] 接続確認の実行

- [ ] **9.2 動作テスト**
  - [ ] LINEアプリからBotを友だち追加
  - [ ] メッセージ送信テスト
  - [ ] CloudWatch Logsでログ確認

---

### フェーズ10: EventBridge設定

- [ ] **10.1 ルールの作成**
  - [ ] ルール名: `DisasterStockBot-WeeklyNotification`
  - [ ] スケジュール: cron式 `0 0 ? * SUN *` （毎週日曜日 9:00 JST = 0:00 UTC）
  - [ ] ターゲット: Lambda関数 `DisasterStockBot-NotificationChecker`

- [ ] **10.2 Lambda実行権限の付与**
  - [ ] EventBridgeがLambdaを実行できるようにリソースベースポリシーを設定

- [ ] **10.3 動作テスト**
  - [ ] 手動でLambda関数をテストイベントで実行
  - [ ] 通知が正しく送信されるか確認

---

### フェーズ11: リッチメニュー作成

- [ ] **11.1 リッチメニュー画像の作成**
  - [ ] サイズ: 2500px × 1686px（推奨）
  - [ ] 4分割デザイン（登録・一覧・設定・ヘルプ）
  - [ ] 画像形式: PNG または JPEG

- [ ] **11.2 リッチメニューの設定**
  - [ ] LINE Bot Designer または APIで作成
  - [ ] タップ領域の設定（4分割）
  - [ ] 各領域のアクション設定:
    - 登録: ポストバックデータ `action=register`
    - 一覧: ポストバックデータ `action=list`
    - 設定: ポストバックデータ `action=settings`
    - ヘルプ: ポストバックデータ `action=help`
  - [ ] デフォルトリッチメニューとして設定

---

### フェーズ12: エンドツーエンドテスト

- [ ] **12.1 基本機能テスト**
  - [ ] 食品登録フローの完全テスト
  - [ ] 食品一覧表示のテスト
  - [ ] 食品消費（数量変更）のテスト
  - [ ] 食品削除のテスト
  - [ ] リッチメニューの各ボタン動作確認

- [ ] **12.2 通知機能テスト**
  - [ ] テストデータの作成（30日後、7日後、当日の賞味期限）
  - [ ] Notification Checker Lambdaの手動実行
  - [ ] 通知メッセージの内容確認
  - [ ] 複数ユーザーでのテスト

- [ ] **12.3 エラーケーステスト**
  - [ ] 無効な日付入力
  - [ ] 数量0以下の入力
  - [ ] 存在しない食品の削除
  - [ ] DynamoDB接続エラーのシミュレーション

- [ ] **12.4 パフォーマンステスト**
  - [ ] レスポンスタイムの測定（5秒以内）
  - [ ] 大量データでの動作確認

---

### フェーズ13: ドキュメント整備

- [ ] **13.1 README.md の作成**
  - [ ] プロジェクト概要
  - [ ] セットアップ手順
  - [ ] デプロイ手順
  - [ ] 開発環境の構築方法

- [ ] **13.2 API仕様書の作成**
  - [ ] Webhook APIの仕様
  - [ ] ポストバックデータの形式
  - [ ] メッセージフォーマット

- [ ] **13.3 運用マニュアルの作成**
  - [ ] トラブルシューティング
  - [ ] ログの確認方法
  - [ ] バックアップ・リストア手順

---

### フェーズ14: 本番運用準備

- [ ] **14.1 モニタリング設定**
  - [ ] CloudWatch アラームの設定
    - Lambda関数のエラー率
    - DynamoDBのスロットリング
  - [ ] CloudWatch Logsの保持期間設定

- [ ] **14.2 セキュリティチェック**
  - [ ] IAMロールの最小権限確認
  - [ ] 環境変数の機密情報管理
  - [ ] API Gatewayのスロットリング設定

- [ ] **14.3 バックアップ設定**
  - [ ] DynamoDBのPoint-in-Time Recovery有効化
  - [ ] オンデマンドバックアップの設定

- [ ] **14.4 コスト最適化**
  - [ ] Lambda関数のメモリ・タイムアウト最適化
  - [ ] DynamoDBキャパシティの確認
  - [ ] CloudWatch Logsの不要なログ削除

---

### フェーズ15: リリース

- [ ] **15.1 本番環境での最終確認**
  - [ ] 全機能の動作確認
  - [ ] 実際のユーザーでのテスト
  - [ ] ヘルプメッセージの確認

- [ ] **15.2 ユーザー向けドキュメント**
  - [ ] 使い方ガイドの作成
  - [ ] FAQ の作成

- [ ] **15.3 公開**
  - [ ] LINE Bot の公開設定
  - [ ] QRコードの生成
  - [ ] ユーザーへの案内

---

## 📊 進捗管理

### 完了状況
- **フェーズ1**: ✅ 完了 (2026-01-05)
- **フェーズ2**: ⬜️ 未着手
- **フェーズ3**: ⬜️ 未着手
- **フェーズ4**: ✅ 完了 (2026-01-05)
- **フェーズ5**: ✅ 完了 (2026-01-05)
- **フェーズ6**: ⬜️ 未着手
- **フェーズ7**: ⬜️ 未着手
- **フェーズ8**: ⬜️ 未着手
- **フェーズ9**: ⬜️ 未着手
- **フェーズ10**: ⬜️ 未着手
- **フェーズ11**: ⬜️ 未着手
- **フェーズ12**: ⬜️ 未着手
- **フェーズ13**: ⬜️ 未着手
- **フェーズ14**: ⬜️ 未着手
- **フェーズ15**: ⬜️ 未着手

---

## 🔧 推奨ツール

- **開発環境**: Visual Studio Code
- **VSCode拡張機能**:
  - ESLint
  - Prettier
  - AWS Toolkit
- **テストツール**: Jest, ts-jest
- **デプロイツール**: AWS CLI, AWS SAM CLI（推奨）
- **バージョン管理**: Git

---

## 📝 メモ

### 開発時の注意点
- LINE Messaging APIの月間メッセージ数制限に注意（フリープラン: 500通/月）
- DynamoDBのオンデマンドモードはトラフィックが少ない場合に最適
- Lambda関数のコールドスタート対策（必要に応じてProvisioned Concurrency検討）
- 日本時間とUTCの時差に注意（EventBridgeはUTC基準）

### トラブルシューティング
- **Webhookが動作しない**: CloudWatch Logsでエラー確認、LINE署名検証の確認
- **通知が届かない**: EventBridgeルールの確認、Lambda実行ログの確認
- **DynamoDB接続エラー**: IAMロールの権限確認、リージョン設定確認

---

## 🎯 次のステップ

1. フェーズ1から順番に実施
2. 各フェーズ完了後、チェックボックスをマーク
3. 問題が発生した場合は、このドキュメントのメモセクションに記録
4. 定期的に進捗状況を更新
