import type { Metadata, Viewport } from 'next';
import './globals.css';
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};
export const metadata: Metadata = {
  title: 'Paperstrike · 纸上战场',
  description:
    '一张纸，四把枪。进入手绘三维竞技场，与涂鸦小队展开一场三分钟的对战。',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <head>
        <script
          defer
          src="https://umami.joyehuang.dev/script.js"
          data-website-id="130840cb-7ecb-479c-ba68-4160362b9b55"
          data-domains="joyehuang.app,www.joyehuang.app"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
