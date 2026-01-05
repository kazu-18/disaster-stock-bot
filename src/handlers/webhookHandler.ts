/**
 * LINE Webhook Handler
 * LINEからのイベントを受け取り、適切に処理する
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as crypto from 'crypto';
import {
  WebhookEvent,
  MessageEvent,
  PostbackEvent,
  FollowEvent,
  ConversationContext,
  Category,
  CATEGORY_LABELS,
} from '../types';
import {
  replyMessage,
  createTextMessage,
  createCategoryQuickReply,
  createQuantityQuickReply,
  createConfirmTemplate,
  createFoodListFlexMessage,
} from '../services/lineService';
import {
  createItem,
  getItemsByUserId,
  getItemById,
  updateItemQuantity,
  deleteItem,
} from '../services/dynamoService';
import {
  isValidDateFormat,
  isTodayOrFuture,
  formatDateToJapanese,
} from '../utils/dateUtils';
import {
  LINE_CONFIG,
  MESSAGES,
  POSTBACK_ACTIONS,
} from '../config/constants';

// 会話コンテキストの一時保存（メモリ）
// 注: 本番環境ではDynamoDBやRedisに保存する必要があります
const conversationContexts: Map<string, ConversationContext> = new Map();

/**
 * LINE署名を検証
 * @param body - リクエストボディ
 * @param signature - X-Line-Signatureヘッダーの値
 * @returns 検証結果
 */
function verifySignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('SHA256', LINE_CONFIG.CHANNEL_SECRET)
    .update(body)
    .digest('base64');
  return hash === signature;
}

/**
 * 会話コンテキストを取得
 * @param userId - ユーザーID
 * @returns 会話コンテキスト
 */
function getContext(userId: string): ConversationContext {
  if (!conversationContexts.has(userId)) {
    conversationContexts.set(userId, {
      userId,
      state: 'idle',
      lastUpdated: new Date().toISOString(),
    });
  }
  return conversationContexts.get(userId)!;
}

/**
 * 会話コンテキストを更新
 * @param userId - ユーザーID
 * @param updates - 更新内容
 */
function updateContext(
  userId: string,
  updates: Partial<ConversationContext>
): void {
  const context = getContext(userId);
  Object.assign(context, updates, { lastUpdated: new Date().toISOString() });
  conversationContexts.set(userId, context);
}

/**
 * 会話コンテキストをリセット
 * @param userId - ユーザーID
 */
function resetContext(userId: string): void {
  conversationContexts.set(userId, {
    userId,
    state: 'idle',
    lastUpdated: new Date().toISOString(),
  });
}

/**
 * フォローイベントの処理
 * @param event - フォローイベント
 */
async function handleFollow(event: FollowEvent): Promise<void> {
  await replyMessage(event.replyToken, createTextMessage(MESSAGES.WELCOME));
}

/**
 * メッセージイベントの処理
 * @param event - メッセージイベント
 */
async function handleMessage(event: MessageEvent): Promise<void> {
  if (event.message.type !== 'text') {
    return;
  }

  const userId = event.source.userId!;
  const text = event.message.text!;
  const context = getContext(userId);

  // 会話の状態に応じて処理を分岐
  switch (context.state) {
    case 'idle':
      await handleIdleMessage(event, text);
      break;
    case 'registering_category':
      await handleCategoryInput(event, userId, text);
      break;
    case 'registering_name':
      await handleNameInput(event, userId, text);
      break;
    case 'registering_quantity':
      await handleQuantityInput(event, userId, text);
      break;
    case 'registering_expiry':
      await handleExpiryInput(event, userId, text);
      break;
    default:
      await replyMessage(
        event.replyToken,
        createTextMessage('リッチメニューから操作を選択してください。')
      );
  }
}

/**
 * アイドル状態でのメッセージ処理
 * @param event - メッセージイベント
 * @param text - メッセージテキスト
 */
async function handleIdleMessage(
  event: MessageEvent,
  text: string
): Promise<void> {
  // 簡易的なコマンド処理
  if (text === '登録' || text.includes('登録')) {
    await startRegistration(event);
  } else if (text === '一覧' || text.includes('一覧')) {
    await showList(event);
  } else if (text === 'ヘルプ' || text.includes('ヘルプ')) {
    await replyMessage(event.replyToken, createTextMessage(MESSAGES.HELP));
  } else {
    await replyMessage(
      event.replyToken,
      createTextMessage('リッチメニューから操作を選択してください。')
    );
  }
}

/**
 * 食品登録を開始
 * @param event - メッセージイベント
 */
async function startRegistration(event: MessageEvent): Promise<void> {
  const userId = event.source.userId!;
  updateContext(userId, {
    state: 'registering_category',
    data: {},
  });
  await replyMessage(event.replyToken, createCategoryQuickReply());
}

