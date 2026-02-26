// 9x9マンダラグリッドのセル座標マッピングユーティリティ

import { CellInfo } from "./types";

// サブゴールID → 3x3ブロック位置のマップ
// [blockRow, blockCol] の形式で、ブロック座標は 0-2
// 各ブロックの中心セル = blockRow*3+1, blockCol*3+1
const SUB_GOAL_BLOCK_MAP: [number, number][] = [
  [0, 0], // sub_goals[0] → ブロック(0,0) → grid[1][1]
  [0, 1], // sub_goals[1] → ブロック(0,1) → grid[1][4]
  [0, 2], // sub_goals[2] → ブロック(0,2) → grid[1][7]
  [1, 2], // sub_goals[3] → ブロック(1,2) → grid[4][7]
  [2, 2], // sub_goals[4] → ブロック(2,2) → grid[7][7]
  [2, 1], // sub_goals[5] → ブロック(2,1) → grid[7][4]
  [2, 0], // sub_goals[6] → ブロック(2,0) → grid[7][1]
  [1, 0], // sub_goals[7] → ブロック(1,0) → grid[4][1]
];

// ブロック内のアクション配置順序
// 3x3ブロックの中心(1,1)を除く8マスを読み取り順（左→右、上→下）で定義
const ACTION_RELATIVE_POSITIONS: [number, number][] = [
  [0, 0], // local 0
  [0, 1], // local 1
  [0, 2], // local 2
  [1, 0], // local 3
  // [1, 1] は中心セル（サブゴール表示）のためスキップ
  [1, 2], // local 4
  [2, 0], // local 5
  [2, 1], // local 6
  [2, 2], // local 7
];

// 中心ブロック(1,1)の内側リング: 中心セル[4][4]を囲む8マスにサブゴールを表示
// 各要素: [row, col, subGoalId]
const CENTER_BLOCK_INNER_RING: [number, number, number][] = [
  [3, 3, 0], // 左上 → sub_goals[0]
  [3, 4, 1], // 上中央 → sub_goals[1]
  [3, 5, 2], // 右上 → sub_goals[2]
  [4, 5, 3], // 右中央 → sub_goals[3]
  [5, 5, 4], // 右下 → sub_goals[4]
  [5, 4, 5], // 下中央 → sub_goals[5]
  [5, 3, 6], // 左下 → sub_goals[6]
  [4, 3, 7], // 左中央 → sub_goals[7]
];

/**
 * 9x9グリッドのCellInfo配列を生成する
 * - 中心セル[4][4]: center
 * - 外側8ブロックの中心: sub_goal（ブロックのヘッダー役割）
 * - 内側リング（中心周囲8マス）: sub_goal（サブゴールへのリンク）
 * - 各ブロックの周囲8マス: action
 *
 * 注意: 各サブゴールは2箇所に表示される
 *   1. 外側ブロックの中心（例: sub_goals[0] → grid[1][1]）
 *   2. 内側リング（例: sub_goals[0] → grid[3][3]）
 */
export function buildCellGrid(): CellInfo[][] {
  // 9x9のグリッドを空のセルで初期化
  const grid: CellInfo[][] = Array.from({ length: 9 }, (_, row) =>
    Array.from(
      { length: 9 },
      (_, col): CellInfo => ({ type: "empty", row, col })
    )
  );

  // 中央セル [4][4] = メインゴール
  grid[4][4] = { type: "center", row: 4, col: 4 };

  // 内側リング: 中心を囲む8マスにサブゴールを配置
  for (const [row, col, subGoalId] of CENTER_BLOCK_INNER_RING) {
    grid[row][col] = {
      type: "sub_goal",
      dataId: subGoalId,
      row,
      col,
    };
  }

  // 外側8ブロック: 各ブロックの中心にサブゴール、周囲8マスにアクションを配置
  for (let subGoalId = 0; subGoalId < 8; subGoalId++) {
    const [blockRow, blockCol] = SUB_GOAL_BLOCK_MAP[subGoalId];
    const blockStartRow = blockRow * 3;
    const blockStartCol = blockCol * 3;

    // ブロックの中心セル = サブゴール表示位置
    const centerRow = blockStartRow + 1;
    const centerCol = blockStartCol + 1;
    grid[centerRow][centerCol] = {
      type: "sub_goal",
      dataId: subGoalId,
      row: centerRow,
      col: centerCol,
    };

    // 周囲8マス = アクションセル
    // グローバルアクションID = sub_goal_id * 8 + ローカルインデックス
    for (let localIdx = 0; localIdx < 8; localIdx++) {
      const [relRow, relCol] = ACTION_RELATIVE_POSITIONS[localIdx];
      const absRow = blockStartRow + relRow;
      const absCol = blockStartCol + relCol;
      const globalActionId = subGoalId * 8 + localIdx;

      grid[absRow][absCol] = {
        type: "action",
        dataId: globalActionId,
        subGoalId,
        row: absRow,
        col: absCol,
      };
    }
  }

  return grid;
}

// サブゴールIDのブロック座標を取得する
export function getBlockForSubGoal(subGoalId: number): [number, number] {
  return SUB_GOAL_BLOCK_MAP[subGoalId];
}
