/**
 * アプリケーション定数
 */

/**
 * 通知タイミング（賞味期限の何日前に通知するか）
 */
export const NOTIFICATION_DAYS = {
  THIRTY_DAYS: 30,
  SEVEN_DAYS: 7,
  TODAY: 0,
} as const;

/**
 * メッセージテンプレート
 */
export const MESSAGES = {
  // ウェルカムメッセージ
  WELCOME: `防災備蓄管理Botへようこそ！

このBotでは、防災備蓄用食品の賞味期限を管理できます。

📋 主な機能：
・食品の登録
・賞味期限の通知
・食品一覧の表示
・数量の管理

リッチメニューから操作を選択してください。`,

  // ヘルプメッセージ
  HELP: `【使い方】

📝 食品を登録する
リッチメニューの「登録」ボタンから、食品の情報を入力してください。

📋 一覧を見る
リッチメニューの「一覧」ボタンで、登録済みの食品を確認できます。

🔔 通知について
毎週日曜日の朝9時に、賞味期限が近い食品を通知します。
（30日前、7日前、当日）

ご不明な点がありましたら、お気軽にお問い合わせください。`,

  // 登録フロー
  REGISTER_START: 'カテゴリを選択してください：',
  REGISTER_NAME: '食品名を入力してください：',
  REGISTER_QUANTITY: '数量を入力してください：',
  REGISTER_EXPIRY: '賞味期限を入力してください（例: 2026-12-31）：',
  REGISTER_CONFIRM: (name: string, category: string, quantity: number, expiry: string) =>
    `以下の内容で登録しますか？

食品名: ${name}
カテゴリ: ${category}
数量: ${quantity}個
賞味期限: ${expiry}`,
  REGISTER_SUCCESS: '食品を登録しました！',
  REGISTER_CANCEL: '登録をキャンセルしました。',

  // エラーメッセージ
  ERROR_INVALID_DATE: '日付の形式が正しくありません。YYYY-MM-DD形式で入力してください（例: 2026-12-31）',
  ERROR_PAST_DATE: '賞味期限は今日以降の日付を入力してください。',
  ERROR_INVALID_QUANTITY: '数量は1以上の整数を入力してください。',
  ERROR_EMPTY_NAME: '食品名を入力してください。',
  ERROR_GENERAL: '一時的なエラーが発生しました。しばらくしてから再度お試しください。',

  // 一覧表示
  LIST_EMPTY: '登録されている食品はありません。',
  LIST_TITLE: '📋 備蓄食品一覧',

  // 数量変更
  UPDATE_QUANTITY_PROMPT: '消費する数量を入力してください（デフォルト: 1）：',
  UPDATE_SUCCESS: '数量を更新しました。',
  UPDATE_DELETED: '在庫が0になったため、食品を削除しました。',

  // 削除確認
  DELETE_CONFIRM: (name: string) => `「${name}」を削除しますか？`,
  DELETE_SUCCESS: '食品を削除しました。',
  DELETE_CANCEL: '削除をキャンセルしました。',
} as const;

/**
 * クイックリプライの選択肢
 */
export const QUICK_REPLY_OPTIONS = {
  CATEGORIES: [
    { label: '💧 水', value: 'water' },
    { label: '🍚 主食', value: 'staple' },
    { label: '🥫 おかず', value: 'dish' },
    { label: '🍪 お菓子', value: 'snack' },
    { label: '📦 その他', value: 'other' },
  ],
  QUANTITIES: [
    { label: '1個', value: '1' },
    { label: '2個', value: '2' },
    { label: '3個', value: '3' },
    { label: '5個', value: '5' },
    { label: '10個', value: '10' },
    { label: 'その他', value: 'custom' },
  ],
  CONFIRM: [
    { label: '✅ 登録', value: 'confirm' },
    { label: '❌ キャンセル', value: 'cancel' },
  ],
} as const;

/**
 * ポストバックアクション
 */
export const POSTBACK_ACTIONS = {
  REGISTER: 'register',
  LIST: 'list',
  SETTINGS: 'settings',
  HELP: 'help',
  CONSUME: 'consume',
  DELETE: 'delete',
  CONFIRM: 'confirm',
  CANCEL: 'cancel',
} as const;

/**
 * DynamoDBテーブル設定
 */
export const DYNAMODB_CONFIG = {
  TABLE_NAME: process.env.DYNAMODB_TABLE_NAME || 'StockItems',
  GSI_EXPIRY_DATE: 'ExpiryDateIndex',
} as const;

/**
 * LINE設定
 */
export const LINE_CONFIG = {
  CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET || '',
} as const;

/**
 * AWS設定
 */
export const AWS_CONFIG = {
  REGION: process.env.AWS_REGION || 'ap-northeast-1',
} as const;

/**
 * リッチメニューのテンプレートID（後で設定）
 */
export const RICH_MENU_ID = process.env.RICH_MENU_ID || '';

/**
 * セッションタイムアウト（分）
 */
export const SESSION_TIMEOUT_MINUTES = 30;
