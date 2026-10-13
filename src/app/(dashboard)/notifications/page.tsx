"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Notification } from "@/types";
import {
  Bell,
  CheckCheck,
  Loader2,
  UserPlus,
  Inbox,
  CircleCheck,
  Clock3,
  ArrowUpRight,
  Search,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type NotificationFilter = "all" | "unread";

const TYPE_ICON: Record<Notification["type"], typeof Bell> = {
  conversation_assigned: UserPlus,
};

export default function NotificationsPage() {
  const router = useRouter();
  const { accountId } = useAuth();

  const [notifications, setNotifications] = useState<Notification[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!accountId) return;

    setError(null);
    const supabase = createClient();

    const { data, error: fetchErr } = await supabase
      .from("notifications")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (fetchErr) {
      setError("We couldn't load your notifications. Please try again.");
      return;
    }

    setNotifications((data ?? []) as Notification[]);
  }, [accountId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Keep realtime updates scoped to the current account.
  useEffect(() => {
    if (!accountId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-page-${accountId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `account_id=eq.${accountId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Notification;

            setNotifications((prev) => {
              if (!prev) return [row];
              if (prev.some((n) => n.id === row.id)) return prev;
              return [row, ...prev].slice(0, 100);
            });
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Notification;

            setNotifications((prev) =>
              prev?.map((n) => (n.id === row.id ? { ...n, ...row } : n)) ??
              prev,
            );
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Partial<Notification>;

            if (oldRow.id) {
              setNotifications(
                (prev) => prev?.filter((n) => n.id !== oldRow.id) ?? prev,
              );
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accountId]);

  const unreadCount = useMemo(
    () => notifications?.filter((n) => !n.read_at).length ?? 0,
    [notifications],
  );

  const totalCount = notifications?.length ?? 0;
  const readCount = totalCount - unreadCount;

  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];

    const query = search.trim().toLowerCase();

    return notifications.filter((n) => {
      const matchesFilter = filter === "all" || !n.read_at;
      const matchesSearch =
        !query ||
        n.title.toLowerCase().includes(query) ||
        (n.body ?? "").toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [notifications, filter, search]);

  const markRead = useCallback(
    async (id: string) => {
      if (!accountId) return;

      const now = new Date().toISOString();

      setNotifications(
        (prev) =>
          prev?.map((n) =>
            n.id === id && !n.read_at ? { ...n, read_at: now } : n,
          ) ?? prev,
      );

      const supabase = createClient();
      const { error: updateErr } = await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("id", id)
        .eq("account_id", accountId)
        .is("read_at", null);

      if (updateErr) {
        toast.error("Couldn't update notification status");
        load();
      }
    },
    [accountId, load],
  );

  const handleClick = useCallback(
    (notification: Notification) => {
      if (!notification.read_at) {
        markRead(notification.id);
      }

      if (notification.conversation_id) {
        router.push(`/inbox?c=${notification.conversation_id}`);
      }
    },
    [markRead, router],
  );

  const markAllRead = useCallback(async () => {
    if (!accountId || unreadCount === 0 || markingAll) return;

    setMarkingAll(true);
    const now = new Date().toISOString();

    setNotifications(
      (prev) =>
        prev?.map((n) => (n.read_at ? n : { ...n, read_at: now })) ?? prev,
    );

    const supabase = createClient();
    const { error: updateErr } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("account_id", accountId)
      .is("read_at", null);

    setMarkingAll(false);

    if (updateErr) {
      toast.error("Couldn't mark all notifications as read");
      load();
      return;
    }

    toast.success("All notifications marked as read");
  }, [accountId, unreadCount, markingAll, load]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <Bell className="h-7 w-7 text-destructive" />
        </div>
        <h2 className="mt-5 text-lg font-semibold">Unable to load notifications</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-5" variant="outline" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  if (notifications === null) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl border bg-muted/40"
            />
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-2xl border bg-muted/40" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 pb-8">
      {/* Page heading */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-primary/10 text-primary">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Notification Center
              </h1>
              {unreadCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Stay updated on conversations assigned to you.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full sm:w-auto"
          disabled={unreadCount === 0 || markingAll}
          onClick={markAllRead}
        >
          {markingAll ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCheck className="mr-2 h-4 w-4" />
          )}
          Mark all as read
        </Button>
      </section>

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Inbox className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Last 100 loaded
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold tracking-tight">{totalCount}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Total notifications
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Clock3 className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-amber-600">
              Needs attention
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold tracking-tight">{unreadCount}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Unread notifications
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <CircleCheck className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-emerald-600">
              Up to date
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold tracking-tight">{readCount}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Read notifications
          </p>
        </div>
      </section>

      {/* Notification list */}
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold">Your activity</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Important updates for your workspace.
            </p>
          </div>

          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notifications..."
              aria-label="Search notifications"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex gap-2 border-b px-4 pt-3 sm:px-5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            aria-pressed={filter === "all"}
            className={cn(
              "relative rounded-t-lg px-4 py-3 text-sm font-medium transition-colors",
              filter === "all"
                ? "text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            All
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("unread")}
            aria-pressed={filter === "unread"}
            className={cn(
              "relative rounded-t-lg px-4 py-3 text-sm font-medium transition-colors",
              filter === "unread"
                ? "text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Unread
            {unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {filteredNotifications.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border bg-muted/50">
              {search || filter === "unread" ? (
                <Search className="h-7 w-7 text-muted-foreground" />
              ) : (
                <Bell className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
            <h3 className="mt-5 text-base font-semibold">
              {search
                ? "No matching notifications"
                : filter === "unread"
                  ? "You're all caught up"
                  : "No notifications yet"}
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {search
                ? "Try a different search term."
                : filter === "unread"
                  ? "There are no unread notifications right now. New updates will appear here."
                  : "When a teammate assigns a conversation to you, the update will appear here."}
            </p>
            {(search || filter === "unread") && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
              >
                Show all notifications
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y">
            {filteredNotifications.map((notification) => {
              const Icon = TYPE_ICON[notification.type] ?? Bell;
              const isUnread = !notification.read_at;

              return (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(notification)}
                    className={cn(
                      "group flex w-full items-start gap-3 px-4 py-5 text-left transition-colors hover:bg-muted/40 sm:gap-4 sm:px-5",
                      isUnread && "bg-primary/[0.035]",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors",
                        isUnread
                          ? "border-primary/20 bg-primary/10 text-primary"
                          : "border-border bg-muted/60 text-muted-foreground",
                      )}
                      aria-hidden="true"
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "text-sm",
                            isUnread
                              ? "font-semibold text-foreground"
                              : "font-medium text-muted-foreground",
                          )}
                        >
                          {notification.title}
                        </span>
                        {isUnread && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            NEW
                          </span>
                        )}
                      </div>

                      {notification.body && (
                        <p className="mt-1.5 break-words text-sm leading-6 text-muted-foreground">
                          {notification.body}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" />
                        <time dateTime={notification.created_at}>
                          {formatDistanceToNow(
                            new Date(notification.created_at),
                            { addSuffix: true },
                          )}
                        </time>
                        {notification.conversation_id && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 font-medium text-primary">
                              View conversation
                              <ArrowUpRight className="h-3 w-3" />
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center self-center">
                      {isUnread ? (
                        <span
                          className="h-2.5 w-2.5 rounded-full bg-primary"
                          aria-label="Unread"
                        />
                      ) : (
                        <CheckCheck className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {totalCount > 0 && (
          <div className="flex flex-col gap-1 border-t bg-muted/20 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <span>
              Showing {filteredNotifications.length} of {totalCount} loaded
              notifications
            </span>
            <span>Updates appear in real time when connected.</span>
          </div>
        )}
      </section>
    </div>
  );
}
