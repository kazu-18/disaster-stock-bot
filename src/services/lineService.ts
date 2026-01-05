/**
 * LINE Messaging APIサービス
 * メッセージの送受信、リッチメニュー、Flex Messageなどを担当
 */

import { Client, Message, FlexMessage, FlexBubble, FlexBox } from '@line/bot-sdk';
import { StockItem, Category, CATEGORY_LABELS } from '../types';
import {
  getDaysUntilExpiry,
  formatDaysRemaining,
  formatDateToJapanese,
  isExpired,
} from '../utils/dateUtils';
import { LINE_CONFIG, MESSAGES, QUICK_REPLY_OPTIONS } from '../config/constants';

// LINEクライアントの初期化
const client = new Client({
  channelAccessToken: LINE_CONFIG.CHANNEL_ACCESS_TOKEN,
  channelSecret: LINE_CONFIG.CHANNEL_SECRET,
});

/**
 * 返信メッセージを送信
 * @param replyToken - 返信トークン
 * @param messages - 送信するメッセージ
 */
export async function replyMessage(
  replyToken: string,
  messages: Message | Message[]
): Promise<void> {
  const messageArray = Array.isArray(messages) ? messages : [messages];
  await client.replyMessage(replyToken, messageArray);
}

/**
 * プッシュメッセージを送信
 * @param userId - LINEユーザーID
 * @param messages - 送信するメッセージ
 */
export async function pushMessage(
  userId: string,
  messages: Message | Message[]
): Promise<void> {
  const messageArray = Array.isArray(messages) ? messages : [messages];
  await client.pushMessage(userId, messageArray);
}

/**
 * テキストメッセージを作成
 * @param text - メッセージテキスト
 * @returns テキストメッセージ
 */
export function createTextMessage(text: string): Message {
  return {
    type: 'text',
    text,
  };
}

/**
 * カテゴリ選択のクイックリプライを作成
 * @returns クイックリプライ付きメッセージ
 */
export function createCategoryQuickReply(): Message {
  return {
    type: 'text',
    text: MESSAGES.REGISTER_START,
    quickReply: {
      items: QUICK_REPLY_OPTIONS.CATEGORIES.map((option) => ({
        type: 'action',
        action: {
          type: 'message',
          label: option.label,
          text: option.value,
        },
      })),
    },
  };
}

/**
 * 数量選択のクイックリプライを作成
 * @returns クイックリプライ付きメッセージ
 */
export function createQuantityQuickReply(): Message {
  return {
    type: 'text',
    text: MESSAGES.REGISTER_QUANTITY,
    quickReply: {
      items: QUICK_REPLY_OPTIONS.QUANTITIES.map((option) => ({
        type: 'action',
        action: {
          type: 'message',
          label: option.label,
          text: option.value,
        },
      })),
    },
  };
}

/**
 * 確認テンプレートを作成
 * @param text - 確認メッセージ
 * @param confirmData - 確認時のポストバックデータ
 * @param cancelData - キャンセル時のポストバックデータ
 * @returns 確認テンプレートメッセージ
 */
export function createConfirmTemplate(
  text: string,
  confirmData: string,
  cancelData: string
): Message {
  return {
    type: 'template',
    altText: text,
    template: {
      type: 'confirm',
      text,
      actions: [
        {
          type: 'postback',
          label: '✅ はい',
          data: confirmData,
        },
        {
          type: 'postback',
          label: '❌ いいえ',
          data: cancelData,
        },
      ],
    },
  };
}

/**
 * 食品一覧のFlex Messageを作成
 * @param items - 食品アイテムの配列
 * @returns Flex Message
 */
