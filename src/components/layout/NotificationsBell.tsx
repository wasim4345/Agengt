"use client";

import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useOsStore } from "@/store/store";
import { formatDate } from "@/lib/format/dates";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

export function NotificationsBell() {
  const role = useOsStore((s) => s.state.meta.currentRole);
  const userId = useOsStore((s) => s.state.meta.currentUserId);
  const notifications = useOsStore((s) => s.state.notifications);
  const markNotificationRead = useOsStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useOsStore(
    (s) => s.markAllNotificationsRead,
  );
  const [open, setOpen] = useState(false);

  const items = useMemo(() => {
    return Object.values(notifications)
      .filter(
        (n) =>
          n.roleOrUserId === role ||
          n.roleOrUserId === userId ||
          n.roleOrUserId === "all",
      )
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [notifications, role, userId]);

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        type="button"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface hover:bg-background"
        aria-label={
          unread > 0
            ? `Notifications, ${unread} unread`
            : "Notifications"
        }
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-border bg-surface shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            <Button
              size="sm"
              variant="ghost"
              disabled={unread === 0}
              onClick={() => markAllNotificationsRead()}
            >
              Mark all read
            </Button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted">
                No notifications
              </li>
            ) : (
              items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "border-b border-border px-3 py-2 last:border-0",
                    !n.read && "bg-primary/5",
                  )}
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => markNotificationRead(n.id)}
                  >
                    <p className="text-sm">{n.text}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDate(n.at.slice(0, 10))}
                    </p>
                  </button>
                  {n.link ? (
                    <Link
                      href={n.link.endsWith("/") ? n.link : `${n.link}/`}
                      className="text-xs font-medium text-accent"
                      onClick={() => {
                        markNotificationRead(n.id);
                        setOpen(false);
                      }}
                    >
                      Open
                    </Link>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
