/**
 * 型定義ファイル
 * プロジェクト全体で使用する型を定義
 */

/**
 * 食品カテゴリ
 */
export type Category = 'water' | 'staple' | 'dish' | 'snack' | 'other';

/**
 * カテゴリの日本語表示名
 */
export const CATEGORY_LABELS: Record<Category, string> = {
  water: '水',
  staple: '主食',
  dish: 'おかず',
  snack: 'お菓子',
  other: 'その他',
};

/**
 * 食品アイテム（DynamoDBのレコード）
 */
export interface StockItem {
  userId: string;           // LINEユーザーID
  itemId: string;           // 食品ID（UUID）
  itemName: string;         // 食品名
  category: Category;       // カテゴリ
  quantity: number;         // 数量
  expiryDate: string;       // 賞味期限（YYYY-MM-DD形式）
  createdAt: string;        // 登録日時（ISO 8601形式）
  updatedAt: string;        // 更新日時（ISO 8601形式）
}

/**
 * LINE Webhookイベントのソース
 */
export interface EventSource {
  type: 'user' | 'group' | 'room';
  userId?: string;
  groupId?: string;
  roomId?: string;
}

/**
 * LINEメッセージイベント
 */
export interface MessageEvent {
  type: 'message';
  replyToken: string;
  source: EventSource;
  timestamp: number;
  message: {
    type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker';
    id: string;
    text?: string;
  };
}

/**
 * LINEポストバックイベント
 */
export interface PostbackEvent {
  type: 'postback';
  replyToken: string;
  source: EventSource;
  timestamp: number;
  postback: {
    data: string;
    params?: Record<string, string>;
  };
}

/**
 * LINEフォローイベント
 */
export interface FollowEvent {
  type: 'follow';
  replyToken: string;
  source: EventSource;
  timestamp: number;
}

/**
 * LINE Webhookイベントの統合型
 */
export type WebhookEvent = MessageEvent | PostbackEvent | FollowEvent;

/**
 * 会話の状態
 */
export type ConversationState =
  | 'idle'                    // 待機中
  | 'registering_category'    // カテゴリ選択中
  | 'registering_name'        // 食品名入力中
  | 'registering_quantity'    // 数量入力中
  | 'registering_expiry'      // 賞味期限入力中
  | 'confirming_registration' // 登録確認中
  | 'listing'                 // 一覧表示中
  | 'updating_quantity'       // 数量変更中
  | 'confirming_delete';      // 削除確認中

/**
 * 会話のコンテキスト（状態管理用）
 * 注: 本実装ではDynamoDBやRedisに保存する想定
 * 簡易実装ではメモリ上で管理
 */
export interface ConversationContext {
  userId: string;
  state: ConversationState;
  data?: {
    category?: Category;
    itemName?: string;
    quantity?: number;
    expiryDate?: string;
    itemId?: string;  // 更新・削除対象のアイテムID
  };
  lastUpdated: string;
}

/**
 * 通知対象の食品情報
 */
export interface NotificationItem {
  itemName: string;
  quantity: number;
  daysRemaining: number;  // 賞味期限までの残り日数
  expiryDate: string;
}

/**
 * 通知対象のユーザーと食品リスト
 */
export interface NotificationTarget {
  userId: string;
  items: NotificationItem[];
}

/**
 * ポストバックアクション
 */
export interface PostbackAction {
  action: 'register' | 'list' | 'settings' | 'help' | 'consume' | 'delete' | 'confirm' | 'cancel';
  itemId?: string;
  category?: Category;
}

/**
 * API レスポンス（共通）
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Lambda関数のレスポンス
 */
export interface LambdaResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

/**
 * 環境変数の型
 */
export interface EnvironmentVariables {
  LINE_CHANNEL_ACCESS_TOKEN: string;
  LINE_CHANNEL_SECRET: string;
  DYNAMODB_TABLE_NAME: string;
  AWS_REGION: string;
  NOTIFICATION_HOUR?: string;
}
