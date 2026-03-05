"use client";

// メインページ: チャット・マンダラチャートの統合オーケストレーター

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { Goal, CellInfo, Action } from "@/lib/types";
import {
  loadGoals,
  saveGoal,
  deleteGoal,
  createNewGoal,
} from "@/lib/storage";
import { MandalaChart } from "@/components/MandalaChart";
import { ChatPanel } from "@/components/ChatPanel";
import { GoalDashboard } from "@/components/GoalDashboard";
import { ActionDetailDialog } from "@/components/ActionDetailDialog";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * AIレスポンスからJSONアクションを抽出する
 * コードフェンス ```json ... ``` の中身を解析する
 */
function extractJsonAction(content: string): Record<string, unknown> | null {
  const match = content.match(/```json\n([\s\S]*?)\n```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * AI SDK v6: UIMessageのpartsからテキストを取得する
 */
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/**
 * チャット履歴からUIMessage配列を生成する（localStorage復元用）
 */
function chatHistoryToUIMessages(
  history: Array<{ role: "user" | "assistant"; content: string }>
): UIMessage[] {
  return history.map((m, i) => ({
    id: String(i),
    role: m.role,
    parts: [{ type: "text" as const, text: m.content }],
    metadata: undefined,
  }));
}

// 空のゴール（初期表示用）
const EMPTY_GOAL: Goal = {
  id: "",
  created_at: "",
  center: "",
  sub_goals: [],
  actions: [],
  chat_history: [],
  current_step: 1,
};

export default function Home() {
  // 現在表示中のゴール
  const [currentGoal, setCurrentGoal] = useState<Goal>(EMPTY_GOAL);
  // チャット入力テキスト（AI SDK v6ではuseChat外で管理）
  const [input, setInput] = useState("");
  // 全ゴール一覧（ダッシュボード用）
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  // ダッシュボードモーダルの表示フラグ
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  // 現在アクティブなブロックのサブゴールID（チャートのハイライト用）
  const [activeSubGoalId, setActiveSubGoalId] = useState<number | null>(null);
  // TOP3アクションのID一覧（STEP4で表示）
  const [top3Actions, setTop3Actions] = useState<number[]>([]);
  // ActionDetailDialogで選択中のアクションID（null=閉じている）
  const [selectedActionId, setSelectedActionId] = useState<number | null>(null);
  // STEP3で全アクションが揃ったフラグ（クイック返信ボタン表示用）
  const [isStep3AllSet, setIsStep3AllSet] = useState(false);
  // 初期化完了フラグ（SSRとのズレを防ぐ）
  const [isInitialized, setIsInitialized] = useState(false);

  // 常に最新のゴールデータをtransportのbodyで参照できるようRefで保持
  const currentGoalRef = useRef(currentGoal);
  currentGoalRef.current = currentGoal;

  // STEP3完了トリガーを一度だけ実行するためのRef
  const hasTriggeredStep3CompleteRef = useRef(false);

  // setMessages 呼び出し時に最新の messages を参照するためのRef（deps汚染回避）
  const messagesRef = useRef<UIMessage[]>([]);

  // AI SDK v6: DefaultChatTransportを一度だけ生成（bodyはRefで動的に読む）
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({
          currentStep: currentGoalRef.current.current_step,
          goalData: {
            center: currentGoalRef.current.center,
            sub_goals: currentGoalRef.current.sub_goals,
            actions: currentGoalRef.current.actions,
          },
        }),
      }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // AIアクション処理のRefを先に宣言（onFinishのクロージャで参照するため）
  const handleAIActionRef = useRef<(action: Record<string, unknown>) => void>(
    () => {}
  );

  // AI SDK v6: useChat フック
  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    onFinish: ({ message }) => {
      // ストリーム完了後にJSONアクションを解析
      const text = getMessageText(message);
      const action = extractJsonAction(text);
      if (action) {
        handleAIActionRef.current(action);
      }
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  // messagesRef を常に最新に保つ
  messagesRef.current = messages;

  // STEP3: 全8サブゴールのアクションが揃ったらAIメッセージとして確認依頼を挿入する
  useEffect(() => {
    if (currentGoal.current_step !== 3) return;
    if (isLoading) return;
    if (hasTriggeredStep3CompleteRef.current) return;

    const allSet = [0, 1, 2, 3, 4, 5, 6, 7].every(
      (id) => currentGoal.actions.filter((a) => a.sub_goal_id === id).length >= 8
    );

    if (allSet) {
      hasTriggeredStep3CompleteRef.current = true;
      setIsStep3AllSet(true);
      // ユーザー発言ではなくAIメッセージとして挿入する
      const completionNotice: UIMessage = {
        id: `step3-complete-${Date.now()}`,
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "全8サブゴールのアクションが揃いました！チャートの内容を確認してください。\n\n問題なければ「確認しました」と送信してください。STEP4（完成フェーズ）へ進みます。",
          },
        ],
        metadata: undefined,
      };
      setMessages([...messagesRef.current, completionNotice]);
    }
  }, [currentGoal.actions, currentGoal.current_step, isLoading, setMessages]);

  // 初期化: localStorageからゴールをロード
  useEffect(() => {
    const goals = loadGoals();
    setAllGoals(goals);
    if (goals.length > 0) {
      // 最新のゴールを表示
      setCurrentGoal(goals[0]);
      // チャット履歴をUIMessage形式で復元
      setMessages(chatHistoryToUIMessages(goals[0].chat_history));
      // 既にSTEP3完了状態でロードした場合は再挿入しない
      if (
        goals[0].current_step === 3 &&
        [0, 1, 2, 3, 4, 5, 6, 7].every(
          (id) => goals[0].actions.filter((a) => a.sub_goal_id === id).length >= 8
        )
      ) {
        hasTriggeredStep3CompleteRef.current = true;
        setIsStep3AllSet(true);
      }
    } else {
      // 初回起動: 新規ゴールを作成
      const newGoal = createNewGoal();
      setCurrentGoal(newGoal);
    }
    setIsInitialized(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // メッセージが更新されたらチャット履歴をlocalStorageに保存
  useEffect(() => {
    if (!isInitialized || messages.length === 0) return;
    setCurrentGoal((prev) => {
      if (!prev.id) return prev;
      const updated: Goal = {
        ...prev,
        chat_history: messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: getMessageText(m),
        })),
      };
      saveGoal(updated);
      return updated;
    });
  }, [messages, isInitialized]);

  // ゴール一覧を更新するヘルパー
  const refreshGoals = useCallback(() => {
    setAllGoals(loadGoals());
  }, []);

  /**
   * AIから返されたJSONアクションを処理してゴールデータを更新する
   */
  const handleAIAction = useCallback(
    (action: Record<string, unknown>) => {
      setCurrentGoal((prev) => {
        const base = prev.id
          ? prev
          : {
              ...prev,
              id: crypto.randomUUID(),
              created_at: new Date().toISOString(),
            };
        return applyAction(base, action, setActiveSubGoalId, setTop3Actions);
      });
    },
    []
  );

  // handleAIActionのRefを常に最新に保つ
  handleAIActionRef.current = handleAIAction;

  // フォーム送信: AI SDK v6では sendMessage({ text }) を呼ぶ
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;
      sendMessage({ text: input });
      setInput("");
    },
    [input, isLoading, sendMessage]
  );

  // アクションの完了状態をトグルする（completed_at も更新）
  const handleActionToggle = useCallback((actionId: number) => {
    setCurrentGoal((prev) => {
      const updated: Goal = {
        ...prev,
        actions: prev.actions.map((a) => {
          if (a.id !== actionId) return a;
          const nowCompleted = !a.completed;
          return {
            ...a,
            completed: nowCompleted,
            completed_at: nowCompleted ? new Date().toISOString() : undefined,
          };
        }),
      };
      if (updated.id) saveGoal(updated);
      return updated;
    });
  }, []);

  // STEP3完了確認: ユーザーが「確認しました」ボタンを押したとき
  const handleStep3Confirm = useCallback(() => {
    sendMessage({ text: "確認しました。STEP4に進んでください。" });
  }, [sendMessage]);

  // STEP4のアクションセルクリック: ダイアログを開く
  const handleActionCellClick = useCallback((actionId: number) => {
    setSelectedActionId((prev) => (prev === actionId ? null : actionId));
  }, []);

  // ActionDetailDialogからのアクション更新
  const handleUpdateActionMeta = useCallback(
    (updates: Partial<Pick<Action, "priority" | "due_date" | "completed">>) => {
      if (selectedActionId === null) return;
      const actionId = selectedActionId;
      setCurrentGoal((prev) => {
        const updated: Goal = {
          ...prev,
          actions: prev.actions.map((a) => {
            if (a.id !== actionId) return a;
            const nowCompleted =
              updates.completed !== undefined ? updates.completed : a.completed;
            return {
              ...a,
              ...updates,
              completed_at:
                updates.completed !== undefined
                  ? nowCompleted
                    ? new Date().toISOString()
                    : undefined
                  : a.completed_at,
            };
          }),
        };
        if (updated.id) saveGoal(updated);
        return updated;
      });
    },
    [selectedActionId]
  );

  // サブゴールセルをクリックしたらアクティブブロックを変更
  const handleCellClick = useCallback((cellInfo: CellInfo) => {
    if (cellInfo.type === "sub_goal" && cellInfo.dataId !== undefined) {
      setActiveSubGoalId((prev) =>
        prev === cellInfo.dataId ? null : cellInfo.dataId!
      );
    }
  }, []);

  // 新しいゴールを作成してリセット
  const handleNewGoal = useCallback(() => {
    const newGoal = createNewGoal();
    setCurrentGoal(newGoal);
    setMessages([]);
    setInput("");
    setTop3Actions([]);
    setActiveSubGoalId(null);
    setIsDashboardOpen(false);
    setIsStep3AllSet(false);
    hasTriggeredStep3CompleteRef.current = false;
  }, [setMessages]);

  // 過去のゴールを選択して表示
  const handleSelectGoal = useCallback(
    (goal: Goal) => {
      setCurrentGoal(goal);
      setMessages(chatHistoryToUIMessages(goal.chat_history));
      setTop3Actions([]);
      setActiveSubGoalId(null);
      setIsStep3AllSet(false);
      hasTriggeredStep3CompleteRef.current = false;
    },
    [setMessages]
  );

  // ゴールを削除する
  const handleDeleteGoal = useCallback(
    (id: string) => {
      deleteGoal(id);
      refreshGoals();
      // 削除したゴールが現在表示中のものなら新規作成
      if (currentGoal.id === id) {
        handleNewGoal();
      }
    },
    [currentGoal.id, refreshGoals, handleNewGoal]
  );

  // ゴールが更新されたら一覧も更新
  useEffect(() => {
    if (currentGoal.id && isInitialized) {
      refreshGoals();
    }
  }, [currentGoal, isInitialized, refreshGoals]);

  const displayGoal = currentGoal;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <header className="border-b px-4 py-3 flex items-center justify-between bg-white shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-indigo-600">mandalify</h1>
          <span className="text-xs text-gray-400 hidden sm:block">
            AIで作るマンダラチャート
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewGoal}
            className="text-xs"
          >
            新規
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refreshGoals();
              setIsDashboardOpen(true);
            }}
          >
            過去のチャート
          </Button>
        </div>
      </header>

      {/* PC レイアウト: 2カラム（左40%チャット / 右60%チャート） */}
      <div className="flex-1 overflow-hidden hidden md:flex">
        {/* 左カラム: チャットパネル */}
        <div className="w-[40%] border-r flex flex-col overflow-hidden bg-white">
          <ChatPanel
            messages={messages}
            input={input}
            isLoading={isLoading}
            currentStep={displayGoal.current_step}
            isStep3AllSet={isStep3AllSet}
            onInputChange={setInput}
            onSubmit={handleSubmit}
            onStep3Confirm={handleStep3Confirm}
          />
        </div>

        {/* 右カラム: マンダラチャート */}
        <div className="flex-1 flex flex-col overflow-auto p-4">
          <MandalaChart
            goal={displayGoal}
            activeSubGoalId={activeSubGoalId}
            onCellClick={handleCellClick}
            onActionToggle={handleActionToggle}
            onActionCellClick={handleActionCellClick}
          />

          {/* STEP4: TOP3アクション表示 */}
          {displayGoal.current_step === 4 && top3Actions.length > 0 && (
            <div className="mt-4 p-4 bg-white rounded-xl border shadow-sm">
              <h2 className="font-bold text-lg mb-3 text-indigo-600">
                優先アクション TOP3
              </h2>
              <ol className="space-y-2">
                {top3Actions.map((actionId, idx) => {
                  const action = displayGoal.actions.find(
                    (a) => a.id === actionId
                  );
                  if (!action) return null;
                  return (
                    <li key={actionId} className="flex items-center gap-3">
                      <span className="text-indigo-600 font-bold text-lg w-6">
                        {idx + 1}.
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={action.completed}
                          onChange={() => handleActionToggle(actionId)}
                          className="w-4 h-4 accent-indigo-600 rounded"
                        />
                        <span
                          className={
                            action.completed
                              ? "line-through text-gray-400"
                              : "text-gray-800"
                          }
                        >
                          {action.text}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* 完了後のステータス表示 */}
          {displayGoal.current_step === 4 &&
            displayGoal.actions.length > 0 && (
              <div className="mt-3 p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700 text-center">
                チャート完成！セルをクリックしてアクションを完了にしましょう。
                <br />
                完了:{" "}
                {displayGoal.actions.filter((a) => a.completed).length}/
                {displayGoal.actions.length}
              </div>
            )}

          {/* 達成カレンダー */}
          {displayGoal.current_step === 4 &&
            displayGoal.actions.length > 0 && (
              <div className="mt-3 p-4 bg-white rounded-xl border shadow-sm overflow-x-auto">
                <ActivityHeatmap actions={displayGoal.actions} />
              </div>
            )}
        </div>
      </div>

      {/* モバイル レイアウト: タブ切り替え */}
      <div className="flex-1 overflow-hidden md:hidden">
        <Tabs defaultValue="chat" className="h-full flex flex-col">
          <TabsList className="mx-3 mt-2 shrink-0 grid grid-cols-2">
            <TabsTrigger value="chat">チャット</TabsTrigger>
            <TabsTrigger value="chart">チャート</TabsTrigger>
          </TabsList>
          <TabsContent
            value="chat"
            className="flex-1 overflow-hidden mt-0 data-[state=active]:flex flex-col bg-white"
          >
            <ChatPanel
              messages={messages}
              input={input}
              isLoading={isLoading}
              currentStep={displayGoal.current_step}
              isStep3AllSet={isStep3AllSet}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              onStep3Confirm={handleStep3Confirm}
            />
          </TabsContent>
          <TabsContent
            value="chart"
            className="flex-1 overflow-auto p-2 mt-0"
          >
            <MandalaChart
              goal={displayGoal}
              activeSubGoalId={activeSubGoalId}
              onCellClick={handleCellClick}
              onActionToggle={handleActionToggle}
              onActionCellClick={handleActionCellClick}
            />
            {/* モバイル: 達成カレンダー */}
            {displayGoal.current_step === 4 &&
              displayGoal.actions.length > 0 && (
                <div className="mt-3 p-3 bg-white rounded-xl border shadow-sm overflow-x-auto">
                  <ActivityHeatmap actions={displayGoal.actions} />
                </div>
              )}

            {/* モバイルでもTOP3表示 */}
            {displayGoal.current_step === 4 && top3Actions.length > 0 && (
              <div className="mt-3 p-3 bg-white rounded-xl border shadow-sm">
                <h2 className="font-bold text-base mb-2 text-indigo-600">
                  優先アクション TOP3
                </h2>
                <ol className="space-y-1.5">
                  {top3Actions.map((actionId, idx) => {
                    const action = displayGoal.actions.find(
                      (a) => a.id === actionId
                    );
                    if (!action) return null;
                    return (
                      <li key={actionId} className="flex items-center gap-2">
                        <span className="text-indigo-600 font-bold">
                          {idx + 1}.
                        </span>
                        <label className="flex items-center gap-1.5 cursor-pointer flex-1 text-sm">
                          <input
                            type="checkbox"
                            checked={action.completed}
                            onChange={() => handleActionToggle(actionId)}
                            className="accent-indigo-600"
                          />
                          <span
                            className={
                              action.completed
                                ? "line-through text-gray-400"
                                : ""
                            }
                          >
                            {action.text}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* アクション詳細ダイアログ */}
      <ActionDetailDialog
        action={displayGoal.actions.find((a) => a.id === selectedActionId)}
        isOpen={selectedActionId !== null}
        onClose={() => setSelectedActionId(null)}
        onUpdate={handleUpdateActionMeta}
      />

      {/* 過去チャート一覧ダッシュボード */}
      <GoalDashboard
        goals={allGoals}
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        onSelectGoal={handleSelectGoal}
        onDeleteGoal={handleDeleteGoal}
        onNewGoal={handleNewGoal}
      />
    </div>
  );
}

/**
 * AIアクションをゴールに適用する純粋関数
 * setCurrentGoal のコールバック内から呼ばれる
 */
function applyAction(
  prev: Goal,
  action: Record<string, unknown>,
  setActiveSubGoalId: (id: number | null) => void,
  setTop3Actions: (ids: number[]) => void
): Goal {
  let updated = { ...prev };

  switch (action.action) {
    case "set_center": {
      updated = {
        ...updated,
        center: action.center as string,
        current_step: 2,
      };
      break;
    }
    case "set_sub_goals": {
      updated = {
        ...updated,
        sub_goals: action.sub_goals as Goal["sub_goals"],
        current_step: 3,
      };
      break;
    }
    case "set_actions": {
      // 各アクションをグローバルIDに変換して既存データとマージ
      const subGoalId = action.sub_goal_id as number;
      type LocalAction = { local_id: number; text: string };
      const newActions = (action.actions as LocalAction[]).map((a) => ({
        id: subGoalId * 8 + a.local_id,
        sub_goal_id: subGoalId,
        text: a.text,
        completed: false,
      }));
      // 同じサブゴールIDのアクションは上書き
      const existingActions = updated.actions.filter(
        (a) => a.sub_goal_id !== subGoalId
      );
      updated = {
        ...updated,
        actions: [...existingActions, ...newActions],
      };
      setActiveSubGoalId(subGoalId);
      break;
    }
    case "complete_step3": {
      updated = { ...updated, current_step: 4 };
      setActiveSubGoalId(null);
      break;
    }
    case "set_top3": {
      setTop3Actions(action.top3 as number[]);
      break;
    }
  }

  // ゴールをlocalStorageに保存
  if (updated.id) {
    saveGoal(updated);
  }

  return updated;
}
