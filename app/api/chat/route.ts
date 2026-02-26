// Claude APIとのストリーミング通信エンドポイント

import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages, UIMessage } from "ai";

// Vercelのタイムアウト設定（ストリーミングに必要）
export const maxDuration = 30;

// ゴールデータの型（APIルートで受け取る形式）
interface GoalData {
  center?: string;
  sub_goals?: Array<{ id: number; text: string }>;
  actions?: Array<{
    id: number;
    sub_goal_id: number;
    text: string;
    completed: boolean;
  }>;
}

/**
 * STEPに応じたシステムプロンプトを生成する
 * AIに対してJSON形式でデータを返すよう指示する
 */
function buildSystemPrompt(currentStep: number, goalData: GoalData): string {
  const basePrompt = `あなたはマンダラチャートを使った目標達成コーチです。
ユーザーが具体的で実行可能な目標計画を立てられるよう、親しみやすく励ましながら対話してください。
回答は必ず日本語で行ってください。
簡潔でわかりやすい言葉を使い、長すぎる回答は避けてください。`;

  if (currentStep === 1) {
    return `${basePrompt}

【STEP 1: ゴール設定フェーズ】
ユーザーの最終的な目標（ゴール）を明確化してください。

進め方:
1. まず「どんな目標を達成したいですか？」と聞く
2. ユーザーの答えを掘り下げる（1-2問程度）:
   - 「いつまでに達成したいですか？」
   - 「今一番の障壁は何だと思いますか？」
3. 目標を整理してリフレーミング文を提案する
4. ユーザーが承認したら、必ず以下のJSON形式をコードブロックで出力する:

\`\`\`json
{"action": "set_center", "center": "ゴールのテキスト（30文字以内で簡潔に）"}
\`\`\`

JSONブロックの後に短い励ましのコメントを添えてください。`;
  }

  if (currentStep === 2) {
    return `${basePrompt}

【STEP 2: サブゴール設定フェーズ】
メインゴール「${goalData.center}」を達成するための8つのサブゴールを決めましょう。

進め方:
1. 「このゴールを達成するために必要な8つの要素を提案します」と宣言
2. 8つのサブゴール候補をリスト形式で提案する
3. ユーザーが「OKです」または「〇番を△△に変えて」と修正を求めたら対応する
4. 承認後、必ず以下のJSON形式をコードブロックで出力する（各テキストは15文字以内で簡潔に）:

\`\`\`json
{"action": "set_sub_goals", "sub_goals": [
  {"id": 0, "text": "サブゴール1"},
  {"id": 1, "text": "サブゴール2"},
  {"id": 2, "text": "サブゴール3"},
  {"id": 3, "text": "サブゴール4"},
  {"id": 4, "text": "サブゴール5"},
  {"id": 5, "text": "サブゴール6"},
  {"id": 6, "text": "サブゴール7"},
  {"id": 7, "text": "サブゴール8"}
]}
\`\`\``;
  }

  if (currentStep === 3) {
    const subGoalsText =
      goalData.sub_goals
        ?.map((s) => `  ${s.id}: ${s.text}`)
        .join("\n") || "（未設定）";

    return `${basePrompt}

【STEP 3: アクション設定フェーズ】
各サブゴールに対して8つの具体的なアクション（行動）を設定してください。

メインゴール: 「${goalData.center}」
サブゴール一覧:
${subGoalsText}

進め方:
- サブゴール0番から7番へ順番に処理する
- 各サブゴールについて:
  1. 「【サブゴール名】を達成するための8つのアクションを提案します」と宣言
  2. 8つのアクション候補をリスト形式で提案（各15文字以内）
  3. ユーザー承認後、以下のJSON形式をコードブロックで出力:

\`\`\`json
{"action": "set_actions", "sub_goal_id": 0, "actions": [
  {"local_id": 0, "text": "アクション1"},
  {"local_id": 1, "text": "アクション2"},
  {"local_id": 2, "text": "アクション3"},
  {"local_id": 3, "text": "アクション4"},
  {"local_id": 4, "text": "アクション5"},
  {"local_id": 5, "text": "アクション6"},
  {"local_id": 6, "text": "アクション7"},
  {"local_id": 7, "text": "アクション8"}
]}
\`\`\`

全8サブゴール分が完了したら、必ず最後に以下をコードブロックで出力してください:

\`\`\`json
{"action": "complete_step3"}
\`\`\`

注意: local_idは0-7の順番です。`;
  }

  if (currentStep === 4) {
    const completedCount =
      goalData.actions?.filter((a) => a.completed).length ?? 0;
    const totalCount = goalData.actions?.length ?? 0;

    return `${basePrompt}

【STEP 4: 完成・優先アクション提案フェーズ】
マンダラチャートが完成しました！

現在の状況: ${completedCount}/${totalCount} アクション完了

ユーザーに最優先で取り組むべきTop3のアクションを提案してください。
全64個のアクションの中から、最も重要で取り組みやすいものを3つ選んでください。

必ず以下のJSON形式をコードブロックで出力してください（action.idは0-63の数値）:

\`\`\`json
{"action": "set_top3", "top3": [アクションID1, アクションID2, アクションID3]}
\`\`\`

その後、選んだ理由と励ましのメッセージを添えてください。`;
  }

  return basePrompt;
}

export async function POST(req: Request) {
  const { messages, currentStep, goalData } = await req.json();

  // AI SDK v6: UIMessage[] を ModelMessage[] に変換してから streamText に渡す
  const modelMessages = await convertToModelMessages(messages as UIMessage[]);

  // Claude APIにストリーミングリクエストを送信
  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: buildSystemPrompt(currentStep ?? 1, goalData ?? {}),
    messages: modelMessages,
  });

  // AI SDK v6: UIMessageStreamResponse として返す
  return result.toUIMessageStreamResponse();
}