/**
 * カテゴリ入力の処理
 * @param event - メッセージイベント
 * @param userId - ユーザーID
 * @param text - 入力テキスト
 */
async function handleCategoryInput(
  event: MessageEvent,
  userId: string,
  text: string
): Promise<void> {
  const validCategories: Category[] = ['water', 'staple', 'dish', 'snack', 'other'];

  if (!validCategories.includes(text as Category)) {
    await replyMessage(
      event.replyToken,
      createTextMessage('正しいカテゴリを選択してください。')
    );
    return;
  }

  const category = text as Category;
  updateContext(userId, {
    state: 'registering_name',
    data: { category },
  });

  await replyMessage(
    event.replyToken,
    createTextMessage(MESSAGES.REGISTER_NAME)
  );
}

/**
 * 食品名入力の処理
 * @param event - メッセージイベント
 * @param userId - ユーザーID
 * @param text - 入力テキスト
 */
async function handleNameInput(
  event: MessageEvent,
  userId: string,
  text: string
): Promise<void> {
  if (!text || text.trim().length === 0) {
    await replyMessage(
      event.replyToken,
      createTextMessage(MESSAGES.ERROR_EMPTY_NAME)
    );
    return;
  }

  const context = getContext(userId);
  updateContext(userId, {
    state: 'registering_quantity',
    data: {
      ...context.data,
      itemName: text.trim(),
    },
  });

  await replyMessage(event.replyToken, createQuantityQuickReply());
}

/**
 * 数量入力の処理
 * @param event - メッセージイベント
 * @param userId - ユーザーID
 * @param text - 入力テキスト
 */
async function handleQuantityInput(
  event: MessageEvent,
  userId: string,
  text: string
): Promise<void> {
  const quantity = parseInt(text, 10);

  if (isNaN(quantity) || quantity < 1) {
    await replyMessage(
      event.replyToken,
      createTextMessage(MESSAGES.ERROR_INVALID_QUANTITY)
    );
    return;
  }

  const context = getContext(userId);
  updateContext(userId, {
    state: 'registering_expiry',
    data: {
      ...context.data,
      quantity,
    },
  });

  await replyMessage(
    event.replyToken,
    createTextMessage(MESSAGES.REGISTER_EXPIRY)
  );
}

/**
 * 賞味期限入力の処理
 * @param event - メッセージイベント
 * @param userId - ユーザーID
 * @param text - 入力テキスト
 */
async function handleExpiryInput(
  event: MessageEvent,
  userId: string,
  text: string
): Promise<void> {
  if (!isValidDateFormat(text)) {
    await replyMessage(
      event.replyToken,
      createTextMessage(MESSAGES.ERROR_INVALID_DATE)
    );
    return;
  }

  if (!isTodayOrFuture(text)) {
    await replyMessage(
      event.replyToken,
      createTextMessage(MESSAGES.ERROR_PAST_DATE)
    );
    return;
  }

  const context = getContext(userId);
  const { category, itemName, quantity } = context.data!;

  // 確認メッセージを表示
  const confirmText = MESSAGES.REGISTER_CONFIRM(
    itemName!,
    CATEGORY_LABELS[category!],
    quantity!,
    formatDateToJapanese(text)
  );

  updateContext(userId, {
    state: 'confirming_registration',
    data: {
      ...context.data,
      expiryDate: text,
    },
  });

  await replyMessage(
    event.replyToken,
    createConfirmTemplate(
      confirmText,
      POSTBACK_ACTIONS.CONFIRM,
      POSTBACK_ACTIONS.CANCEL
    )
  );
}

/**
 * ポストバックイベントの処理
 * @param event - ポストバックイベント
 */
async function handlePostback(event: PostbackEvent): Promise<void> {
  const userId = event.source.userId!;
  const data = new URLSearchParams(event.postback.data);
  const action = data.get('action');

  switch (action) {
    case POSTBACK_ACTIONS.REGISTER:
      await startRegistration(event as unknown as MessageEvent);
      break;
    case POSTBACK_ACTIONS.LIST:
      await showList(event as unknown as MessageEvent);
      break;
    case POSTBACK_ACTIONS.HELP:
      await replyMessage(event.replyToken, createTextMessage(MESSAGES.HELP));
      break;
    case POSTBACK_ACTIONS.CONFIRM:
      await confirmRegistration(event, userId);
      break;
    case POSTBACK_ACTIONS.CANCEL:
      await cancelOperation(event, userId);
      break;
    case POSTBACK_ACTIONS.CONSUME:
      await handleConsume(event, userId, data.get('itemId')!);
      break;
    case POSTBACK_ACTIONS.DELETE:
      await handleDelete(event, userId, data.get('itemId')!);
      break;
    default:
      await replyMessage(
        event.replyToken,
        createTextMessage('不明な操作です。')
      );
  }
}

/**
 * 登録を確定
 * @param event - ポストバックイベント
 * @param userId - ユーザーID
 */
