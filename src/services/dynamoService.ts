/**
 * DynamoDBサービス
 * 食品データの永続化を担当
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { StockItem, Category } from '../types';
import { getCurrentISOString } from '../utils/dateUtils';
import { DYNAMODB_CONFIG, AWS_CONFIG } from '../config/constants';

// DynamoDBクライアントの初期化
const client = new DynamoDBClient({ region: AWS_CONFIG.REGION });
const docClient = DynamoDBDocumentClient.from(client);

/**
 * 食品アイテムを作成
 * @param userId - LINEユーザーID
 * @param itemName - 食品名
 * @param category - カテゴリ
 * @param quantity - 数量
 * @param expiryDate - 賞味期限（YYYY-MM-DD形式）
 * @returns 作成された食品アイテム
 */
export async function createItem(
  userId: string,
  itemName: string,
  category: Category,
  quantity: number,
  expiryDate: string
): Promise<StockItem> {
  const now = getCurrentISOString();
  const item: StockItem = {
    userId,
    itemId: uuidv4(),
    itemName,
    category,
    quantity,
    expiryDate,
    createdAt: now,
    updatedAt: now,
  };

  const command = new PutCommand({
    TableName: DYNAMODB_CONFIG.TABLE_NAME,
    Item: item,
  });

  await docClient.send(command);
  return item;
}

/**
 * ユーザーの全食品アイテムを取得
 * @param userId - LINEユーザーID
 * @returns 食品アイテムの配列
 */
export async function getItemsByUserId(userId: string): Promise<StockItem[]> {
  const command = new QueryCommand({
    TableName: DYNAMODB_CONFIG.TABLE_NAME,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
  });

  const response = await docClient.send(command);
  return (response.Items as StockItem[]) || [];
}

/**
 * 特定の食品アイテムを取得
 * @param userId - LINEユーザーID
 * @param itemId - 食品ID
 * @returns 食品アイテム（存在しない場合はundefined）
 */
export async function getItemById(
  userId: string,
  itemId: string
): Promise<StockItem | undefined> {
  const command = new GetCommand({
    TableName: DYNAMODB_CONFIG.TABLE_NAME,
    Key: {
      userId,
      itemId,
    },
  });

  const response = await docClient.send(command);
  return response.Item as StockItem | undefined;
}

/**
 * 食品アイテムの数量を更新
 * @param userId - LINEユーザーID
 * @param itemId - 食品ID
 * @param newQuantity - 新しい数量
 * @returns 更新された食品アイテム
 */
export async function updateItemQuantity(
  userId: string,
  itemId: string,
  newQuantity: number
): Promise<StockItem> {
  const now = getCurrentISOString();

  const command = new UpdateCommand({
    TableName: DYNAMODB_CONFIG.TABLE_NAME,
    Key: {
      userId,
      itemId,
    },
    UpdateExpression: 'SET quantity = :quantity, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':quantity': newQuantity,
      ':updatedAt': now,
    },
    ReturnValues: 'ALL_NEW',
  });

  const response = await docClient.send(command);
  return response.Attributes as StockItem;
}

/**
 * 食品アイテムを削除
 * @param userId - LINEユーザーID
 * @param itemId - 食品ID
 */
export async function deleteItem(userId: string, itemId: string): Promise<void> {
  const command = new DeleteCommand({
    TableName: DYNAMODB_CONFIG.TABLE_NAME,
    Key: {
      userId,
      itemId,
    },
  });

  await docClient.send(command);
}

/**
 * 賞味期限でクエリ（GSI使用）
 * @param userId - LINEユーザーID
 * @param expiryDate - 賞味期限（YYYY-MM-DD形式）
 * @returns 該当する食品アイテムの配列
 */
export async function queryByExpiryDate(
  userId: string,
  expiryDate: string
): Promise<StockItem[]> {
  const command = new QueryCommand({
    TableName: DYNAMODB_CONFIG.TABLE_NAME,
    IndexName: DYNAMODB_CONFIG.GSI_EXPIRY_DATE,
    KeyConditionExpression: 'userId = :userId AND expiryDate = :expiryDate',
    ExpressionAttributeValues: {
      ':userId': userId,
      ':expiryDate': expiryDate,
    },
  });

  const response = await docClient.send(command);
  return (response.Items as StockItem[]) || [];
}

/**
 * 賞味期限が指定日以前の食品アイテムを取得
 * @param userId - LINEユーザーID
 * @param maxExpiryDate - 最大賞味期限（この日付以前の食品を取得）
 * @returns 該当する食品アイテムの配列
 */
export async function getItemsExpiringBefore(
  userId: string,
  maxExpiryDate: string
): Promise<StockItem[]> {
  const command = new QueryCommand({
    TableName: DYNAMODB_CONFIG.TABLE_NAME,
    IndexName: DYNAMODB_CONFIG.GSI_EXPIRY_DATE,
    KeyConditionExpression: 'userId = :userId AND expiryDate <= :maxExpiryDate',
    ExpressionAttributeValues: {
      ':userId': userId,
      ':maxExpiryDate': maxExpiryDate,
    },
  });

  const response = await docClient.send(command);
  return (response.Items as StockItem[]) || [];
}

/**
 * 全ユーザーの全食品アイテムをスキャン（通知用）
 * @returns 全食品アイテムの配列
 */
export async function scanAllItems(): Promise<StockItem[]> {
  const command = new ScanCommand({
    TableName: DYNAMODB_CONFIG.TABLE_NAME,
  });

  const response = await docClient.send(command);
  return (response.Items as StockItem[]) || [];
}

/**
 * ユーザーの食品アイテムをカテゴリ別にグループ化
 * @param userId - LINEユーザーID
 * @returns カテゴリごとの食品アイテム
 */
export async function getItemsGroupedByCategory(
  userId: string
): Promise<Record<Category, StockItem[]>> {
  const items = await getItemsByUserId(userId);

  const grouped: Record<Category, StockItem[]> = {
    water: [],
    staple: [],
    dish: [],
    snack: [],
    other: [],
  };

  for (const item of items) {
    grouped[item.category].push(item);
  }

  // 各カテゴリ内で賞味期限順にソート
  for (const category in grouped) {
    grouped[category as Category].sort((a, b) =>
      a.expiryDate.localeCompare(b.expiryDate)
    );
  }

  return grouped;
}
