import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "mandalify - マンダラチャートで目標管理",
  description: "AIと対話しながらマンダラチャートを作成し、目標を達成しよう",
};

// viewport-fit=cover でノッチ・Dynamic Island 領域までコンテンツを拡張する
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 日本語対応・スクロール禁止（アプリ全体がh-dvhに収まる設計）
    <html lang="ja">
      <body className={`${inter.className} h-dvh overflow-hidden antialiased`}>
        {children}
      </body>
    </html>
  );
}
