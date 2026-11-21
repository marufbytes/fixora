import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Reset Password" };

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm disabled:cursor-not-allowed";

export default function ResetPasswordPage() {
  return (
    <form className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Reset your password</h1>
        <p className="mt-1 text-sm text-slate-500">Choose a new password for your account.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">New password</label>
        <input id="password" type="password" disabled className={inputClass} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirm" className="block text-sm font-medium text-slate-700">Confirm password</label>
        <input id="confirm" type="password" disabled className={inputClass} />
      </div>

      <button
        type="submit"
        disabled
        className="h-10 w-full rounded-lg bg-[#2563EB] text-sm font-medium text-white opacity-60"
      >
        Update password
      </button>
      <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
        Form shell — token validation and password update are not wired up yet.
      </p>

      <p className="text-center text-sm text-slate-600">
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">Back to sign in</Link>
      </p>
    </form>
  );
}
