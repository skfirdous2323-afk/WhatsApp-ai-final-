"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles,
  Clock,
  Calendar,
  User,
  Phone,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Send,
  Loader2,
  Star,
  MapPin,
  MessageCircle,
  ArrowRight,
  PartyPopper,
  Briefcase,
  HelpCircle,
} from "lucide-react";

// ==================== TYPES ====================

type Category = {
  id: string;
  name: string;
  emoji: string;
  description: string;
};

type Service = {
  id: string;
  categoryId: string;
  name: string;
  duration_minutes: number;
  price: number;
  emoji: string;
};

type Provider = {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  emoji: string;
};

type Message = {
  id: string;
  sender: "bot" | "user";
  text?: string;
  timestamp: Date;
};

type Step =
  | "greeting"
  | "category"
  | "service"
  | "provider"
  | "date"
  | "time"
  | "contact"
  | "confirm"
  | "success";

type Booking = {
  category?: Category;
  service?: Service;
  provider?: Provider;
  date?: string;
  time?: string;
  name?: string;
  phone?: string;
};

type BusinessConfig = {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  whatsapp: string;
  categories: Category[];
  services: Service[];
  providers: Provider[];
};

// ==================== DEFAULT CONFIG (editable) ====================

const DEFAULT_CONFIG: BusinessConfig = {
  name: "Your Business",
  tagline: "We're here to help",
  address: "Update your address in settings",
  phone: "+919999999999",
  whatsapp: "919999999999",
  categories: [
    {
      id: "cat1",
      name: "Category One",
      emoji: "✨",
      description: "Description for category one",
    },
    {
      id: "cat2",
      name: "Category Two",
      emoji: "🌟",
      description: "Description for category two",
    },
    {
      id: "cat3",
      name: "Category Three",
      emoji: "💫",
      description: "Description for category three",
    },
  ],
  services: [
    {
      id: "svc1",
      categoryId: "cat1",
      name: "Service A",
      duration_minutes: 30,
      price: 500,
      emoji: "⚡",
    },
    {
      id: "svc2",
      categoryId: "cat1",
      name: "Service B",
      duration_minutes: 45,
      price: 800,
      emoji: "✨",
    },
    {
      id: "svc3",
      categoryId: "cat2",
      name: "Service C",
      duration_minutes: 60,
      price: 1200,
      emoji: "🎯",
    },
    {
      id: "svc4",
      categoryId: "cat3",
      name: "Service D",
      duration_minutes: 30,
      price: 400,
      emoji: "💠",
    },
  ],
  providers: [
    { id: "p1", name: "Team Member 1", specialty: "Expert", rating: 4.9, emoji: "👤" },
    { id: "p2", name: "Team Member 2", specialty: "Specialist", rating: 4.8, emoji: "👤" },
    { id: "p3", name: "Team Member 3", specialty: "Senior", rating: 4.9, emoji: "👤" },
  ],
};

// ==================== MAIN ====================

