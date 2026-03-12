export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-600 to-indigo-800">
      {children}
    </div>
  );
}
