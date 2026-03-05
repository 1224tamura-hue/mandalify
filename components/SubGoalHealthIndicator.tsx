"use client";

// サブゴールの健康状態を色付きドットで表示するコンポーネント

import { Action } from "@/lib/types";
import { getSubGoalHealth } from "@/lib/dateUtils";

interface SubGoalHealthIndicatorProps {
  actions: Action[];
}

const HEALTH_COLORS: Record<ReturnType<typeof getSubGoalHealth>, string> = {
  green: "bg-green-400",
  yellow: "bg-yellow-400",
  red: "bg-red-400",
  gray: "bg-gray-300",
};

export function SubGoalHealthIndicator({ actions }: SubGoalHealthIndicatorProps) {
  const health = getSubGoalHealth(actions);
  if (health === "gray") return null; // アクション未設定は非表示

  return (
    <span
      className={`absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full ${HEALTH_COLORS[health]}`}
      title={
        health === "green"
          ? "活発（7日以内に完了あり）"
          : health === "yellow"
          ? "停滞中（8-30日完了なし）"
          : "放置（31日以上完了なし）"
      }
    />
  );
}
