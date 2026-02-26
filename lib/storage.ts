// localStorageの読み書きユーティリティ

import { Goal } from "./types";

const STORAGE_KEY = "mandalify_goals";

// 全ゴールを取得する
export function loadGoals(): Goal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Goal[];
  } catch {
    return [];
  }
}

// 1つのゴールを保存/更新する（同じIDがあれば上書き）
export function saveGoal(goal: Goal): void {
  const goals = loadGoals();
  const index = goals.findIndex((g) => g.id === goal.id);
  if (index >= 0) {
    goals[index] = goal;
  } else {
    goals.unshift(goal); // 新しいものを先頭に追加
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

// 指定IDのゴールを削除する
export function deleteGoal(id: string): void {
  const goals = loadGoals().filter((g) => g.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

// 新しい空のゴールを生成する
export function createNewGoal(): Goal {
  return {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    center: "",
    sub_goals: [],
    actions: [],
    chat_history: [],
    current_step: 1,
  };
}
