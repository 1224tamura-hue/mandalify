// 進捗管理関連のユーティリティ関数

import { Action } from "./types";

/**
 * 期限の状態を返す
 * - "overdue": 今日以前（期限切れ）
 * - "soon": 3日以内
 * - "normal": それ以外
 * - null: 未設定
 */
export function getDueDateStatus(
  dueDate?: string
): "overdue" | "soon" | "normal" | null {
  if (!dueDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.floor(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "soon";
  return "normal";
}

/**
 * サブゴールの健康状態を返す（直近の完了日時を元に判定）
 * - "green": 7日以内に完了あり
 * - "yellow": 8-30日完了なし（アクションはあるが未完了 or 古い）
 * - "red": 31日以上完了なし
 * - "gray": アクションが0件
 */
export function getSubGoalHealth(
  actions: Action[]
): "green" | "yellow" | "red" | "gray" {
  if (actions.length === 0) return "gray";

  const completedActions = actions.filter(
    (a) => a.completed && a.completed_at
  );
  if (completedActions.length === 0) return "yellow";

  const latestCompletedAt = completedActions.reduce((latest, a) => {
    const date = new Date(a.completed_at!);
    return date > latest ? date : latest;
  }, new Date(0));

  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - latestCompletedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays <= 7) return "green";
  if (diffDays <= 30) return "yellow";
  return "red";
}

/**
 * 直近 days 日分の日別完了数を集計した Map を返す
 * キー: "YYYY-MM-DD"（ローカル時刻）
 */
export function buildHeatmapData(
  actions: Action[],
  days: number
): Map<string, number> {
  const map = new Map<string, number>();

  // 直近 days 日分の日付キーを初期化（0件で）
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    map.set(toLocalDateString(d), 0);
  }

  // completed_at がある完了アクションを集計
  for (const action of actions) {
    if (!action.completed || !action.completed_at) continue;
    const dateKey = toLocalDateString(new Date(action.completed_at));
    if (map.has(dateKey)) {
      map.set(dateKey, (map.get(dateKey) ?? 0) + 1);
    }
  }

  return map;
}

/** Date を "YYYY-MM-DD"（ローカルタイムゾーン）に変換 */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
