"use client";

// チャットパネルコンポーネント（メッセージ表示・入力エリア）

import { useRef, useEffect } from "react";
import { UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ChatPanelProps {
  messages: UIMessage[];
  input: string;
  isLoading: boolean;
  currentStep: number;
  isStep3AllSet: boolean; // 全アクション設定完了フラグ
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStep3Confirm: () => void; // 「確認しました」クイック返信
}

// STEPラベルの定義
const STEP_LABELS: Record<number, string> = {
  1: "ゴール設定",
  2: "サブゴール",
  3: "アクション",
  4: "完了",
};

// AI SDK v6: UIMessageのpartsからテキスト内容を取得する
function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function ChatPanel({
  messages,
  input,
  isLoading,
  currentStep,
  isStep3AllSet,
  onInputChange,
  onSubmit,
  onStep3Confirm,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新しいメッセージが届いたら自動スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* STEPプログレス表示 */}
      <div className="p-3 border-b flex gap-1.5 flex-wrap shrink-0">
        {[1, 2, 3, 4].map((step) => (
          <Badge
            key={step}
            variant={currentStep >= step ? "default" : "outline"}
            className={currentStep === step ? "bg-indigo-600" : ""}
          >
            STEP {step}: {STEP_LABELS[step]}
          </Badge>
        ))}
      </div>

      {/* メッセージ一覧 */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">
              <p className="font-medium text-gray-600 mb-1">mandalifyへようこそ！</p>
              <p>AIとの対話でマンダラチャートを作りましょう。</p>
              <p>まず達成したい目標を教えてください。</p>
            </div>
          )}
          {messages.map((msg) => {
            // UIMessage.partsからテキストを取得し、JSONブロックを除去して表示
            const rawText = getMessageText(msg);
            const displayText = rawText.replace(/```json[\s\S]*?```/g, "").trim();
            if (!displayText && msg.role === "assistant") return null;
            return (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-900 rounded-bl-sm"
                  }`}
                >
                  {displayText}
                </div>
              </div>
            );
          })}
          {/* ストリーミング中の「入力中」表示 */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-gray-500">
                <span className="animate-pulse">入力中...</span>
              </div>
            </div>
          )}
          {/* 自動スクロール用の空要素 */}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* 入力エリア */}
      <form onSubmit={onSubmit} className="p-3 border-t shrink-0">
        {/* STEP3完了時のクイック返信ボタン */}
        {currentStep === 3 && isStep3AllSet && !isLoading && (
          <button
            type="button"
            onClick={onStep3Confirm}
            className="w-full mb-2 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            確認しました → STEP4へ進む
          </button>
        )}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={
              currentStep === 4
                ? "AIにアクションについて相談できます"
                : "メッセージを入力... (Enter で送信)"
            }
            disabled={isLoading}
            rows={2}
            className="resize-none"
            onKeyDown={(e) => {
              // Enterキーで送信（Shift+Enterは改行）
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (input.trim() && !isLoading) {
                  onSubmit(e as unknown as React.FormEvent);
                }
              }
            }}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="self-end bg-indigo-600 hover:bg-indigo-700"
          >
            送信
          </Button>
        </div>
      </form>
    </div>
  );
}
