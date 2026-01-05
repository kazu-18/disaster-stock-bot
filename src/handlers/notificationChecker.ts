/**
 * Notification Checker Handler
 * 定期的に賞味期限をチェックし、通知を送信する
 */

import { ScheduledEvent } from 'aws-lambda';
import { scanAllItems } from '../services/dynamoService';
import {
  pushMessage,
  createNotificationFlexMessage,
} from '../services/lineService';
import { getDaysUntilExpiry } from '../utils/dateUtils';
import { NOTIFICATION_DAYS } from '../config/constants';
import { StockItem } from '../types';

/**
 * 通知対象をユーザーごとにグループ化
 * @param items - 全食品アイテム
 * @param targetDays - 対象日数（30, 7, 0）
 * @returns ユーザーごとの通知対象
 */
function groupNotificationTargets(
  items: StockItem[],
  targetDays: number
): Map<string, StockItem[]> {
  const grouped = new Map<string, StockItem[]>();

  for (const item of items) {
    const daysUntil = getDaysUntilExpiry(item.expiryDate);

    // 指定日数と一致する場合のみ通知対象
    if (daysUntil === targetDays) {
      if (!grouped.has(item.userId)) {
        grouped.set(item.userId, []);
      }
      grouped.get(item.userId)!.push(item);
    }
  }

  return grouped;
}

/**
 * 通知を送信
 * @param userId - ユーザーID
 * @param items - 通知対象の食品
 * @param notificationType - 通知タイプ
 */
async function sendNotification(
  userId: string,
  items: StockItem[],
  notificationType: '30日前' | '7日前' | '当日'
): Promise<void> {
  try {
    const message = createNotificationFlexMessage(items, notificationType);
    await pushMessage(userId, message);
    console.log(
      `Notification sent to ${userId}: ${notificationType}, ${items.length} items`
    );
  } catch (error) {
    console.error(`Error sending notification to ${userId}:`, error);
  }
}

/**
 * Lambda ハンドラー
 * EventBridgeから定期的に呼び出される
 * @param event - スケジュールイベント
 */
export async function handler(event: ScheduledEvent): Promise<void> {
  console.log('Notification checker started:', event.time);

  try {
    // 全食品アイテムを取得
    const allItems = await scanAllItems();
    console.log(`Total items scanned: ${allItems.length}`);

    // 各通知タイミングでグループ化
    const thirtyDaysTargets = groupNotificationTargets(
      allItems,
      NOTIFICATION_DAYS.THIRTY_DAYS
    );
    const sevenDaysTargets = groupNotificationTargets(
      allItems,
      NOTIFICATION_DAYS.SEVEN_DAYS
    );
    const todayTargets = groupNotificationTargets(
      allItems,
      NOTIFICATION_DAYS.TODAY
    );

    console.log('Notification targets:');
    console.log(`  30 days: ${thirtyDaysTargets.size} users`);
    console.log(`  7 days: ${sevenDaysTargets.size} users`);
    console.log(`  Today: ${todayTargets.size} users`);

    // 30日前の通知
    for (const [userId, items] of thirtyDaysTargets.entries()) {
      await sendNotification(userId, items, '30日前');
    }

    // 7日前の通知
    for (const [userId, items] of sevenDaysTargets.entries()) {
      await sendNotification(userId, items, '7日前');
    }

    // 当日の通知
    for (const [userId, items] of todayTargets.entries()) {
      await sendNotification(userId, items, '当日');
    }

    console.log('Notification checker completed successfully');
  } catch (error) {
    console.error('Error in notification checker:', error);
    throw error;
  }
}
