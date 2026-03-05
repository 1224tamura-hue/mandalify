"use client";

// マンダラチャートの各セルコンポーネント

import { Action, CellInfo, Goal } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getDueDateStatus } from "@/lib/dateUtils";
import { SubGoalHealthIndicator } from "./SubGoalHealthIndicator";

interface MandalaCellProps {
  cellInfo: CellInfo;
  goal: Goal;
  activeSubGoalId: number | null; // 現在編集中のブロックのサブゴールID
  currentStep: number; // 現在のSTEP (1-4)
  allActions: Action[]; // サブゴールヘルスメーター用
  onCellClick: (cellInfo: CellInfo) => void;
  onActionToggle: (actionId: number) => void;
  onActionCellClick: (actionId: number) => void; // STEP4でダイアログを開く
}

const PRIORITY_DOT: Record<"high" | "medium" | "low", string> = {
  high: "bg-red-500",
  medium: "bg-yellow-400",
  low: "bg-blue-400",
};

export function MandalaCell({
  cellInfo,
  goal,
  activeSubGoalId,
  currentStep,
  allActions,
  onCellClick,
  onActionCellClick,
}: MandalaCellProps) {
  const { type, dataId, subGoalId } = cellInfo;

  // セルのテキストを取得する
  const getText = (): string => {
    if (type === "center") return goal.center || "";
    if (type === "sub_goal" && dataId !== undefined) {
      return goal.sub_goals.find((s) => s.id === dataId)?.text || "";
    }
    if (type === "action" && dataId !== undefined) {
      return goal.actions.find((a) => a.id === dataId)?.text || "";
    }
    return "";
  };

  // アクションデータを取得する
  const action =
    type === "action" && dataId !== undefined
      ? goal.actions.find((a) => a.id === dataId)
      : undefined;

  const isCompleted = action?.completed ?? false;
  const priority = action?.priority;
  const dueDateStatus = getDueDateStatus(action?.due_date);

  // 現在アクティブなブロックかどうか（黄色ハイライト）
  const isActiveBlock =
    (type === "action" && subGoalId === activeSubGoalId) ||
    (type === "sub_goal" && dataId === activeSubGoalId);

  // このサブゴールに属するアクション（ヘルスメーター用）
  const subGoalActions =
    type === "sub_goal" && dataId !== undefined
      ? allActions.filter((a) => a.sub_goal_id === dataId)
      : [];

  // セルの背景色クラスを決定する
  const cellClassName = cn(
    "relative flex items-center justify-center text-center p-0.5 text-[10px] leading-tight",
    "border overflow-hidden cursor-pointer",
    "transition-colors duration-150 select-none",
    {
      // 中心セル: インディゴ背景・白文字・太字
      "bg-indigo-600 text-white font-bold text-xs border-gray-200":
        type === "center",
      // サブゴールセル: 薄いインディゴ・セミボールド
      "bg-indigo-200 font-semibold text-xs border-gray-200":
        type === "sub_goal" && !isActiveBlock,
      // アクティブなサブゴールセル
      "bg-indigo-300 border-indigo-400 font-semibold text-xs":
        isActiveBlock && type === "sub_goal",
      // アクションセル（未完了・非アクティブ）
      "bg-white hover:bg-gray-50 border-gray-200":
        type === "action" && !isCompleted && !isActiveBlock,
      // アクションセル（完了済み）
      "bg-green-100 text-green-700 border-gray-200":
        type === "action" && isCompleted,
      // アクティブブロックのハイライト（完了済みは除く）
      "bg-yellow-50 border-yellow-300":
        isActiveBlock && !isCompleted && type === "action",
      // 期限切れ: 赤い縁取り（優先度より強い）
      "ring-2 ring-red-500 ring-inset":
        type === "action" && dueDateStatus === "overdue",
      // 期限まもなく: オレンジ縁取り
      "ring-2 ring-orange-400 ring-inset":
        type === "action" && dueDateStatus === "soon",
    }
  );

  const text = getText();

  return (
    <div
      className={cellClassName}
      onClick={() => {
        // STEP4かつアクションセルの場合はダイアログを開く
        if (type === "action" && dataId !== undefined && currentStep === 4) {
          onActionCellClick(dataId);
        } else {
          onCellClick(cellInfo);
        }
      }}
      title={text}
    >
      {/* 優先度ドット（STEP4のアクションセルのみ） */}
      {type === "action" && priority && currentStep === 4 && (
        <span
          className={`absolute top-0.5 left-0.5 w-2 h-2 rounded-full ${PRIORITY_DOT[priority]}`}
        />
      )}

      {/* サブゴールヘルスメーター */}
      {type === "sub_goal" && currentStep === 4 && (
        <SubGoalHealthIndicator actions={subGoalActions} />
      )}

      {/* テキスト表示 */}
      <span
        className={cn("line-clamp-3 w-full", {
          "line-through text-gray-400": isCompleted,
          "pl-2": type === "action" && priority && currentStep === 4,
        })}
      >
        {text}
      </span>
    </div>
  );
}
