"use client";

// 達成カレンダー: 直近91日のGitHub風ヒートマップ

import { useMemo } from "react";
import { Action } from "@/lib/types";
import { buildHeatmapData, toLocalDateString } from "@/lib/dateUtils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ActivityHeatmapProps {
  actions: Action[];
}

const DAYS = 91; // 13週 × 7日

// 完了数に応じた背景色
function getCellColor(count: number): string {
  if (count === 0) return "bg-gray-100";
  if (count === 1) return "bg-green-200";
  if (count <= 3) return "bg-green-400";
  return "bg-green-700";
}

// "YYYY-MM-DD" を "M月D日" に変換
function formatDateLabel(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${parseInt(m)}月${parseInt(d)}日`;
}

export function ActivityHeatmap({ actions }: ActivityHeatmapProps) {
  const heatmapData = useMemo(() => buildHeatmapData(actions, DAYS), [actions]);

  // Map を配列化して週ごとに分割
  const weeks = useMemo(() => {
    const dates = Array.from(heatmapData.entries()); // [dateKey, count][]
    const result: Array<typeof dates> = [];
    for (let i = 0; i < dates.length; i += 7) {
      result.push(dates.slice(i, i + 7));
    }
    return result;
  }, [heatmapData]);

  // 各週の最初の日付から月ラベルを生成
  const monthLabels = useMemo(() => {
    return weeks.map((week) => {
      const firstDate = week[0]?.[0];
      if (!firstDate) return "";
      const d = new Date(firstDate);
      // 週の中で月が変わる場合（または最初の週）のみラベル表示
      const prevWeekFirst = weeks[weeks.indexOf(week) - 1]?.[0]?.[0];
      if (!prevWeekFirst) return `${d.getMonth() + 1}月`;
      const prevMonth = new Date(prevWeekFirst).getMonth();
      return d.getMonth() !== prevMonth ? `${d.getMonth() + 1}月` : "";
    });
  }, [weeks]);

  const today = toLocalDateString(new Date());
  const totalCompleted = useMemo(
    () => Array.from(heatmapData.values()).reduce((s, c) => s + c, 0),
    [heatmapData]
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500">達成カレンダー（直近91日）</p>
          <p className="text-xs text-gray-400">{totalCompleted}件完了</p>
        </div>

        {/* 月ラベル行 */}
        <div className="flex gap-0.5">
          {monthLabels.map((label, i) => (
            <div key={i} className="w-3 flex-shrink-0 text-[9px] text-gray-400">
              {label}
            </div>
          ))}
        </div>

        {/* ヒートマップグリッド（週列 × 7日行） */}
        <div className="flex gap-0.5">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map(([dateKey, count]) => (
                <Tooltip key={dateKey}>
                  <TooltipTrigger asChild>
                    <div
                      className={`w-3 h-3 rounded-sm ${getCellColor(count)} ${
                        dateKey === today ? "ring-1 ring-indigo-400" : ""
                      }`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {formatDateLabel(dateKey)}: {count}件完了
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          ))}
        </div>

        {/* 凡例 */}
        <div className="flex items-center gap-1 justify-end">
          <span className="text-[9px] text-gray-400">少</span>
          {["bg-gray-100", "bg-green-200", "bg-green-400", "bg-green-700"].map(
            (cls) => (
              <div key={cls} className={`w-2.5 h-2.5 rounded-sm ${cls}`} />
            )
          )}
          <span className="text-[9px] text-gray-400">多</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
