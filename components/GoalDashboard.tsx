"use client";

// 過去のマンダラチャート一覧ダッシュボード（Dialogモーダル）

import { Goal } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GoalDashboardProps {
  goals: Goal[];
  isOpen: boolean;
  onClose: () => void;
  onSelectGoal: (goal: Goal) => void;
  onDeleteGoal: (id: string) => void;
  onNewGoal: () => void;
}

// STEPラベルの定義
const STEP_LABELS: Record<number, string> = {
  1: "ゴール設定中",
  2: "サブゴール設定中",
  3: "アクション設定中",
  4: "完成",
};

export function GoalDashboard({
  goals,
  isOpen,
  onClose,
  onSelectGoal,
  onDeleteGoal,
  onNewGoal,
}: GoalDashboardProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>過去のマンダラチャート</DialogTitle>
        </DialogHeader>

        {/* 新規作成ボタン */}
        <Button
          onClick={onNewGoal}
          className="bg-indigo-600 hover:bg-indigo-700 shrink-0"
        >
          新しいゴールを作成
        </Button>

        {/* チャート一覧 */}
        <ScrollArea className="flex-1 mt-2">
          {goals.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              まだチャートがありません
            </p>
          ) : (
            <div className="space-y-3 pr-2">
              {goals.map((goal) => (
                <Card
                  key={goal.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-base leading-tight">
                        {goal.center || "（ゴール未設定）"}
                      </CardTitle>
                      <Badge
                        variant={
                          goal.current_step === 4 ? "default" : "outline"
                        }
                        className={
                          goal.current_step === 4 ? "bg-indigo-600" : ""
                        }
                      >
                        {STEP_LABELS[goal.current_step] || "STEP " + goal.current_step}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400">
                      作成日:{" "}
                      {new Date(goal.created_at).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    {/* サブゴールのプレビュー */}
                    {goal.sub_goals.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        サブゴール: {goal.sub_goals.slice(0, 3).map((s) => s.text).join("・")}
                        {goal.sub_goals.length > 3 && "..."}
                      </p>
                    )}
                    {/* 完了アクション数 */}
                    {goal.actions.length > 0 && (
                      <p className="text-xs text-green-600 mt-0.5">
                        アクション: {goal.actions.filter((a) => a.completed).length}/
                        {goal.actions.length} 完了
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="flex gap-2 pt-0">
                    <Button
                      size="sm"
                      onClick={() => {
                        onSelectGoal(goal);
                        onClose();
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      開く
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm("このチャートを削除してもよいですか？")) {
                          onDeleteGoal(goal.id);
                        }
                      }}
                    >
                      削除
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
