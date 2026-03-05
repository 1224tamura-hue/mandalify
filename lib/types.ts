// マンダラチャートアプリの型定義

// サブゴール（中心を囲む8つの目標）
export interface SubGoal {
  id: number; // 0-7
  text: string;
}

// アクション（各サブゴールに紐づく8つの具体的行動）
export interface Action {
  id: number; // グローバルID 0-63
  sub_goal_id: number; // 親サブゴールID 0-7
  text: string;
  completed: boolean;
  priority?: "high" | "medium" | "low"; // 優先度
  due_date?: string; // 期限 "YYYY-MM-DD"
  completed_at?: string; // 完了日時 ISO8601
}

// チャットメッセージ
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ゴール全体のデータ構造
export interface Goal {
  id: string; // uuid
  created_at: string; // ISO8601
  center: string; // 中心ゴール
  sub_goals: SubGoal[]; // 0-7
  actions: Action[]; // 0-63
  chat_history: ChatMessage[]; // チャット履歴
  current_step: number; // 現在のSTEP (1-4)
}

// 9x9グリッドのセルタイプ
export type CellType = "center" | "sub_goal" | "action" | "empty";

// グリッドの各セルの情報
export interface CellInfo {
  type: CellType;
  dataId?: number; // sub_goal.id または action.id
  subGoalId?: number; // actionの場合の親sub_goal_id
  row: number; // 0-8
  col: number; // 0-8
}
