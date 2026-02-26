"use client";

// マンダラチャートの各セルコンポーネント

import { CellInfo, Goal } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MandalaCellProps {
  cellInfo: CellInfo;
  goal: Goal;
  activeSubGoalId: number | null; // 現在編集中のブロックのサブゴールID
  currentStep: number; // 現在のSTEP (1-4)
  onCellClick: (cellInfo: CellInfo) => void;
  onActionToggle: (actionId: number) => void;
}

export function MandalaCell({
  cellInfo,
  goal,
  activeSubGoalId,
  currentStep,
  onCellClick,
  onActionToggle,
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

  // アクションの完了状態を取得する
  const isCompleted =
    type === "action" && dataId !== undefined
      ? (goal.actions.find((a) => a.id === dataId)?.completed ?? false)
      : false;

  // 現在アクティブなブロックかどうか（黄色ハイライト）
  const isActiveBlock =
    (type === "action" && subGoalId === activeSubGoalId) ||
    (type === "sub_goal" && dataId === activeSubGoalId);

  // STEP4でアクションセルにチェックボックスを表示するか
  const showCheckbox = type === "action" && currentStep === 4;

  // セルの背景色クラスを決定する
  const cellClassName = cn(
    "flex items-center justify-center text-center p-0.5 text-[10px] leading-tight",
    "border border-gray-200 overflow-hidden cursor-pointer",
    "transition-colors duration-150 select-none",
    {
      // 中心セル: インディゴ背景・白文字・太字
      "bg-indigo-600 text-white font-bold text-xs": type === "center",
      // サブゴールセル: 薄いインディゴ・セミボールド
      "bg-indigo-200 font-semibold text-xs": type === "sub_goal",
      // アクションセル（未完了・非アクティブ）
      "bg-white hover:bg-gray-50":
        type === "action" && !isCompleted && !isActiveBlock,
      // アクションセル（完了済み）
      "bg-green-100 text-green-700": type === "action" && isCompleted,
      // アクティブブロックのハイライト（完了済みは除く）
      "bg-yellow-50 border-yellow-300":
        isActiveBlock && !isCompleted && type === "action",
      // アクティブなサブゴールセル
      "bg-indigo-300 border-indigo-400":
        isActiveBlock && type === "sub_goal",
    }
  );

  const text = getText();

  return (
    <div
      className={cellClassName}
      onClick={() => {
        // STEP4かつアクションセルの場合は完了トグル
        if (type === "action" && dataId !== undefined && currentStep === 4) {
          onActionToggle(dataId);
        } else {
          onCellClick(cellInfo);
        }
      }}
      title={text}
    >
      {showCheckbox && text ? (
        // STEP4: チェックボックス付き表示
        <div className="flex flex-col items-center gap-0.5 w-full">
          <input
            type="checkbox"
            checked={isCompleted}
            onChange={() => dataId !== undefined && onActionToggle(dataId)}
            onClick={(e) => e.stopPropagation()}
            className="w-3 h-3 accent-indigo-600"
          />
          <span
            className={cn("line-clamp-2 w-full", {
              "line-through text-gray-400": isCompleted,
            })}
          >
            {text}
          </span>
        </div>
      ) : (
        // 通常表示
        <span className="line-clamp-3 w-full">{text}</span>
      )}
    </div>
  );
}
