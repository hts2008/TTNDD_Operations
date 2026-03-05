import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TTNDD_OPS — Thanh Thiếu Niên Đại Đạo',
  description: 'Hệ thống Quản lý & Vận hành Đoàn Thiếu Nhi Đạo Đức',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
}