export default function ChatPage() {
  const supabase = useMemo(() => createClient(), []);

  const [config, setConfig] = useState<BusinessConfig>(DEFAULT_CONFIG);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const [step, setStep] = useState<Step>("greeting");
  const [booking, setBooking] = useState<Booking>({});
  const [inputText, setInputText] = useState("");
  const [saving, setSaving] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ---- Load business config dynamically ----
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setConfigLoaded(true);
          return;
        }

        const { data: clinic } = await supabase
          .from("clinics")
          .select("id, name")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!clinic) {
          setConfigLoaded(true);
          return;
        }

        const [{ data: servicesData }, { data: doctorsData }] = await Promise.all([
          supabase
            .from("clinic_services")
            .select("*")
            .eq("clinic_id", clinic.id)
            .eq("is_active", true),
          supabase.from("clinic_doctors").select("*").eq("clinic_id", clinic.id),
        ]);

        const newConfig: BusinessConfig = {
          ...config,
          name: clinic.name || config.name,
        };

        if (servicesData?.length) {
          // Group unique service names into categories
          const uniqueCats = new Map<string, Category>();
          const serviceList: Service[] = [];

          servicesData.forEach((s: any, i: number) => {
            const catName = s.category || s.service_type || "General Services";
            const catId = catName.toLowerCase().replace(/\s+/g, "-");

            if (!uniqueCats.has(catId)) {
              uniqueCats.set(catId, {
                id: catId,
                name: catName,
                emoji: ["✨", "🌟", "💫", "🎯", "💎", "🔥"][i % 6],
                description: "Explore our " + catName.toLowerCase(),
              });
            }

            serviceList.push({
              id: s.id,
              categoryId: catId,
              name: s.service_name,
              duration_minutes: s.duration_minutes || 30,
              price: s.price || s.amount || 500,
              emoji: ["⚡", "✨", "🎯", "💎", "🔥", "💠"][i % 6],
            });
          });

          newConfig.categories = Array.from(uniqueCats.values());
          newConfig.services = serviceList;
        }

        if (doctorsData?.length) {
          newConfig.providers = doctorsData.map((d: any, i: number) => ({
            id: d.id,
            name: d.doctor_name,
            specialty: d.specialty || "Specialist",
            rating: 4.7 + Math.random() * 0.3,
            emoji: ["👤", "👨‍⚕️", "👩‍⚕️", "🧑‍💼", "👨‍💼"][i % 5],
          }));
        }

        setConfig(newConfig);
      } catch (err) {
        console.error("Config load error:", err);
      } finally {
        setConfigLoaded(true);
      }
    };
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // ---- Auto scroll ----
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // ---- Initial greeting (only after config loaded) ----
  useEffect(() => {
    if (configLoaded && messages.length === 0) {
      setTimeout(() => {
        pushBot(
          `Hi! 👋 Welcome to **${config.name}**\n\nI'm here to help you book an appointment — quick and easy.\n\nWhat can I help you with today?`,
          "category"
        );
      }, 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configLoaded]);

  const pushBot = (text: string, nextStep?: Step) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}-${Math.random()}`,
          sender: "bot",
          text,
          timestamp: new Date(),
        },
      ]);
      if (nextStep) setStep(nextStep);
    }, 650);
  };

  const pushUser = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}-${Math.random()}`,
        sender: "user",
        text,
        timestamp: new Date(),
      },
    ]);
  };

  // ---- Step handlers ----
  const handleCategory = (cat: Category) => {
    pushUser(`${cat.emoji} ${cat.name}`);
    setBooking((b) => ({ ...b, category: cat, service: undefined }));
    setTimeout(() => {
      pushBot(`Great! Here's what we offer in **${cat.name}** —`, "service");
    }, 400);
  };

  const handleService = (service: Service) => {
    pushUser(`${service.name}`);
    setBooking((b) => ({ ...b, service }));
    setTimeout(() => {
      pushBot(
        `Nice pick! **${service.name}** · ₹${service.price} · ${service.duration_minutes} min\n\nWho would you like to meet with?`,
        "provider"
      );
    }, 400);
  };

  const handleProvider = (provider: Provider) => {
    pushUser(`${provider.name}`);
    setBooking((b) => ({ ...b, provider }));
    setTimeout(() => {
      pushBot(
        `${provider.name} is great — rated ${provider.rating.toFixed(1)} ⭐\n\nWhich day works for you?`,
        "date"
      );
    }, 400);
  };

  const handleDate = (date: string) => {
    const formatted = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });
    pushUser(formatted);
    setBooking((b) => ({ ...b, date }));
    setTimeout(() => {
      pushBot("Perfect! What time works best?", "time");
    }, 400);
  };

  const handleTime = (time: string) => {
    pushUser(time);
    setBooking((b) => ({ ...b, time }));
    setTimeout(() => {
      pushBot(
        "Almost done! ✨ Could you share your name and phone?",
        "contact"
      );
    }, 400);
  };

  const handleContact = (name: string, phone: string) => {
    pushUser(`${name} · ${phone}`);
    setBooking((b) => ({ ...b, name, phone }));
    setTimeout(() => {
      pushBot("Here's your booking summary 👇", "confirm");
    }, 400);
  };

  const confirmBooking = async () => {
    if (!booking.service || !booking.provider || !booking.date || !booking.time)
      return;
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: clinic } = await supabase
          .from("clinics")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .single();

        if (clinic) {
          await supabase.from("appointments").insert({
            clinic_id: clinic.id,
            user_id: user.id,
            doctor_id: booking.provider.id,
            service_id: booking.service.id,
            appointment_date: booking.date,
            appointment_time: booking.time,
            patient_name: booking.name || "Guest",
            patient_phone: booking.phone,
            status: "pending",
          });
        }
      }
    } catch (err) {
      console.error("Booking save error:", err);
    } finally {
      setSaving(false);
      pushBot(
        `You're all set! 🎉\n\nWe'll send you a confirmation on WhatsApp shortly.\n\nLooking forward to seeing you at **${config.name}** ✨`,
        "success"
      );
    }
  };

  const restart = () => {
    setMessages([]);
    setBooking({});
    setStep("greeting");
    setInputText("");
    setTimeout(() => {
      pushBot("Hi again! 👋 Ready for another booking?", "category");
    }, 300);
  };

  const goBackToCategories = () => {
    setBooking((b) => ({ ...b, category: undefined, service: undefined }));
    pushUser("← Back");
    setTimeout(() => {
      pushBot("Sure — pick a category 👇", "category");
    }, 400);
  };

  const goBackToServices = () => {
    setBooking((b) => ({ ...b, service: undefined }));
    pushUser("← Back");
    setTimeout(() => {
      pushBot("Sure — pick a service 👇", "service");
    }, 400);
  };

  // ---- Free-text smart replies ----
  const handleSendText = () => {
    if (!inputText.trim()) return;
    pushUser(inputText);
    const txt = inputText.toLowerCase();
    setInputText("");

    if (/\b(hi|hello|hey|namaste)\b/.test(txt)) {
      pushBot("Hello! 😊 What would you like to book today?", "category");
    } else if (txt.includes("price") || txt.includes("cost") || txt.includes("rate") || txt.includes("charge")) {
      pushBot("Prices vary by service — pick a category to see them 👇", "category");
    } else if (txt.includes("open") || txt.includes("hour") || txt.includes("timing")) {
      pushBot("We're open 9 AM – 8 PM, Monday to Sunday ✨", "category");
    } else if (txt.includes("where") || txt.includes("location") || txt.includes("address")) {
      pushBot(`We're at **${config.address}** 📍`, "category");
    } else if (txt.includes("cancel") || txt.includes("reschedule")) {
      pushBot(
        "Please call us at " + config.phone + " to cancel or reschedule.",
        "category"
      );
    } else if (txt.includes("thank")) {
      pushBot("You're welcome! 😊 Anything else I can help with?", "category");
    } else {
      pushBot("Sure! Let's get you booked. Pick a category 👇", "category");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
        {/* ============ HEADER ============ */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-lg sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white shadow-lg shadow-blue-500/30">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                  {config.name}
                </h1>
                <p className="flex items-center gap-1 text-[11px] text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Online · Replies instantly
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`tel:${config.phone}`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition hover:bg-blue-100"
                title="Call us"
              >
                <Phone className="h-4 w-4" />
              </a>
              <a
                href={`https://wa.me/${config.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
                title="WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>
        </header>

        {/* ============ CHAT AREA ============ */}
        <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
          <div className="space-y-3">
            {!configLoaded && (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
              </div>
            )}

            {configLoaded &&
              messages.map((m) => <MessageBubble key={m.id} message={m} />)}

            {configLoaded && !typing && step === "category" && (
              <CategoryPicker
                categories={config.categories}
                onSelect={handleCategory}
              />
            )}

            {configLoaded && !typing && step === "service" && booking.category && (
              <ServicePicker
                category={booking.category}
                services={config.services.filter(
                  (s) => s.categoryId === booking.category?.id
                )}
                onSelect={handleService}
                onBack={goBackToCategories}
              />
            )}

            {configLoaded && !typing && step === "provider" && (
              <ProviderPicker
                providers={config.providers}
                onSelect={handleProvider}
                onBack={goBackToServices}
              />
            )}

            {configLoaded && !typing && step === "date" && (
              <DatePicker onSelect={handleDate} />
            )}

            {configLoaded && !typing && step === "time" && (
              <TimePicker onSelect={handleTime} />
            )}

            {configLoaded && !typing && step === "contact" && (
              <ContactForm onSubmit={handleContact} />
            )}

            {configLoaded && !typing && step === "confirm" && booking.service && (
              <BookingSummary
                booking={booking}
                onConfirm={confirmBooking}
                onCancel={restart}
                saving={saving}
              />
            )}

            {configLoaded && !typing && step === "success" && (
              <SuccessCard booking={booking} onRestart={restart} config={config} />
            )}

            {configLoaded && typing && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* ============ INPUT ============ */}
        {configLoaded && step !== "success" && (
          <footer className="sticky bottom-0 border-t border-slate-200 bg-white/90 px-3 py-3 backdrop-blur-lg sm:px-6">
            <div className="flex items-center gap-2">
              <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendText()}
                placeholder="Type a message..."
                className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <button
                onClick={handleSendText}
                disabled={!inputText.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 transition hover:scale-105 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-400">
              Powered by AI assistant 💫
            </p>
          </footer>
        )}
      </div>
    </div>
  );
}

// ==================== MESSAGE BUBBLE ====================

function MessageBubble({ message }: { message: Message }) {
  const isBot = message.sender === "bot";
  const time = message.timestamp.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"}`}>
      <div
        className={`flex max-w-[85%] items-end gap-2 sm:max-w-[75%] ${
          isBot ? "" : "flex-row-reverse"
        }`}
      >
        {isBot && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
        )}
        <div className="min-w-0">
          <div
            className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
              isBot
                ? "rounded-tl-sm border border-slate-100 bg-white text-slate-800"
                : "rounded-tr-sm bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
            }`}
          >
            {message.text?.split("**").map((part, i) =>
              i % 2 === 1 ? (
                <strong key={i} className="font-semibold">
                  {part}
                </strong>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </div>
          <p
            className={`mt-1 text-[10px] text-slate-400 ${
              isBot ? "pl-1" : "pr-1 text-right"
            }`}
          >
            {time}
          </p>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="rounded-2xl rounded-tl-sm border border-slate-100 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-blue-400"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-blue-400"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-blue-400"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}

// ==================== CATEGORY PICKER ====================

function CategoryPicker({
  categories,
  onSelect,
}: {
  categories: Category[];
  onSelect: (c: Category) => void;
}) {
  if (categories.length === 0) {
    return (
      <div className="ml-10 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold">No categories available yet</p>
        <p className="mt-1 text-xs">
          Please contact us directly at the number above.
        </p>
      </div>
    );
  }

  return (
    <div className="ml-10 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {categories.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c)}
          className="group flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 text-lg transition group-hover:scale-110">
            {c.emoji}
          </div>
          <p className="mt-2 text-xs font-bold text-slate-900">{c.name}</p>
          <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-500">
            {c.description}
          </p>
        </button>
      ))}
    </div>
  );
}

// ==================== SERVICE PICKER ====================

function ServicePicker({
  category,
  services,
  onSelect,
  onBack,
}: {
  category: Category;
  services: Service[];
  onSelect: (s: Service) => void;
  onBack: () => void;
}) {
  return (
    <div className="ml-10 space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {category.emoji} {category.name}
        </span>
      </div>

      {services.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          No services available in this category yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg">
                {s.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-900">
                  {s.name}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-[10px]">
                  <span className="font-bold text-blue-600">₹{s.price}</span>
                  <span className="text-slate-400">·</span>
                  <span className="flex items-center gap-0.5 text-slate-500">
                    <Clock className="h-2.5 w-2.5" />
                    {s.duration_minutes}m
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-blue-500" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== PROVIDER PICKER ====================

function ProviderPicker({
  providers,
  onSelect,
  onBack,
}: {
  providers: Provider[];
  onSelect: (p: Provider) => void;
  onBack: () => void;
}) {
  return (
    <div className="ml-10 space-y-2">
      <button
        onClick={onBack}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {providers.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          No team members available.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className="group flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-2xl">
                {p.emoji}
              </div>
              <p className="mt-2 text-xs font-bold text-slate-900">{p.name}</p>
              <p className="text-[10px] text-slate-500">{p.specialty}</p>
              <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-600">
                <Star className="h-3 w-3 fill-current" />
                <span className="font-semibold">{p.rating.toFixed(1)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== DATE PICKER ====================

function DatePicker({ onSelect }: { onSelect: (d: string) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="ml-10 flex gap-2 overflow-x-auto pb-2">
      {days.map((d) => {
        const key = d.toLocaleDateString("en-CA");
        const isToday = key === new Date().toLocaleDateString("en-CA");
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className="flex min-w-[70px] shrink-0 flex-col items-center rounded-2xl border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
          >
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              {isToday
                ? "Today"
                : d.toLocaleDateString("en-US", { weekday: "short" })}
            </span>
            <span className="mt-1 text-lg font-bold text-slate-900">
              {d.getDate()}
            </span>
            <span className="text-[10px] uppercase text-slate-400">
              {d.toLocaleDateString("en-US", { month: "short" })}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ==================== TIME PICKER ====================

function TimePicker({ onSelect }: { onSelect: (t: string) => void }) {
  const slots = [
    "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30",
    "13:00", "13:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30",
  ];

  return (
    <div className="ml-10 grid grid-cols-4 gap-2">
      {slots.map((t) => (
        <button
          key={t}
          onClick={() => onSelect(t)}
          className="rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ==================== CONTACT FORM ====================

function ContactForm({
  onSubmit,
}: {
  onSubmit: (name: string, phone: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const valid = name.trim().length >= 2 && phone.trim().length >= 8;

  return (
    <div className="ml-10 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-3">
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            inputMode="tel"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <button
          onClick={() => valid && onSubmit(name.trim(), phone.trim())}
          disabled={!valid}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:shadow-blue-500/40 disabled:opacity-50"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ==================== BOOKING SUMMARY ====================

function BookingSummary({
  booking,
  onConfirm,
  onCancel,
  saving,
}: {
  booking: Booking;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const formatted = booking.date
    ? new Date(`${booking.date}T00:00:00`).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";

  return (
    <div className="ml-10 overflow-hidden rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-md">
      <div className="border-b border-blue-100 bg-white/70 px-4 py-3">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
          <Sparkles className="h-3.5 w-3.5" />
          Booking Summary
        </p>
      </div>

      <div className="space-y-3 p-4">
        {booking.category && (
          <SummaryRow
            icon={<Briefcase className="h-4 w-4" />}
            label="Category"
            value={`${booking.category.emoji} ${booking.category.name}`}
          />
        )}
        <SummaryRow
          icon={<Sparkles className="h-4 w-4" />}
          label="Service"
          value={booking.service?.name || ""}
          sub={`₹${booking.service?.price} · ${booking.service?.duration_minutes} min`}
        />
        <SummaryRow
          icon={<User className="h-4 w-4" />}
          label="With"
          value={booking.provider?.name || ""}
          sub={booking.provider?.specialty}
        />
        <SummaryRow
          icon={<Calendar className="h-4 w-4" />}
          label="Date & Time"
          value={formatted}
          sub={`at ${booking.time}`}
        />
        <SummaryRow
          icon={<Phone className="h-4 w-4" />}
          label="Contact"
          value={booking.name || ""}
          sub={booking.phone || ""}
        />
      </div>

      <div className="flex gap-2 border-t border-blue-100 bg-white/70 px-4 py-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={saving}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:shadow-blue-500/40 disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Booking...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Confirm
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
          {value}
        </p>
        {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

// ==================== SUCCESS CARD ====================

function SuccessCard({
  booking,
  onRestart,
  config,
}: {
  booking: Booking;
  onRestart: () => void;
  config: BusinessConfig;
}) {
  const formatted = booking.date
    ? new Date(`${booking.date}T00:00:00`).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";

  const waMessage = encodeURIComponent(
    `Hi! I just booked.\n\nService: ${booking.service?.name}\nWith: ${booking.provider?.name}\nDate: ${formatted} at ${booking.time}\nName: ${booking.name}`
  );

  return (
    <div className="ml-10 overflow-hidden rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-blue-50 shadow-lg">
      <div className="relative bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-6 text-center text-white">
        <div className="absolute inset-0 overflow-hidden opacity-20">
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className="absolute text-lg"
              style={{
                left: `${(i * 13) % 100}%`,
                top: `${(i * 7) % 100}%`,
                transform: `rotate(${i * 30}deg)`,
              }}
            >
              {["✨", "🎉", "💫", "🌟"][i % 4]}
            </span>
          ))}
        </div>
        <div className="relative">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <PartyPopper className="h-8 w-8" />
          </div>
          <h2 className="mt-3 text-lg font-bold">Booking Confirmed!</h2>
          <p className="mt-1 text-xs opacity-90">Your slot is reserved</p>
        </div>
      </div>

      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
          <span className="text-xs text-slate-500">Service</span>
          <span className="text-sm font-semibold text-slate-900">
            {booking.service?.name}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
          <span className="text-xs text-slate-500">With</span>
          <span className="text-sm font-semibold text-slate-900">
            {booking.provider?.name}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
          <span className="text-xs text-slate-500">When</span>
          <span className="text-sm font-semibold text-slate-900">
            {formatted}, {booking.time}
          </span>
        </div>
        {config.address && (
          <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
            <span className="text-xs text-slate-500">Where</span>
            <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">
              <MapPin className="h-3.5 w-3.5 text-blue-500" />
              {config.address}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-emerald-100 bg-white/70 p-4">
        <a
          href={`https://wa.me/${config.whatsapp}?text=${waMessage}`}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40"
        >
          <MessageCircle className="h-4 w-4" />
          Confirm on WhatsApp
        </a>
        <button
          onClick={onRestart}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Book Another
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
