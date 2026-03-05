export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          🏯 TTNDD_OPS
        </h1>
        <p className="text-xl text-gray-600">
          Thanh Thiếu Niên Đại Đạo — Hệ thống Quản lý & Vận hành
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            API: localhost:3001
          </span>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            Web: localhost:3000
          </span>
        </div>
        <p className="text-sm text-gray-400 pt-8">
          v0.1.0 — Phase 0: Infrastructure Setup
        </p>
      </div>
    </main>
  );
}