async function confirmRegistration(
  event: PostbackEvent,
  userId: string
): Promise<void> {
  const context = getContext(userId);

  if (context.state !== 'confirming_registration' || !context.data) {
    await replyMessage(
      event.replyToken,
      createTextMessage(MESSAGES.ERROR_GENERAL)
    );
    return;
  }

  const { category, itemName, quantity, expiryDate } = context.data;

  try {
    await createItem(
      userId,
      itemName!,
      category!,
      quantity!,
      expiryDate!
    );

    resetContext(userId);
    await replyMessage(
      event.replyToken,
      createTextMessage(MESSAGES.REGISTER_SUCCESS)
    );
  } catch (error) {
    console.error('Error creating item:', error);
    await replyMessage(
      event.replyToken,
      createTextMessage(MESSAGES.ERROR_GENERAL)
    );
  }
}

/**
 * 操作をキャンセル
 * @param event - ポストバックイベント
 * @param userId - ユーザーID
 */
async function cancelOperation(
  event: PostbackEvent,
  userId: string
): Promise<void> {
  resetContext(userId);
  await replyMessage(
    event.replyToken,
    createTextMessage(MESSAGES.REGISTER_CANCEL)
  );
}

/**
 * 一覧を表示
 * @param event - メッセージイベント
 */
async function showList(event: MessageEvent | PostbackEvent): Promise<void> {
  const userId = event.source.userId!;

  try {
    const items = await getItemsByUserId(userId);
    const flexMessage = createFoodListFlexMessage(items);
    await replyMessage(event.replyToken, flexMessage);
  } catch (error) {
    console.error('Error fetching items:', error);
    await replyMessage(
      event.replyToken,
      createTextMessage(MESSAGES.ERROR_GENERAL)
    );
  }
}

/**
 * 消費（数量変更）を処理
 * @param event - ポストバックイベント
 * @param userId - ユーザーID
 * @param itemId - 食品ID
 */
async function handleConsume(
  event: PostbackEvent,
  userId: string,
  itemId: string
): Promise<void> {
  try {
    const item = await getItemById(userId, itemId);

    if (!item) {
      await replyMessage(
        event.replyToken,
        createTextMessage('食品が見つかりませんでした。')
      );
      return;
    }

    const newQuantity = item.quantity - 1;

    if (newQuantity <= 0) {
      await deleteItem(userId, itemId);
      await replyMessage(
        event.replyToken,
        createTextMessage(MESSAGES.UPDATE_DELETED)
      );
    } else {
      await updateItemQuantity(userId, itemId, newQuantity);
      await replyMessage(
        event.replyToken,
        createTextMessage(MESSAGES.UPDATE_SUCCESS)
      );
    }
  } catch (error) {
    console.error('Error consuming item:', error);
    await replyMessage(
      event.replyToken,
      createTextMessage(MESSAGES.ERROR_GENERAL)
    );
  }
}

/**
 * 削除を処理
 * @param event - ポストバックイベント
 * @param userId - ユーザーID
 * @param itemId - 食品ID
 */
async function handleDelete(
  event: PostbackEvent,
  userId: string,
  itemId: string
): Promise<void> {
  try {
    const item = await getItemById(userId, itemId);

    if (!item) {
      await replyMessage(
        event.replyToken,
        createTextMessage('食品が見つかりませんでした。')
      );
      return;
    }

    const confirmText = MESSAGES.DELETE_CONFIRM(item.itemName);

    await replyMessage(
      event.replyToken,
      createConfirmTemplate(
        confirmText,
        `action=confirm_delete&itemId=${itemId}`,
        POSTBACK_ACTIONS.CANCEL
      )
    );
  } catch (error) {
    console.error('Error deleting item:', error);
    await replyMessage(
      event.replyToken,
      createTextMessage(MESSAGES.ERROR_GENERAL)
    );
  }
}

/**
 * Lambda ハンドラー
 * @param event - API Gatewayイベント
 * @returns Lambda レスポンス
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // 署名検証
    const signature = event.headers['x-line-signature'] || event.headers['X-Line-Signature'];
    if (!signature || !verifySignature(event.body || '', signature)) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid signature' }),
      };
    }

    // イベントをパース
    const body = JSON.parse(event.body || '{}');
    const events: WebhookEvent[] = body.events || [];

    // 各イベントを処理
    await Promise.all(
      events.map(async (webhookEvent) => {
        switch (webhookEvent.type) {
          case 'message':
            await handleMessage(webhookEvent);
            break;
          case 'postback':
            await handlePostback(webhookEvent);
            break;
          case 'follow':
            await handleFollow(webhookEvent);
            break;
          default:
            console.log('Unhandled event type:', (webhookEvent as WebhookEvent).type);
        }
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'OK' }),
    };
  } catch (error) {
    console.error('Error handling webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
}
