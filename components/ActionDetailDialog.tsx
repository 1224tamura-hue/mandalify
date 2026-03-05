"use client";

// アクション詳細設定ダイアログ（優先度・期限・完了状態を設定）

import { Action } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ActionDetailDialogProps {
  action: Action | undefined;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (
    updates: Partial<Pick<Action, "priority" | "due_date" | "completed">>
  ) => void;
}

const PRIORITY_OPTIONS: {
  value: "high" | "medium" | "low";
  label: string;
  activeClass: string;
  inactiveClass: string;
}[] = [
  {
    value: "high",
    label: "高",
    activeClass: "bg-red-100 border-red-400 text-red-700 font-semibold",
    inactiveClass: "bg-white border-gray-200 text-gray-500 hover:bg-red-50",
  },
  {
    value: "medium",
    label: "中",
    activeClass: "bg-yellow-100 border-yellow-400 text-yellow-700 font-semibold",
    inactiveClass: "bg-white border-gray-200 text-gray-500 hover:bg-yellow-50",
  },
  {
    value: "low",
    label: "低",
    activeClass: "bg-blue-100 border-blue-400 text-blue-700 font-semibold",
    inactiveClass: "bg-white border-gray-200 text-gray-500 hover:bg-blue-50",
  },
];

export function ActionDetailDialog({
  action,
  isOpen,
  onClose,
  onUpdate,
}: ActionDetailDialogProps) {
  if (!action) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">アクション詳細</DialogTitle>
        </DialogHeader>

        {/* アクションテキスト（読み取り専用） */}
        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">
          {action.text}
        </p>

        {/* 優先度設定 */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">優先度</p>
          <div className="flex gap-2">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onUpdate({ priority: opt.value })}
                className={cn(
                  "flex-1 py-1.5 text-sm rounded-lg border transition-colors",
                  action.priority === opt.value
                    ? opt.activeClass
                    : opt.inactiveClass
                )}
              >
                {opt.label}
              </button>
            ))}
            {/* 優先度クリア */}
            {action.priority && (
              <button
                onClick={() => onUpdate({ priority: undefined })}
                className="px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                解除
              </button>
            )}
          </div>
        </div>

        {/* 期限設定 */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">期限</p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={action.due_date ?? ""}
              onChange={(e) =>
                onUpdate({ due_date: e.target.value || undefined })
              }
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {action.due_date && (
              <button
                onClick={() => onUpdate({ due_date: undefined })}
                className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2 py-1.5 hover:bg-gray-50 transition-colors"
              >
                解除
              </button>
            )}
          </div>
        </div>

        {/* 完了チェックボックス */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={action.completed}
            onChange={(e) => onUpdate({ completed: e.target.checked })}
            className="w-4 h-4 accent-indigo-600 rounded"
          />
          <span className="text-sm text-gray-700">完了にする</span>
        </label>
      </DialogContent>
    </Dialog>
  );
}
