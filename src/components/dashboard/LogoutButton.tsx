"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const styles =
    variant === "dark"
      ? "text-slate-400 hover:bg-slate-800 hover:text-white"
      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800";

  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      title="Sign out"
      aria-label="Sign out"
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${styles}`}
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