export function createFoodListFlexMessage(items: StockItem[]): FlexMessage {
  if (items.length === 0) {
    // 空の場合はシンプルなバブル
    const emptyBubble: FlexBubble = {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: MESSAGES.LIST_EMPTY,
            wrap: true,
            color: '#666666',
          },
        ],
      },
    };

    return {
      type: 'flex',
      altText: MESSAGES.LIST_TITLE,
      contents: emptyBubble,
    };
  }

  // カテゴリごとにグループ化
  const groupedItems: Record<Category, StockItem[]> = {
    water: [],
    staple: [],
    dish: [],
    snack: [],
    other: [],
  };

  for (const item of items) {
    groupedItems[item.category].push(item);
  }

  // 各カテゴリごとのバブルを作成
  const bubbles: FlexBubble[] = [];

  for (const category of Object.keys(groupedItems) as Category[]) {
    const categoryItems = groupedItems[category];
    if (categoryItems.length === 0) continue;

    const itemBoxes: FlexBox[] = categoryItems.map((item) => {
      const daysRemaining = getDaysUntilExpiry(item.expiryDate);
      const isExpiredItem = isExpired(item.expiryDate);
      const textColor = isExpiredItem ? '#FF0000' : daysRemaining <= 7 ? '#FF6B00' : '#111111';

      return {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: item.itemName,
                weight: 'bold',
                size: 'md',
                flex: 2,
                wrap: true,
              },
              {
                type: 'text',
                text: `${item.quantity}個`,
                size: 'sm',
                color: '#666666',
                flex: 1,
                align: 'end',
              },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: formatDateToJapanese(item.expiryDate),
                size: 'sm',
                color: textColor,
                flex: 2,
              },
              {
                type: 'text',
                text: formatDaysRemaining(daysRemaining),
                size: 'sm',
                color: textColor,
                flex: 1,
                align: 'end',
                weight: 'bold',
              },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'button',
                action: {
                  type: 'postback',
                  label: '消費',
                  data: `action=consume&itemId=${item.itemId}`,
                },
                style: 'primary',
                height: 'sm',
                flex: 1,
              },
              {
                type: 'button',
                action: {
                  type: 'postback',
                  label: '削除',
                  data: `action=delete&itemId=${item.itemId}`,
                },
                style: 'secondary',
                height: 'sm',
                flex: 1,
              },
            ],
            spacing: 'sm',
            margin: 'md',
          },
        ],
        spacing: 'sm',
        margin: 'lg',
        paddingAll: '12px',
        backgroundColor: '#F7F7F7',
        cornerRadius: '8px',
      };
    });

    const bubble: FlexBubble = {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: CATEGORY_LABELS[category],
            weight: 'bold',
            size: 'lg',
            color: '#FFFFFF',
          },
        ],
        backgroundColor: '#3B82F6',
        paddingAll: '12px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: itemBoxes,
        spacing: 'md',
      },
    };

    bubbles.push(bubble);
  }

  return {
    type: 'flex',
    altText: MESSAGES.LIST_TITLE,
    contents: {
      type: 'carousel',
      contents: bubbles,
    },
  };
}

/**
 * 通知メッセージのFlex Messageを作成
 * @param items - 通知対象の食品アイテム
 * @param notificationType - 通知タイプ（30日前、7日前、当日）
 * @returns Flex Message
 */
export function createNotificationFlexMessage(
  items: StockItem[],
  notificationType: '30日前' | '7日前' | '当日'
): FlexMessage {
  const headerText =
    notificationType === '当日'
      ? '⚠️ 本日が賞味期限です'
      : `🔔 賞味期限${notificationType}の食品`;

  const itemBoxes: FlexBox[] = items.map((item) => ({
    type: 'box',
    layout: 'horizontal',
    contents: [
      {
        type: 'text',
        text: item.itemName,
        size: 'sm',
        flex: 2,
        wrap: true,
      },
      {
        type: 'text',
        text: `${item.quantity}個`,
        size: 'sm',
        color: '#666666',
        flex: 1,
        align: 'end',
      },
    ],
    spacing: 'sm',
  }));

  const bubble: FlexBubble = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: headerText,
          weight: 'bold',
          size: 'lg',
          color: '#FFFFFF',
        },
      ],
      backgroundColor: notificationType === '当日' ? '#EF4444' : '#F59E0B',
      paddingAll: '12px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: itemBoxes,
      spacing: 'md',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'postback',
            label: '📋 一覧を見る',
            data: 'action=list',
          },
          style: 'primary',
          height: 'sm',
        },
      ],
    },
  };

  return {
    type: 'flex',
    altText: `${headerText}: ${items.length}件`,
    contents: bubble,
  };
}

export { client as lineClient };
