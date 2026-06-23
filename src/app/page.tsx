import { AuthGate } from "@/components/auth-gate";

export default function Home() {
  return (
    <main className="min-h-screen px-3 py-3 text-slate-100 sm:px-5 sm:py-5">
      <AuthGate />
    </main>
  );
}
