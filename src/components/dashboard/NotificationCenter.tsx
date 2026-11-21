"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, ExternalLink, Loader2, Trash2 } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationCenter({
  notifications,
  unreadCount,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"ALL" | "UNREAD">("ALL");
  const [markingAll, setMarkingAll] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    if (tab === "UNREAD") return notifications.filter((n) => !n.isRead);
    return notifications;
  }, [notifications, tab]);

  async function handleMarkAllRead() {
    if (unreadCount === 0) return;
    setError("");
    setMarkingAll(true);
    try {
      const res = await fetch("/api/notifications", { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to mark all as read");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error while updating notifications");
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleMarkSingleRead(id: string) {
    setError("");
    setBusyId(id);
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to mark notification as read");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error while updating notification");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setError("");
    setBusyId(id);
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete notification");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error while deleting notification");
    } finally {
      setBusyId(null);
    }
  }

  async function handleOpenNotification(n: NotificationItem) {
    if (!n.isRead) {
      try {
        await fetch(`/api/notifications/${n.id}`, { method: "PATCH" });
      } catch {
        // Proceed with navigation even if mark-read fails
      }
    }
    if (n.link) {
      router.push(n.link);
    }
    router.refresh();
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Ticket updates, technician assignments, and resolution alerts."
        action={
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markingAll || unreadCount === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {markingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4 text-blue-600" />
            )}
            Mark All as Read
          </button>
        }
      />

      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </p>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setTab("ALL")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === "ALL" ? "bg-[#2563EB] text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              All <span className="opacity-75">({notifications.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("UNREAD")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === "UNREAD" ? "bg-[#2563EB] text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Unread <span className="opacity-75">({unreadCount})</span>
            </button>
          </div>
          <span className="text-xs text-slate-500">
            {unreadCount === 0 ? "All caught up" : `${unreadCount} unread`}
          </span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={tab === "UNREAD" ? "No unread notifications" : "You're all caught up"}
            description="When tickets are submitted, assigned, commented on, or resolved, notifications appear here."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((n) => {
              const isBusy = busyId === n.id;
              return (
                <li
                  key={n.id}
                  className={`flex items-start justify-between gap-3 px-4 py-3.5 transition-colors ${
                    n.isRead ? "bg-white hover:bg-slate-50/70" : "bg-blue-50/40 hover:bg-blue-50/70"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleOpenNotification(n)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                        n.isRead ? "bg-slate-300" : "bg-[#2563EB]"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`text-sm ${
                            n.isRead ? "font-medium text-slate-800" : "font-semibold text-slate-900"
                          }`}
                        >
                          {n.title}
                        </p>
                        {n.link && (
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{n.message}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(n.createdAt)}</p>
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-1">
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkSingleRead(n.id)}
                        disabled={isBusy}
                        title="Mark as read"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-50"
                      >
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(n.id)}
                      disabled={isBusy}
                      title="Delete notification"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
