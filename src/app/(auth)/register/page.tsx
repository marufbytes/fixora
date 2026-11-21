"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "RESIDENT" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Send form data to our Register API
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Registration failed");
      return;
    }

    // Redirect to login page after successful registration
    router.push("/login");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">Join Fixora to manage maintenance requests.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">Full name</label>
        <input id="name" type="text" required autoComplete="name" className={inputClass}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
        <input id="email" type="email" required autoComplete="email" className={inputClass}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
        <input id="password" type="password" required autoComplete="new-password" className={inputClass}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </div>

      {/* Role selector for testing all 4 user types */}
      <div className="space-y-1.5">
        <label htmlFor="role" className="block text-sm font-medium text-slate-700">Role</label>
        <select id="role" className={inputClass} value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="RESIDENT">Resident</option>
          <option value="MANAGER">Manager / Admin</option>
          <option value="TECHNICIAN">Technician</option>
          <option value="OWNER">Organization Owner</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="h-10 w-full rounded-lg bg-[#2563EB] text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? "Registering..." : "Create account"}
      </button>

      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
          Sign in
        </Link>
      </p>
    </form>
  );
}
