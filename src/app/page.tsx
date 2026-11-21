import Image from "next/image";
import Link from "next/link";
import { Building2, ClipboardList, Wrench, type LucideIcon } from "lucide-react";

const roles: { title: string; text: string; icon: LucideIcon }[] = [
  { title: "Residents", text: "Report issues with photos and follow every ticket from request to resolution.", icon: ClipboardList },
  { title: "Technicians", text: "See assigned tasks, update progress and close jobs from one queue.", icon: Wrench },
  { title: "Managers & Owners", text: "Oversee buildings, assign work, and track performance across branches.", icon: Building2 },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.jpg" alt="" width={32} height={32} className="h-8 w-8 rounded-md object-cover" />
            <span className="text-lg font-semibold tracking-tight text-slate-900">Fixora</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Login
            </Link>
            <Link href="/register" className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Register
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        <section className="py-20 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Smart Maintenance Platform</p>
          <h1 className="mx-auto mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Maintenance and service management, simplified.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-600">
            Fixora connects residents, technicians, managers and owners in one workspace for complaints, assignments and reporting.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/register" className="rounded-lg bg-[#2563EB] px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
              Get started
            </Link>
            <Link href="/login" className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Login
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 pb-20 md:grid-cols-3">
          {roles.map(({ title, text, icon: Icon }) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
