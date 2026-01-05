/**
 * 日付関連のユーティリティ関数
 */

/**
 * 現在日時をISO 8601形式で取得
 * @returns ISO 8601形式の日時文字列（例: "2026-01-05T10:30:00.000Z"）
 */
export function getCurrentISOString(): string {
  return new Date().toISOString();
}

/**
 * 現在日付をYYYY-MM-DD形式で取得
 * @returns YYYY-MM-DD形式の日付文字列（例: "2026-01-05"）
 */
export function getCurrentDate(): string {
  const now = new Date();
  return formatDateToYYYYMMDD(now);
}

/**
 * DateオブジェクトをYYYY-MM-DD形式にフォーマット
 * @param date - Dateオブジェクト
 * @returns YYYY-MM-DD形式の日付文字列
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * YYYY-MM-DD形式の文字列をDateオブジェクトに変換
 * @param dateString - YYYY-MM-DD形式の日付文字列
 * @returns Dateオブジェクト
 */
export function parseYYYYMMDD(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 日付文字列が有効なYYYY-MM-DD形式かバリデーション
 * @param dateString - 検証する日付文字列
 * @returns 有効な場合true、無効な場合false
 */
export function isValidDateFormat(dateString: string): boolean {
  // YYYY-MM-DD形式の正規表現
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!dateRegex.test(dateString)) {
    return false;
  }

  // 実際に有効な日付かチェック
  const date = parseYYYYMMDD(dateString);

  // Invalid Dateでないかチェック
  if (isNaN(date.getTime())) {
    return false;
  }

  // フォーマットした結果が元の文字列と一致するかチェック
  // （例: "2026-02-30"のような無効な日付を弾く）
  return formatDateToYYYYMMDD(date) === dateString;
}

/**
 * 日付が今日以降かチェック
 * @param dateString - YYYY-MM-DD形式の日付文字列
 * @returns 今日以降の場合true、過去の場合false
 */
export function isTodayOrFuture(dateString: string): boolean {
  const targetDate = parseYYYYMMDD(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 時刻をリセット

  return targetDate >= today;
}

/**
 * 2つの日付の差（日数）を計算
 * @param dateString1 - YYYY-MM-DD形式の日付文字列
 * @param dateString2 - YYYY-MM-DD形式の日付文字列
 * @returns 日数の差（dateString1 - dateString2）
 */
export function getDaysDifference(dateString1: string, dateString2: string): number {
  const date1 = parseYYYYMMDD(dateString1);
  const date2 = parseYYYYMMDD(dateString2);

  const diffTime = date1.getTime() - date2.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * 賞味期限までの残り日数を計算
 * @param expiryDate - YYYY-MM-DD形式の賞味期限
 * @returns 残り日数（当日は0、過去の場合は負の値）
 */
export function getDaysUntilExpiry(expiryDate: string): number {
  const today = getCurrentDate();
  return getDaysDifference(expiryDate, today);
}

/**
 * 賞味期限が指定日数前かチェック
 * @param expiryDate - YYYY-MM-DD形式の賞味期限
 * @param days - 日数（例: 30, 7, 0）
 * @returns 指定日数前の場合true
 */
export function isExpiryInDays(expiryDate: string, days: number): boolean {
  const daysUntil = getDaysUntilExpiry(expiryDate);
  return daysUntil === days;
}

/**
 * 賞味期限が指定日数以内かチェック
 * @param expiryDate - YYYY-MM-DD形式の賞味期限
 * @param days - 日数（例: 30）
 * @returns 指定日数以内の場合true
 */
export function isExpiryWithinDays(expiryDate: string, days: number): boolean {
  const daysUntil = getDaysUntilExpiry(expiryDate);
  return daysUntil >= 0 && daysUntil <= days;
}

/**
 * 賞味期限が切れているかチェック
 * @param expiryDate - YYYY-MM-DD形式の賞味期限
 * @returns 期限切れの場合true
 */
export function isExpired(expiryDate: string): boolean {
  return getDaysUntilExpiry(expiryDate) < 0;
}

/**
 * 残り日数を人間が読める形式にフォーマット
 * @param daysRemaining - 残り日数
 * @returns フォーマットされた文字列（例: "あと30日", "本日", "期限切れ"）
 */
export function formatDaysRemaining(daysRemaining: number): string {
  if (daysRemaining < 0) {
    return '期限切れ';
  } else if (daysRemaining === 0) {
    return '本日';
  } else {
    return `あと${daysRemaining}日`;
  }
}

/**
 * 日付を日本語形式にフォーマット
 * @param dateString - YYYY-MM-DD形式の日付文字列
 * @returns 日本語形式の日付文字列（例: "2026年1月5日"）
 */
export function formatDateToJapanese(dateString: string): string {
  const date = parseYYYYMMDD(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}
