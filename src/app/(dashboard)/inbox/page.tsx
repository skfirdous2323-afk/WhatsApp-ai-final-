"use client";

import {
  Suspense,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  CONVERSATION_SELECT,
  normalizeConversation,
} from "@/lib/inbox/conversations";
import type { Conversation, Message, Contact, ConversationStatus } from "@/types";
import { useRealtime } from "@/hooks/use-realtime";
import { ConversationList } from "@/components/inbox/conversation-list";
import { MessageThread } from "@/components/inbox/message-thread";
import { ContactSidebar } from "@/components/inbox/contact-sidebar";
import { toast } from "sonner";
import {
  WifiOff,
  AlertCircle,
  MessageSquare,
  RefreshCw,
  Keyboard,
  X,
  Plus,
  Search,
  Filter,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CONTACT_PANEL_STORAGE_KEY = "wacrm:inbox:contact-panel-open";

export default function InboxPage() {
  return (
    <Suspense fallback={<InboxSkeleton />}>
      <InboxPageInner />
    </Suspense>
  );
}

function InboxSkeleton() {
  return (
    <div className="-m-4 flex h-[calc(100vh-3.5rem)] items-center justify-center bg-slate-50 sm:-m-6">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
        <p className="text-xs font-medium text-slate-500">Loading inbox…</p>
      </div>
    </div>
  );
}

function InboxPageInner() {
  const t = useTranslations("Inbox.page");
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkConvId = searchParams.get("c");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [whatsappConnected, setWhatsappConnected] = useState<boolean | null>(
    null
  );
  const [resyncToken, setResyncToken] = useState(0);

  const [contactPanelOpen, setContactPanelOpen] = useState(true);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONTACT_PANEL_STORAGE_KEY);
      if (stored !== null) setContactPanelOpen(stored === "true");
    } catch {}
  }, []);

  // ---- UI-only state ----
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleToggleContactPanel = useCallback(() => {
    setContactPanelOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(CONTACT_PANEL_STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  const autoSelectedForDeepLinkRef = useRef<string | null>(null);
  const hydratingConvIdsRef = useRef<Set<string>>(new Set());

  const knownConvIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const next = new Set<string>();
    for (const c of conversations) next.add(c.id);
    knownConvIdsRef.current = next;
  }, [conversations]);

  const hydrateConversation = useCallback(async (convId: string) => {
    if (hydratingConvIdsRef.current.has(convId)) return;
    hydratingConvIdsRef.current.add(convId);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("conversations")
        .select(CONVERSATION_SELECT)
        .eq("id", convId)
        .maybeSingle();
      if (error) {
        console.error("Failed to hydrate conversation:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return;
      }
      if (!data) return;
      const fetched = normalizeConversation(data);
      setConversations((prev) => {
        const existing = prev.find((c) => c.id === fetched.id);
        if (existing) {
          return prev.map((c) =>
            c.id === fetched.id
              ? { ...c, contact: c.contact ?? fetched.contact }
              : c
          );
        }
        return [fetched, ...prev];
      });
    } finally {
      hydratingConvIdsRef.current.delete(convId);
    }
  }, []);

  // WhatsApp connection status
  useEffect(() => {
    const checkConnection = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("user_id", user.id)
        .maybeSingle();
      const accountId = profile?.account_id as string | undefined;
      if (!accountId) {
        setWhatsappConnected(false);
        return;
      }

      const { data } = await supabase
        .from("whatsapp_config")
        .select("status")
        .eq("account_id", accountId)
        .maybeSingle();

      setWhatsappConnected(data?.status === "connected");
    };

    checkConnection();
  }, []);

  // Realtime message events
  const handleMessageEvent = useCallback(
    (event: { eventType: string; new: Message; old: Partial<Message> }) => {
      const newMsg = event.new;

      if (event.eventType === "INSERT") {
        if (
          activeConversation &&
          newMsg.conversation_id === activeConversation.id
        ) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            const withoutOptimistic = prev.filter(
              (m) => !m.id.startsWith("temp-")
            );
            return [...withoutOptimistic, newMsg];
          });
        }

        if (knownConvIdsRef.current.has(newMsg.conversation_id)) {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === newMsg.conversation_id
                ? {
                    ...c,
                    last_message_text: newMsg.content_text ?? "",
                    last_message_at: newMsg.created_at,
                    unread_count:
                      activeConversation?.id === newMsg.conversation_id
                        ? 0
                        : c.unread_count + 1,
                  }
                : c
            )
          );
        } else {
          hydrateConversation(newMsg.conversation_id);
        }
      }

      if (event.eventType === "UPDATE") {
        setMessages((prev) =>
          prev.map((m) => (m.id === newMsg.id ? { ...m, ...newMsg } : m))
        );
      }
    },
    [activeConversation, hydrateConversation]
  );

  // Realtime conversation events
  const handleConversationEvent = useCallback(
    (event: {
      eventType: string;
      new: Conversation;
      old: Partial<Conversation>;
    }) => {
      const conv = event.new;

      if (event.eventType === "INSERT") {
        if (!knownConvIdsRef.current.has(conv.id)) {
          setConversations((prev) => {
            if (prev.some((c) => c.id === conv.id)) return prev;
            return [conv, ...prev];
          });
          hydrateConversation(conv.id);
        }
      }

      if (event.eventType === "UPDATE") {
        if (knownConvIdsRef.current.has(conv.id)) {
          const isActive = activeConversation?.id === conv.id;
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conv.id
                ? {
                    ...c,
                    ...conv,
                    unread_count: isActive ? 0 : conv.unread_count,
                  }
                : c
            )
          );
        } else {
          hydrateConversation(conv.id);
        }

        if (activeConversation && conv.id === activeConversation.id) {
          setActiveConversation((prev) =>
            prev ? { ...prev, ...conv } : prev
          );
        }
      }
    },
    [activeConversation, hydrateConversation]
  );

  const { isConnected } = useRealtime({
    channelName: "inbox-realtime",
    onMessageEvent: handleMessageEvent,
    onConversationEvent: handleConversationEvent,
    enabled: true,
  });

  const wasConnectedRef = useRef(false);
  const initialConnectDoneRef = useRef(false);
  useEffect(() => {
    if (isConnected && !wasConnectedRef.current) {
      if (initialConnectDoneRef.current) {
        setResyncToken((n) => n + 1);
      } else {
        initialConnectDoneRef.current = true;
      }
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected]);

  // Visibility refetch
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        setResyncToken((n) => n + 1);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const handleManualRefresh = useCallback(() => {
    setResyncToken((n) => n + 1);
  }, []);

  // Top bar refresh (spins briefly)
  const handleTopRefresh = useCallback(() => {
    setIsRefreshing(true);
    setResyncToken((n) => n + 1);
    setTimeout(() => setIsRefreshing(false), 600);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (e.key === "Escape") {
        if (shortcutsOpen) {
          setShortcutsOpen(false);
          return;
        }
        if (
          activeConversation &&
          window.matchMedia("(max-width: 1023px)").matches
        ) {
          setActiveConversation(null);
          setActiveContact(null);
          setMessages([]);
          autoSelectedForDeepLinkRef.current = null;
          router.replace("/inbox", { scroll: false });
        }
        return;
      }

      if (inInput) return;

      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
      }

      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handleTopRefresh();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcutsOpen, activeConversation, router, handleTopRefresh]);

  const handleConversationsLoaded = useCallback(
    (loaded: Conversation[]) => {
      setConversations(loaded);
      if (
        deepLinkConvId &&
        autoSelectedForDeepLinkRef.current !== deepLinkConvId &&
        loaded.length > 0
      ) {
        autoSelectedForDeepLinkRef.current = deepLinkConvId;
        if (activeConversation?.id === deepLinkConvId) return;
        const match = loaded.find((c) => c.id === deepLinkConvId);
        if (match) {
          setActiveConversation(match);
          setActiveContact(match.contact ?? null);
          setMessages([]);
          if (match.unread_count > 0) {
            setConversations((prev) =>
              prev.map((c) =>
                c.id === match.id ? { ...c, unread_count: 0 } : c
              )
            );
          }
        }
      }
    },
    [deepLinkConvId, activeConversation?.id]
  );

  const handleSelectConversation = useCallback(
    (conv: Conversation) => {
      if (activeConversation?.id === conv.id) return;
      setActiveConversation(conv);
      setActiveContact(conv.contact ?? null);
      setMessages([]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conv.id && c.unread_count > 0
            ? { ...c, unread_count: 0 }
            : c
        )
      );
      autoSelectedForDeepLinkRef.current = conv.id;
      router.replace(`/inbox?c=${conv.id}`, { scroll: false });
    },
    [activeConversation?.id, router]
  );

  const handleCloseConversation = useCallback(() => {
    setActiveConversation(null);
    setActiveContact(null);
    setMessages([]);
    autoSelectedForDeepLinkRef.current = null;
    router.replace("/inbox", { scroll: false });
  }, [router]);

  const handleMessagesLoaded = useCallback((loaded: Message[]) => {
    setMessages(loaded);
  }, []);

  const handleNewMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const handleUpdateMessage = useCallback(
    (id: string, updates: Partial<Message>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
      );
    },
    []
  );

  const handleStatusChange = useCallback(
    (conversationId: string, status: ConversationStatus) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, status } : c))
      );
      if (activeConversation?.id === conversationId) {
        setActiveConversation((prev) => (prev ? { ...prev, status } : prev));
      }
    },
    [activeConversation]
  );

  const handleAssignChange = useCallback(
    (conversationId: string, assignedAgentId: string | null) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, assigned_agent_id: assignedAgentId ?? undefined }
            : c
        )
      );
      if (activeConversation?.id === conversationId) {
        setActiveConversation((prev) =>
          prev
            ? { ...prev, assigned_agent_id: assignedAgentId ?? undefined }
            : prev
        );
      }
    },
    [activeConversation]
  );

  const hasActiveConv = !!activeConversation;

  // Computed totals
  const totals = useMemo(() => {
    const total = conversations.length;
    const unread = conversations.reduce(
      (sum, c) => sum + (c.unread_count || 0),
      0
    );
    const open = conversations.filter(
      (c) => c.status === "open" || !c.status
    ).length;
    return { total, unread, open };
  }, [conversations]);

  return (
    <div className="-m-4 flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-slate-50 sm:-m-6">
      {/* ==================== TOP BAR ==================== */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20">
            <MessageSquare className="h-5 w-5" />
            {totals.unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                {totals.unread > 99 ? "99+" : totals.unread}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold tracking-tight text-slate-900">
              Inbox
            </h1>
            <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="truncate font-medium">
                {totals.total} conversation{totals.total === 1 ? "" : "s"}
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {totals.open} open
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <ConnectionPill
            connected={whatsappConnected}
            wsConnected={isConnected}
          />

          <div className="hidden h-8 items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 sm:flex">
            <button
              type="button"
              onClick={handleTopRefresh}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100"
              title="Refresh (R)"
              aria-label="Refresh"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
              />
            </button>
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100"
              title="Keyboard shortcuts (?)"
              aria-label="Keyboard shortcuts"
            >
              <Keyboard className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Mobile-only refresh */}
          <button
            type="button"
            onClick={handleTopRefresh}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 sm:hidden"
            aria-label="Refresh"
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefreshing && "animate-spin")}
            />
          </button>
        </div>
      </div>

      {/* ==================== CONNECTION BANNER ==================== */}
      {whatsappConnected === false && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <WifiOff className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-amber-900">
                WhatsApp not connected
              </p>
              <p className="truncate text-[11px] text-amber-700">
                {t("whatsappNotConnected")}
              </p>
            </div>
          </div>
          <a
            href="/settings/whatsapp"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-600 active:scale-95"
          >
            <Zap className="h-3 w-3" />
            Connect
          </a>
        </div>
      )}

      {/* ==================== PANES ==================== */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation list */}
        <div
          className={cn(
            "flex h-full flex-1 lg:flex-none",
            hasActiveConv ? "hidden lg:flex" : "flex"
          )}
        >
          <ConversationList
            activeConversationId={activeConversation?.id ?? null}
            onSelect={handleSelectConversation}
            conversations={conversations}
            onConversationsLoaded={handleConversationsLoaded}
            resyncToken={resyncToken}
          />
        </div>

        {/* Message thread */}
        <div
          className={cn(
            "flex h-full min-w-0 flex-1 lg:flex",
            hasActiveConv ? "flex" : "hidden lg:flex"
          )}
        >
          <MessageThread
            conversation={activeConversation}
            contact={activeContact}
            messages={messages}
            onMessagesLoaded={handleMessagesLoaded}
            onNewMessage={handleNewMessage}
            onUpdateMessage={handleUpdateMessage}
            onStatusChange={handleStatusChange}
            onAssignChange={handleAssignChange}
            onBack={handleCloseConversation}
            resyncToken={resyncToken}
            onRefresh={handleManualRefresh}
            contactPanelOpen={contactPanelOpen}
            onToggleContactPanel={handleToggleContactPanel}
          />
        </div>

        {/* Contact sidebar */}
        {contactPanelOpen && (
          <div className="hidden lg:block">
            <ContactSidebar contact={activeContact} />
          </div>
        )}
      </div>

      {/* ==================== SHORTCUTS DIALOG ==================== */}
      {shortcutsOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShortcutsOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <Keyboard className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Keyboard Shortcuts
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Speed up your workflow
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShortcutsOpen(false)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1 p-5">
              {[
                {
                  keys: ["R"],
                  label: "Refresh inbox",
                  description: "Reload conversations & messages",
                },
                {
                  keys: ["Esc"],
                  label: "Close thread",
                  description: "Return to conversation list",
                },
                {
                  keys: ["?"],
                  label: "Show shortcuts",
                  description: "Open this dialog",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900">
                      {item.label}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {item.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {item.keys.map((k) => (
                      <kbd
                        key={k}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] font-bold text-slate-700 shadow-sm"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-center">
              <p className="text-[10px] text-slate-500">
                Tip: Press <kbd className="rounded border border-slate-300 bg-white px-1 py-0.5 font-mono">?</kbd> anytime to reopen this dialog
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== CONNECTION PILL ====================

function ConnectionPill({
  connected,
  wsConnected,
}: {
  connected: boolean | null;
  wsConnected: boolean;
}) {
  if (connected === null) {
    return (
      <span className="hidden h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-500 sm:inline-flex">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
        Connecting
      </span>
    );
  }

  if (connected && wsConnected) {
    return (
      <span
        className="hidden h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700 sm:inline-flex"
        title="WhatsApp connected · Realtime active"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Live
      </span>
    );
  }

  if (connected && !wsConnected) {
    return (
      <span
        className="hidden h-8 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-[11px] font-semibold text-amber-700 sm:inline-flex"
        title="Reconnecting to realtime…"
      >
        <AlertCircle className="h-3 w-3 animate-pulse" />
        Reconnecting
      </span>
    );
  }

  return (
    <span
      className="hidden h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 text-[11px] font-semibold text-red-700 sm:inline-flex"
      title="WhatsApp not connected"
    >
      <WifiOff className="h-3 w-3" />
      Offline
    </span>
  );
}
