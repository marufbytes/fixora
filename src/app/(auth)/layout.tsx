import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2563EB] to-[#1E40AF] px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-3">
        <Image src="/logo.jpg" alt="" width={40} height={40} className="h-10 w-10 rounded-lg object-cover ring-2 ring-white/30" />
        <span className="text-2xl font-semibold tracking-tight text-white">Fixora</span>
      </Link>
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">{children}</div>
      <p className="mt-6 text-xs text-blue-100">Smart Maintenance &amp; Service Management Platform</p>
    </div>
  );
}
