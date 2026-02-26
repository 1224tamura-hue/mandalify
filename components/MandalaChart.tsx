"use client";

// マンダラチャートの9x9グリッドコンポーネント

import { useMemo } from "react";
import { buildCellGrid } from "@/lib/gridUtils";
import { MandalaCell } from "./MandalaCell";
import { Goal, CellInfo } from "@/lib/types";

interface MandalaChartProps {
  goal: Goal;
  activeSubGoalId: number | null; // 現在アクティブなブロックのサブゴールID
  onCellClick: (cellInfo: CellInfo) => void;
  onActionToggle: (actionId: number) => void;
}

export function MandalaChart({
  goal,
  activeSubGoalId,
  onCellClick,
  onActionToggle,
}: MandalaChartProps) {
  // グリッド座標は静的なので一度だけ計算する（メモ化）
  const cellGrid = useMemo(() => buildCellGrid(), []);

  return (
    <div className="w-full aspect-square max-w-[640px] mx-auto">
      {/* 9x9 CSSグリッド */}
      <div
        className="grid w-full h-full border border-gray-300"
        style={{
          gridTemplateColumns: "repeat(9, 1fr)",
          gridTemplateRows: "repeat(9, 1fr)",
        }}
      >
        {/* セルをフラット化して81個を順番にレンダリング */}
        {cellGrid.flat().map((cellInfo) => (
          <MandalaCell
            key={`${cellInfo.row}-${cellInfo.col}`}
            cellInfo={cellInfo}
            goal={goal}
            activeSubGoalId={activeSubGoalId}
            currentStep={goal.current_step}
            onCellClick={onCellClick}
            onActionToggle={onActionToggle}
          />
        ))}
      </div>
    </div>
  );
}
