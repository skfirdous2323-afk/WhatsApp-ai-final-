"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ContactForm } from "@/components/contacts/contact-form";
import {
  Search,
  Users,
  CalendarDays,
  Clock,
  XCircle,
  RefreshCw,
  Loader2,
  Phone,
  Mail,
  Building2,
  ArrowLeft,
  User,
  MessageCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  Stethoscope,
  Tag,
  Download,
  Printer,
  FileText,
  Activity,
  TrendingUp,
  IndianRupee,
  CheckSquare,
  Square,
  Bell,
  Keyboard,
  Edit3,
  Paperclip,
  Moon,
  Sun,
  Check,
  AlertCircle,
  Info,
  BarChart3,
  Pill,
  Heart,
  CreditCard,
  Trash2,
  Save,
  DollarSign,
} from "lucide-react";

// ==================== TYPES ====================

type Customer = {
  id: string;
  name?: string;
  phone: string;
  email?: string;
  company?: string;
  created_at: string;
};

type Appointment = {
  id: string;
  contact_id: string;
  patient_name: string;
  gender?: string;
  age?: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  doctor_id?: string;
  service_id?: string;
  amount?: number;
  payment_status?: string;
  payment_method?: string;
};

type Note = {
  id: string;
  note_text: string;
  created_at: string;
};

type Doctor = { id: string; doctor_name: string };
type Service = {
  id: string;
  service_name: string;
  duration_minutes?: number;
  assigned_doctors?: string[];
};

type MessageItem = {
  id: string;
  content_text?: string;
  message_type?: string;
  direction?: string;
  created_at: string;
  status?: string;
};

type DocumentItem = {
  id: string;
  file_name: string;
  file_url?: string;
  file_type?: string;
  created_at: string;
};

type Prescription = {
  id: string;
  appointment_id?: string;
  diagnosis?: string;
  medicines?: string;
  notes?: string;
  created_at: string;
};

type MedicalInfo = {
  allergies?: string[];
  chronic_conditions?: string[];
  blood_group?: string;
  emergency_contact?: string;
};

type CustomerTab =
  | "overview"
  | "appointments"
  | "notes"
  | "prescriptions"
  | "medical"
  | "messages"
  | "documents";

type MainTab = "customers" | "calendar" | "analytics";
type SortOption = "recent" | "name" | "appointments";

type ToastType = "success" | "error" | "info";
type Toast = { id: string; type: ToastType; message: string };

type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

// ==================== MAIN COMPONENT ====================

export default function CustomerManagementPage() {
  const supabase = useMemo(() => createClient(), []);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customerNotes, setCustomerNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [appointmentDoctor, setAppointmentDoctor] = useState("");
  const [appointmentService, setAppointmentService] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [appointmentPatientName, setAppointmentPatientName] = useState("");
  const [appointmentGender, setAppointmentGender] = useState("");
  const [appointmentAge, setAppointmentAge] = useState("");
  const [appointmentAmount, setAppointmentAmount] = useState("");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month">(
    "month"
  );
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [calendarDoctorFilter, setCalendarDoctorFilter] = useState("");
  const [calendarStatusFilter, setCalendarStatusFilter] = useState("");
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [updatingAppointmentStatus, setUpdatingAppointmentStatus] =
    useState(false);

  // UI state
  const [customerTab, setCustomerTab] = useState<CustomerTab>("overview");
  const [mainTab, setMainTab] = useState<MainTab>("customers");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Customer-specific data
  const [customerMessages, setCustomerMessages] = useState<MessageItem[]>([]);
  const [customerDocuments, setCustomerDocuments] = useState<DocumentItem[]>(
    []
  );
  const [customerPrescriptions, setCustomerPrescriptions] = useState<
    Prescription[]
  >([]);
  const [customerMedical, setCustomerMedical] = useState<MedicalInfo>({});
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [loadingMedical, setLoadingMedical] = useState(false);
  const [tags, setTags] = useState<Record<string, string[]>>({});
  const [tagInput, setTagInput] = useState("");

  // Medical editing
  const [editingMedical, setEditingMedical] = useState(false);
  const [medicalForm, setMedicalForm] = useState<MedicalInfo>({});
  const [savingMedical, setSavingMedical] = useState(false);

  // Prescription editing
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [prescriptionDiagnosis, setPrescriptionDiagnosis] = useState("");
  const [prescriptionMedicines, setPrescriptionMedicines] = useState("");
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [savingPrescription, setSavingPrescription] = useState(false);

  // Payment editing
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [savingPayment, setSavingPayment] = useState(false);

  // List filters
  const [listStatusFilter, setListStatusFilter] = useState("");
  const [listTagFilter, setListTagFilter] = useState("");
  const [listSort, setListSort] = useState<SortOption>("recent");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement | null>(null);

  // ==================== THEME ====================

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("cm_theme");
      if (saved === "dark" || saved === "light") setTheme(saved);
      else if (window.matchMedia("(prefers-color-scheme: dark)").matches)
        setTheme("dark");
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      window.localStorage.setItem("cm_theme", next);
    } catch {}
  };

  // ==================== TOAST ====================

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // ==================== CONFIRM ====================

  const askConfirm = useCallback(
    (opts: {
      title: string;
      message: string;
      confirmText?: string;
      destructive?: boolean;
      onConfirm: () => void;
    }) => {
      setConfirmState({
        open: true,
        title: opts.title,
        message: opts.message,
        confirmText: opts.confirmText || "Confirm",
        destructive: opts.destructive,
        onConfirm: () => {
          setConfirmState((s) => ({ ...s, open: false }));
          opts.onConfirm();
        },
      });
    },
    []
  );

  // ==================== HELPERS ====================

  const formatCalendarDate = (date: Date) => date.toLocaleDateString("en-CA");

  const getDoctorName = (doctorId?: string) => {
    if (!doctorId) return "Unassigned";
    return (
      doctors.find((doctor) => doctor.id === doctorId)?.doctor_name ||
      "Doctor"
    );
  };

  const getServiceName = (serviceId?: string) => {
    if (!serviceId) return "Consultation";
    return (
      services.find((service) => service.id === serviceId)?.service_name ||
      "Service"
    );
  };

  const getAppointmentStatusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300";
      case "completed":
        return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300";
      case "cancelled":
      case "canceled":
        return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300";
      case "no-show":
        return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
      default:
        return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
    }
  };

  const getAppointmentStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "Confirmed";
      case "completed":
        return "Completed";
      case "cancelled":
      case "canceled":
        return "Cancelled";
      case "no-show":
        return "No-show";
      default:
        return "Pending";
    }
  };

  const getClinicId = async (userId: string) => {
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (clinicError || !clinic) throw new Error("Clinic not found");
    return clinic.id;
  };

  // ==================== TAGS ====================

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("cm_customer_tags");
      if (raw) setTags(JSON.parse(raw));
    } catch {}
  }, []);

  const persistTags = (next: Record<string, string[]>) => {
    setTags(next);
    try {
      window.localStorage.setItem("cm_customer_tags", JSON.stringify(next));
    } catch {}
  };

  const addTagToCustomer = (customerId: string, tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    const current = tags[customerId] || [];
    if (current.includes(trimmed)) return;
    persistTags({ ...tags, [customerId]: [...current, trimmed] });
  };

  const removeTagFromCustomer = (customerId: string, tag: string) => {
    const current = tags[customerId] || [];
    persistTags({ ...tags, [customerId]: current.filter((t) => t !== tag) });
  };

  // ==================== DATA LOADERS ====================

  const loadAppointmentOptions = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) return;

      const clinicId = await getClinicId(user.id);

      const [{ data: doctorData }, { data: serviceData }] = await Promise.all([
        supabase
          .from("clinic_doctors")
          .select("id, doctor_name")
          .eq("clinic_id", clinicId)
          .order("created_at", { ascending: false }),

        supabase
          .from("clinic_services")
          .select("id, service_name, duration_minutes, assigned_doctors")
          .eq("clinic_id", clinicId)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
      ]);

      setDoctors((doctorData || []) as Doctor[]);
      setServices((serviceData || []) as Service[]);
    } catch (error) {
      console.error("Appointment options error:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        { data: contacts, error: contactsError },
        { data: appointmentData, error: appointmentsError },
      ] = await Promise.all([
        supabase
          .from("contacts")
          .select("id, name, phone, email, company, created_at")
          .order("created_at", { ascending: false }),

        supabase
          .from("appointments")
          .select(
            "id, contact_id, patient_name, gender, age, appointment_date, appointment_time, status, doctor_id, service_id, amount, payment_status, payment_method"
          )
          .order("appointment_date", { ascending: false }),
      ]);

      if (contactsError) console.error(contactsError);
      if (appointmentsError) console.error(appointmentsError);

      setCustomers((contacts || []) as Customer[]);
      setAppointments((appointmentData || []) as Appointment[]);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerNotes = async (contactId: string) => {
    const { data, error } = await supabase
      .from("contact_notes")
      .select("*")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false });
    if (!error) setCustomerNotes((data || []) as Note[]);
  };

  const loadCustomerMessages = async (contactId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("id, content_text, message_type, direction, created_at, status")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!error) setCustomerMessages((data || []) as MessageItem[]);
      else setCustomerMessages([]);
    } catch {
      setCustomerMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadCustomerDocuments = async (contactId: string) => {
    setLoadingDocuments(true);
    try {
      const { data, error } = await supabase
        .from("contact_documents")
        .select("id, file_name, file_url, file_type, created_at")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });
      if (!error) setCustomerDocuments((data || []) as DocumentItem[]);
      else setCustomerDocuments([]);
    } catch {
      setCustomerDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const loadCustomerPrescriptions = async (contactId: string) => {
    setLoadingPrescriptions(true);
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("id, appointment_id, diagnosis, medicines, notes, created_at")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });
      if (!error) setCustomerPrescriptions((data || []) as Prescription[]);
      else setCustomerPrescriptions([]);
    } catch {
      setCustomerPrescriptions([]);
    } finally {
      setLoadingPrescriptions(false);
    }
  };

  const loadCustomerMedical = async (contactId: string) => {
    setLoadingMedical(true);
    try {
      const { data, error } = await supabase
        .from("contact_medical_info")
        .select("*")
        .eq("contact_id", contactId)
        .maybeSingle();

      if (!error && data) {
        setCustomerMedical(data as MedicalInfo);
        setMedicalForm(data as MedicalInfo);
      } else {
        setCustomerMedical({});
        setMedicalForm({});
      }
    } catch {
      setCustomerMedical({});
      setMedicalForm({});
    } finally {
      setLoadingMedical(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerNotes(selectedCustomer.id);
      loadCustomerMessages(selectedCustomer.id);
      loadCustomerDocuments(selectedCustomer.id);
      loadCustomerPrescriptions(selectedCustomer.id);
      loadCustomerMedical(selectedCustomer.id);
      setCustomerTab("overview");
      setEditingMedical(false);
    } else {
      setCustomerNotes([]);
      setCustomerMessages([]);
      setCustomerDocuments([]);
      setCustomerPrescriptions([]);
      setCustomerMedical({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer?.id]);

  // ==================== KEYBOARD SHORTCUTS ====================

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (e.key === "Escape") {
        if (confirmState.open) {
          setConfirmState((s) => ({ ...s, open: false }));
        } else if (appointmentOpen) setAppointmentOpen(false);
        else if (paymentOpen) setPaymentOpen(false);
        else if (prescriptionOpen) setPrescriptionOpen(false);
        else if (selectedAppointment) setSelectedAppointment(null);
        else if (shortcutsOpen) setShortcutsOpen(false);
        else if (selectedCustomer) setSelectedCustomer(null);
        return;
      }

      if (inInput) return;

      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "n" || e.key === "N") {
        if (selectedCustomer) {
          setAppointmentOpen(true);
          loadAppointmentOptions();
        }
      } else if (e.key === "?") {
        setShortcutsOpen(true);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    appointmentOpen,
    selectedAppointment,
    shortcutsOpen,
    selectedCustomer,
    confirmState.open,
    paymentOpen,
    prescriptionOpen,
  ]);

  // ==================== DERIVED ====================

  const filteredCustomers = useMemo(() => {
    const term = search.toLowerCase().trim();
    let list = customers;

    if (term) {
      list = list.filter(
        (customer) =>
          customer.name?.toLowerCase().includes(term) ||
          customer.phone?.toLowerCase().includes(term) ||
          customer.email?.toLowerCase().includes(term)
      );
    }

    if (listTagFilter) {
      list = list.filter((c) => (tags[c.id] || []).includes(listTagFilter));
    }

    if (listStatusFilter) {
      list = list.filter((c) => {
        const customerAppts = appointments.filter(
          (a) => a.contact_id === c.id
        );
        if (listStatusFilter === "has_upcoming") {
          const today = formatCalendarDate(new Date());
          return customerAppts.some(
            (a) =>
              a.appointment_date >= today &&
              (a.status === "pending" || a.status === "confirmed")
          );
        }
        if (listStatusFilter === "no_appointments") {
          return customerAppts.length === 0;
        }
        return customerAppts.some(
          (a) => a.status.toLowerCase() === listStatusFilter
        );
      });
    }

    if (listSort === "name") {
      list = [...list].sort((a, b) =>
        (a.name || a.phone || "").localeCompare(b.name || b.phone || "")
      );
    } else if (listSort === "appointments") {
      list = [...list].sort((a, b) => {
        const ac = appointments.filter((x) => x.contact_id === a.id).length;
        const bc = appointments.filter((x) => x.contact_id === b.id).length;
        return bc - ac;
      });
    }

    return list;
  }, [
    customers,
    search,
    tags,
    listTagFilter,
    listStatusFilter,
    listSort,
    appointments,
  ]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    Object.values(tags).forEach((arr) => arr.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [tags]);

  const getCustomerAppointments = (customerId: string) =>
    appointments.filter((a) => a.contact_id === customerId);

  const pendingAppointments = appointments.filter(
    (a) => a.status === "pending"
  ).length;

  const cancelledAppointments = appointments.filter(
    (a) => a.status === "cancelled" || a.status === "canceled"
  ).length;

  const getUpcomingAppointment = (customerId: string) => {
    const today = formatCalendarDate(new Date());
    return appointments
      .filter(
        (a) =>
          a.contact_id === customerId &&
          a.appointment_date >= today &&
          (a.status === "pending" || a.status === "confirmed")
      )
      .sort((a, b) =>
        `${a.appointment_date}${a.appointment_time}`.localeCompare(
          `${b.appointment_date}${b.appointment_time}`
        )
      )[0];
  };

  const getLifetimeStats = (customerId: string) => {
    const list = getCustomerAppointments(customerId);
    const paid = list.filter(
      (a) => a.payment_status === "paid" || a.status === "completed"
    );
    const total = paid.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const lastVisit = list[0]?.appointment_date || null;
    return {
      totalVisits: list.filter((a) => a.status === "completed").length,
      totalRevenue: total,
      lastVisit,
      totalAppointments: list.length,
    };
  };

  // ==================== ANALYTICS ====================

  const analytics = useMemo(() => {
    const now = new Date();
    const totalRevenue = appointments
      .filter((a) => a.payment_status === "paid")
      .reduce((s, a) => s + (Number(a.amount) || 0), 0);

    const pendingRevenue = appointments
      .filter(
        (a) =>
          a.status !== "cancelled" &&
          a.status !== "no-show" &&
          a.payment_status !== "paid"
      )
      .reduce((s, a) => s + (Number(a.amount) || 0), 0);

    const noShowCount = appointments.filter(
      (a) => a.status === "no-show"
    ).length;
    const totalReal = appointments.filter(
      (a) => a.status !== "cancelled"
    ).length;
    const noShowRate = totalReal > 0 ? (noShowCount / totalReal) * 100 : 0;

    const completed = appointments.filter(
      (a) => a.status === "completed"
    ).length;
    const completionRate =
      totalReal > 0 ? (completed / totalReal) * 100 : 0;

    // Doctor load
    const doctorCount: Record<string, number> = {};
    appointments.forEach((a) => {
      if (a.doctor_id) {
        doctorCount[a.doctor_id] = (doctorCount[a.doctor_id] || 0) + 1;
      }
    });
    const topDoctors = Object.entries(doctorCount)
      .map(([id, count]) => ({
        id,
        name: getDoctorName(id),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Weekly trend (last 7 days)
    const weeklyTrend: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = formatCalendarDate(d);
      const count = appointments.filter(
        (a) => a.appointment_date === key
      ).length;
      weeklyTrend.push({
        date: d.toLocaleDateString("en-US", { weekday: "short" }),
        count,
      });
    }
    const maxWeekly = Math.max(...weeklyTrend.map((w) => w.count), 1);

    // Peak hours
    const hourCount: Record<string, number> = {};
    appointments.forEach((a) => {
      const h = (a.appointment_time || "").slice(0, 2);
      if (h) hourCount[h] = (hourCount[h] || 0) + 1;
    });
    const peakHours = Object.entries(hourCount)
      .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRevenue,
      pendingRevenue,
      noShowRate,
      completionRate,
      topDoctors,
      weeklyTrend,
      maxWeekly,
      peakHours,
      totalAppointments: appointments.length,
      totalCustomers: customers.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, customers, doctors]);

  // ==================== ACTIONS ====================

  const addCustomerNote = async () => {
    if (!selectedCustomer || !newNote.trim()) return;

    setSavingNote(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("contacts")
        .select("account_id")
        .eq("id", selectedCustomer.id)
        .single();
      if (!profile?.account_id) return;

      const { error } = await supabase.from("contact_notes").insert({
        contact_id: selectedCustomer.id,
        account_id: profile.account_id,
        user_id: user.id,
        note_text: newNote.trim(),
      });

      if (!error) {
        setNewNote("");
        await loadCustomerNotes(selectedCustomer.id);
        showToast("Note added");
      } else {
        showToast("Failed to add note", "error");
      }
    } finally {
      setSavingNote(false);
    }
  };

  const saveMedicalInfo = async () => {
    if (!selectedCustomer) return;
    setSavingMedical(true);
    try {
      const payload = {
        contact_id: selectedCustomer.id,
        allergies: medicalForm.allergies || [],
        chronic_conditions: medicalForm.chronic_conditions || [],
        blood_group: medicalForm.blood_group || null,
        emergency_contact: medicalForm.emergency_contact || null,
      };

      const { error } = await supabase
        .from("contact_medical_info")
        .upsert(payload, { onConflict: "contact_id" });

      if (error) {
        showToast("Failed to save medical info", "error");
        return;
      }

      setCustomerMedical(payload as MedicalInfo);
      setEditingMedical(false);
      showToast("Medical info saved");
    } finally {
      setSavingMedical(false);
    }
  };

  const savePrescription = async () => {
    if (!selectedCustomer || !prescriptionDiagnosis.trim()) {
      showToast("Diagnosis required", "error");
      return;
    }
    setSavingPrescription(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        showToast("Please login", "error");
        return;
      }
      const clinicId = await getClinicId(user.id);

      const { error } = await supabase.from("prescriptions").insert({
        contact_id: selectedCustomer.id,
        clinic_id: clinicId,
        user_id: user.id,
        diagnosis: prescriptionDiagnosis.trim(),
        medicines: prescriptionMedicines.trim(),
        notes: prescriptionNotes.trim(),
      });

      if (error) {
        showToast("Failed to save prescription", "error");
        return;
      }

      setPrescriptionDiagnosis("");
      setPrescriptionMedicines("");
      setPrescriptionNotes("");
      setPrescriptionOpen(false);
      await loadCustomerPrescriptions(selectedCustomer.id);
      showToast("Prescription saved");
    } finally {
      setSavingPrescription(false);
    }
  };

  const printPrescription = (p: Prescription) => {
    const customer = selectedCustomer;
    const html = `
      <html><head><title>Prescription</title>
      <style>
        body{font-family:Arial;padding:40px;color:#111;line-height:1.6}
        h1{margin:0 0 6px}
        .muted{color:#666;font-size:12px}
        .box{border:1px solid #ddd;border-radius:8px;padding:16px;margin-top:16px}
        .label{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.05em}
        pre{white-space:pre-wrap;font-family:inherit;margin:4px 0 0}
      </style></head><body>
      <h1>Prescription</h1>
      <p class="muted">${new Date(p.created_at).toLocaleString()}</p>
      <div class="box"><p class="label">Patient</p><p>${customer?.name || "-"} · ${customer?.phone || ""}</p></div>
      <div class="box"><p class="label">Diagnosis</p><p>${p.diagnosis || "-"}</p></div>
      <div class="box"><p class="label">Medicines</p><pre>${p.medicines || "-"}</pre></div>
      ${p.notes ? `<div class="box"><p class="label">Notes</p><pre>${p.notes}</pre></div>` : ""}
      </body></html>
    `;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  const updatePayment = async () => {
    if (!selectedAppointment) return;
    setSavingPayment(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          amount: paymentAmount ? Number(paymentAmount) : null,
          payment_status: paymentStatus,
          payment_method: paymentMethod,
        })
        .eq("id", selectedAppointment.id);

      if (error) {
        showToast("Failed to save payment", "error");
        return;
      }

      setSelectedAppointment((s) =>
        s
          ? {
              ...s,
              amount: paymentAmount ? Number(paymentAmount) : undefined,
              payment_status: paymentStatus,
              payment_method: paymentMethod,
            }
          : s
      );

      setPaymentOpen(false);
      await loadData();
      showToast("Payment updated");
    } finally {
      setSavingPayment(false);
    }
  };

  const rescheduleAppointment = async (
    appointmentId: string,
    newDate: string,
    newTime: string
  ) => {
    const { error } = await supabase
      .from("appointments")
      .update({ appointment_date: newDate, appointment_time: newTime })
      .eq("id", appointmentId);
    if (error) {
      showToast("Reschedule failed", "error");
      return false;
    }
    await loadData();
    showToast("Appointment rescheduled");
    return true;
  };

  const loadAvailableSlots = async (doctorId: string, date: string) => {
    if (!doctorId || !date) return [];

    const { data: settings } = await supabase
      .from("clinic_appointment_settings")
      .select("slot_duration")
      .limit(1)
      .single();
    const duration = settings?.slot_duration || 30;

    const selectedDate = new Date(`${date}T00:00:00`);
    const weekday = selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
    });

    const { data: workingHour } = await supabase
      .from("clinic_working_hours")
      .select("day_name, open_time, close_time, is_closed")
      .eq("day_name", weekday)
      .limit(1)
      .maybeSingle();
    if (!workingHour || workingHour.is_closed) return [];

    const { data: doctor } = await supabase
      .from("clinic_doctors")
      .select("available_days, start_time, end_time")
      .eq("id", doctorId)
      .maybeSingle();

    if (doctor?.available_days?.length) {
      const doctorDays = doctor.available_days.map((d: string) =>
        d.toLowerCase()
      );
      if (!doctorDays.includes(weekday.toLowerCase())) return [];
    }

    const { data: booked } = await supabase
      .from("appointments")
      .select("appointment_time")
      .eq("doctor_id", doctorId)
      .eq("appointment_date", date)
      .in("status", ["pending", "confirmed"]);
    const bookedTimes = new Set(
      (booked || []).map((item) => item.appointment_time)
    );

    const slots: string[] = [];
    const doctorStart = String(
      doctor?.start_time || workingHour.open_time || "09:00"
    ).slice(0, 5);
    const doctorEnd = String(
      doctor?.end_time || workingHour.close_time || "18:00"
    ).slice(0, 5);

    const [openHour, openMinute] = doctorStart.split(":").map(Number);
    const [closeHour, closeMinute] = doctorEnd.split(":").map(Number);
    let currentMinutes = openHour * 60 + openMinute;
    const closingMinutes = closeHour * 60 + closeMinute;

    while (currentMinutes < closingMinutes) {
      const hour = Math.floor(currentMinutes / 60);
      const minute = currentMinutes % 60;
      const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(
        2,
        "0"
      )}`;
      if (
        currentMinutes + duration <= closingMinutes &&
        !bookedTimes.has(time)
      ) {
        slots.push(time);
      }
      currentMinutes += duration;
    }
    return slots;
  };

  const refreshAvailableSlots = async (doctorId: string, date: string) => {
    setAppointmentTime("");
    setAvailableSlots([]);
    if (!doctorId || !date) return;
    setLoadingSlots(true);
    try {
      const slots = await loadAvailableSlots(doctorId, date);
      setAvailableSlots(slots);
    } finally {
      setLoadingSlots(false);
    }
  };

  const createAppointment = async () => {
    if (
      !selectedCustomer ||
      !appointmentDoctor ||
      !appointmentService ||
      !appointmentDate ||
      !appointmentTime
    ) {
      showToast("Please fill Doctor, Service, Date and Time", "error");
      return;
    }

    setSavingAppointment(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        showToast("Please login again", "error");
        return;
      }

      const clinicId = await getClinicId(user.id);
      const selectedService = services.find(
        (s) => s.id === appointmentService
      );

      if (
        selectedService?.assigned_doctors?.length &&
        !selectedService.assigned_doctors.includes(appointmentDoctor)
      ) {
        showToast(
          "Selected doctor is not assigned to this service",
          "error"
        );
        return;
      }

      const { data: existingAppointment } = await supabase
        .from("appointments")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("doctor_id", appointmentDoctor)
        .eq("appointment_date", appointmentDate)
        .eq("appointment_time", appointmentTime)
        .in("status", ["pending", "confirmed"])
        .limit(1)
        .maybeSingle();

      if (existingAppointment) {
        showToast("This slot is already booked", "error");
        await refreshAvailableSlots(appointmentDoctor, appointmentDate);
        return;
      }

      const { error } = await supabase
        .from("appointments")
        .insert({
          clinic_id: clinicId,
          user_id: user.id,
          contact_id: selectedCustomer.id,
          doctor_id: appointmentDoctor,
          service_id: appointmentService,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          patient_name:
            appointmentPatientName.trim() || selectedCustomer.name || "",
          gender: appointmentGender || null,
          age: appointmentAge ? Number(appointmentAge) : null,
          amount: appointmentAmount ? Number(appointmentAmount) : null,
          status: "pending",
          payment_status: "pending",
        })
        .select("id")
        .single();

      if (error) {
        showToast(`Failed: ${error.message}`, "error");
        return;
      }

      // WhatsApp (best effort, never blocks)
      try {
        const doctorName = getDoctorName(appointmentDoctor);
        const serviceName = getServiceName(appointmentService);
        const patientName =
          appointmentPatientName.trim() || selectedCustomer.name || "Patient";
        const formattedDate = new Date(
          `${appointmentDate}T00:00:00`
        ).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });

        const msg = [
          `Hello ${patientName},`,
          ``,
          `Your appointment has been booked successfully.`,
          ``,
          `👨‍⚕️ Doctor: ${doctorName}`,
          `🩺 Service: ${serviceName}`,
          `📅 Date: ${formattedDate}`,
          `🕐 Time: ${appointmentTime}`,
          `📌 Status: Pending Confirmation`,
          ``,
          `Thank you.`,
        ].join("\n");

        await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contact_id: selectedCustomer.id,
            message_type: "text",
            content_text: msg,
          }),
        });
      } catch (e) {
        console.error("WhatsApp error:", e);
      }

      setAppointmentDoctor("");
      setAppointmentService("");
      setAppointmentDate("");
      setAppointmentTime("");
      setAppointmentPatientName("");
      setAppointmentGender("");
      setAppointmentAge("");
      setAppointmentAmount("");
      setAppointmentOpen(false);
      await loadData();
      showToast("Appointment created");
    } finally {
      setSavingAppointment(false);
    }
  };

  const updateAppointmentStatus = async (
    appointmentId: string,
    status: "pending" | "confirmed" | "completed" | "cancelled" | "no-show"
  ) => {
    setUpdatingAppointmentStatus(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", appointmentId);

      if (error) {
        showToast("Failed to update status", "error");
        return;
      }

      setSelectedAppointment((current) =>
        current?.id === appointmentId ? { ...current, status } : current
      );

      // WhatsApp notification (best effort)
      try {
        const appointment = appointments.find(
          (a) => a.id === appointmentId
        );
        if (appointment?.contact_id) {
          const customer = customers.find(
            (c) => c.id === appointment.contact_id
          );
          const statusMessages: Record<string, string> = {
            pending: "Your appointment is pending confirmation.",
            confirmed: "Your appointment has been confirmed.",
            cancelled: "Your appointment has been cancelled.",
            completed: "Your appointment has been marked completed. Thank you.",
            "no-show":
              "Our records show the appointment was marked no-show.",
          };
          const msg = [
            `Hello ${appointment.patient_name || customer?.name || "Patient"},`,
            ``,
            statusMessages[status],
            ``,
            `📅 ${appointment.appointment_date} 🕐 ${appointment.appointment_time}`,
          ].join("\n");

          await fetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contact_id: appointment.contact_id,
              message_type: "text",
              content_text: msg,
            }),
          });
        }
      } catch (e) {
        console.error("WhatsApp error:", e);
      }

      await loadData();
      showToast("Status updated");
    } finally {
      setUpdatingAppointmentStatus(false);
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    askConfirm({
      title: "Cancel appointment?",
      message: "This will cancel the appointment and notify the patient.",
      confirmText: "Cancel Appointment",
      destructive: true,
      onConfirm: async () => {
        const { error } = await supabase
          .from("appointments")
          .update({ status: "cancelled" })
          .eq("id", appointmentId);
        if (error) {
          showToast("Failed to cancel", "error");
          return;
        }
        await loadData();
        showToast("Appointment cancelled");
      },
    });
  };

  // ==================== CALENDAR ENGINE ====================

  const calendarMonthLabel = calendarDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const calendarWeekStart = new Date(calendarDate);
  calendarWeekStart.setHours(0, 0, 0, 0);
  calendarWeekStart.setDate(
    calendarWeekStart.getDate() - calendarWeekStart.getDay()
  );

  const calendarWeekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(calendarWeekStart);
    d.setDate(calendarWeekStart.getDate() + i);
    return d;
  });

  const calendarMonthStart = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth(),
    1
  );
  const calendarMonthEnd = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth() + 1,
    0
  );

  const calendarGridStart = new Date(calendarMonthStart);
  calendarGridStart.setDate(
    calendarMonthStart.getDate() - calendarMonthStart.getDay()
  );
  const calendarGridEnd = new Date(calendarMonthEnd);
  calendarGridEnd.setDate(
    calendarMonthEnd.getDate() + (6 - calendarMonthEnd.getDay())
  );

  const calendarMonthDays: Date[] = [];
  const monthCursor = new Date(calendarGridStart);
  while (monthCursor <= calendarGridEnd) {
    calendarMonthDays.push(new Date(monthCursor));
    monthCursor.setDate(monthCursor.getDate() + 1);
  }

  const appointmentsForDate = (date: Date) => {
    const dateKey = formatCalendarDate(date);
    const query = appointmentSearch.trim().toLowerCase();

    return appointments
      .filter((a) => a.appointment_date === dateKey)
      .filter((a) => {
        if (!query) return true;
        const customer = customers.find((c) => c.id === a.contact_id);
        return [
          a.patient_name,
          customer?.name,
          customer?.phone,
          getDoctorName(a.doctor_id),
          getServiceName(a.service_id),
          a.status,
          a.appointment_time,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(query));
      })
      .filter(
        (a) =>
          !calendarDoctorFilter || a.doctor_id === calendarDoctorFilter
      )
      .filter(
        (a) =>
          !calendarStatusFilter ||
          a.status.toLowerCase() === calendarStatusFilter
      )
      .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  };

  const changeCalendarDate = (direction: number) => {
    setCalendarDate((current) => {
      const next = new Date(current);
      if (calendarView === "day") next.setDate(next.getDate() + direction);
      else if (calendarView === "week")
        next.setDate(next.getDate() + direction * 7);
      else next.setMonth(next.getMonth() + direction);
      return next;
    });
  };

  const isCalendarToday = (date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  // ==================== EXPORT ====================

  const exportCustomersCSV = (onlySelected = false) => {
    const source = onlySelected
      ? customers.filter((c) => selectedIds.has(c.id))
      : filteredCustomers;

    const rows = [
      ["Name", "Phone", "Email", "Company", "Tags", "Appointments", "Created"],
      ...source.map((c) => [
        c.name || "",
        c.phone || "",
        c.email || "",
        c.company || "",
        (tags[c.id] || []).join(" | "),
        String(getCustomerAppointments(c.id).length),
        c.created_at,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${formatCalendarDate(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported CSV");
  };

  const exportAppointmentsCSV = () => {
    const rows = [
      [
        "Patient",
        "Phone",
        "Doctor",
        "Service",
        "Date",
        "Time",
        "Status",
        "Amount",
        "Payment",
      ],
      ...appointments.map((a) => {
        const c = customers.find((x) => x.id === a.contact_id);
        return [
          a.patient_name || c?.name || "",
          c?.phone || "",
          getDoctorName(a.doctor_id),
          getServiceName(a.service_id),
          a.appointment_date,
          a.appointment_time,
          a.status,
          a.amount ? String(a.amount) : "",
          a.payment_status || "",
        ];
      }),
    ];
    const csv = rows
      .map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appointments-${formatCalendarDate(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported appointments");
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCustomers.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredCustomers.map((c) => c.id)));
  };

  const bulkSendWhatsApp = () => {
    if (selectedIds.size === 0) return;
    const message = window.prompt(
      `Send WhatsApp to ${selectedIds.size} customer(s):`
    );
    if (!message?.trim()) return;

    askConfirm({
      title: `Send to ${selectedIds.size} customers?`,
      message: "Messages will be delivered via WhatsApp.",
      confirmText: "Send",
      onConfirm: async () => {
        setBulkWorking(true);
        let sent = 0;
        let failed = 0;
        for (const id of Array.from(selectedIds)) {
          try {
            const res = await fetch("/api/whatsapp/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contact_id: id,
                message_type: "text",
                content_text: message,
              }),
            });
            if (res.ok) sent++;
            else failed++;
          } catch {
            failed++;
          }
        }
        setBulkWorking(false);
        setSelectedIds(new Set());
        showToast(`Sent: ${sent}, Failed: ${failed}`);
      },
    });
  };

  const bulkAddTag = () => {
    if (selectedIds.size === 0) return;
    const tag = window.prompt("Enter tag:");
    if (!tag?.trim()) return;
    const next = { ...tags };
    Array.from(selectedIds).forEach((id) => {
      const existing = next[id] || [];
      if (!existing.includes(tag.trim())) next[id] = [...existing, tag.trim()];
    });
    persistTags(next);
    setSelectedIds(new Set());
    showToast("Tag added");
  };

  const printReceipt = (appointment: Appointment) => {
    const customer = customers.find((c) => c.id === appointment.contact_id);
    const html = `
      <html><head><title>Receipt</title>
      <style>
        body{font-family:Arial;padding:40px;color:#111}
        h1{margin:0 0 4px;font-size:22px}
        .muted{color:#666;font-size:12px}
        .box{border:1px solid #ddd;border-radius:8px;padding:16px;margin-top:16px}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        td{padding:8px 0;border-bottom:1px solid #eee;font-size:14px}
        td:first-child{color:#666;width:160px}
      </style></head><body>
      <h1>Appointment Receipt</h1>
      <p class="muted">Generated ${new Date().toLocaleString()}</p>
      <div class="box"><table>
        <tr><td>Patient</td><td>${appointment.patient_name || customer?.name || "-"}</td></tr>
        <tr><td>Phone</td><td>${customer?.phone || "-"}</td></tr>
        <tr><td>Doctor</td><td>${getDoctorName(appointment.doctor_id)}</td></tr>
        <tr><td>Service</td><td>${getServiceName(appointment.service_id)}</td></tr>
        <tr><td>Date</td><td>${appointment.appointment_date}</td></tr>
        <tr><td>Time</td><td>${appointment.appointment_time}</td></tr>
        <tr><td>Status</td><td>${appointment.status}</td></tr>
        <tr><td>Amount</td><td>₹${appointment.amount || 0}</td></tr>
        <tr><td>Payment</td><td>${appointment.payment_status || "pending"}</td></tr>
      </table></div>
      <p class="muted" style="margin-top:24px;">Thank you.</p>
    </body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  // ==================== SHARED MODALS ====================

  const appointmentModal =
    appointmentOpen && selectedCustomer ? (
      <ModalShell onClose={() => setAppointmentOpen(false)}>
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              New Appointment
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              For {selectedCustomer.name || selectedCustomer.phone}
            </p>
          </div>
          <IconBtn onClick={() => setAppointmentOpen(false)}>
            <XCircle className="h-5 w-5" />
          </IconBtn>
        </div>

        <div className="space-y-4">
          <SelectBox
            value={appointmentDoctor}
            onChange={(v) => {
              setAppointmentDoctor(v);
              refreshAvailableSlots(v, appointmentDate);
            }}
          >
            <option value="">Select Doctor</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.doctor_name}
              </option>
            ))}
          </SelectBox>

          <SelectBox
            value={appointmentService}
            onChange={setAppointmentService}
          >
            <option value="">Select Service</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.service_name}
              </option>
            ))}
          </SelectBox>

          <InputBox
            type="date"
            value={appointmentDate}
            onChange={(v) => {
              setAppointmentDate(v);
              setAppointmentTime("");
              if (!appointmentDoctor || !v) {
                setAvailableSlots([]);
                return;
              }
              refreshAvailableSlots(appointmentDoctor, v);
            }}
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Available Time
            </label>
            {!appointmentDoctor || !appointmentDate ? (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                Select Doctor and Date first.
              </p>
            ) : loadingSlots ? (
              <p className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading slots...
              </p>
            ) : availableSlots.length === 0 ? (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
                No available slots.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setAppointmentTime(slot)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      appointmentTime === slot
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-900 hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>

          <InputBox
            value={appointmentPatientName}
            onChange={setAppointmentPatientName}
            placeholder="Patient Name"
          />

          <div className="grid grid-cols-2 gap-3">
            <SelectBox value={appointmentGender} onChange={setAppointmentGender}>
              <option value="">Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </SelectBox>
            <InputBox
              type="number"
              value={appointmentAge}
              onChange={setAppointmentAge}
              placeholder="Age"
            />
          </div>

          <InputBox
            type="number"
            value={appointmentAmount}
            onChange={setAppointmentAmount}
            placeholder="Amount (₹) — optional"
          />

          <button
            onClick={createAppointment}
            disabled={savingAppointment}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingAppointment && <Loader2 className="h-4 w-4 animate-spin" />}
            {savingAppointment ? "Creating..." : "Create Appointment"}
          </button>
        </div>
      </ModalShell>
    ) : null;

  const appointmentDetailsModal = selectedAppointment ? (
    <ModalShell onClose={() => setSelectedAppointment(null)} size="lg">
      <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/40 px-6 py-5 dark:border-slate-700 dark:from-slate-800 dark:to-slate-800">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Appointment Details
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
            {selectedAppointment.patient_name || "Patient"}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn onClick={() => printReceipt(selectedAppointment)}>
            <Printer className="h-5 w-5" />
          </IconBtn>
          <IconBtn onClick={() => setSelectedAppointment(null)}>
            <XCircle className="h-6 w-6" />
          </IconBtn>
        </div>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2">
        {(() => {
          const customer = customers.find(
            (c) => c.id === selectedAppointment.contact_id
          );
          const phone = customer?.phone || "";
          return (
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4 sm:col-span-2 dark:border-slate-700">
              {phone && (
                <>
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    <Phone className="h-4 w-4" /> Call
                  </a>
                  <a
                    href={`https://wa.me/${phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-600"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                </>
              )}
              {customer && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAppointment(null);
                    setSelectedCustomer(customer);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  <User className="h-4 w-4" /> Profile
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setPaymentAmount(
                    selectedAppointment.amount
                      ? String(selectedAppointment.amount)
                      : ""
                  );
                  setPaymentStatus(
                    selectedAppointment.payment_status || "pending"
                  );
                  setPaymentMethod(
                    selectedAppointment.payment_method || "cash"
                  );
                  setPaymentOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
              >
                <CreditCard className="h-4 w-4" /> Payment
              </button>
            </div>
          );
        })()}

        <DetailBox label="Date" value={selectedAppointment.appointment_date} />
        <DetailBox label="Time" value={selectedAppointment.appointment_time} />
        <DetailBox
          label="Doctor"
          value={getDoctorName(selectedAppointment.doctor_id)}
        />
        <DetailBox
          label="Service"
          value={getServiceName(selectedAppointment.service_id)}
        />

        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase text-slate-400">
            Payment
          </p>
          <div className="mt-2 space-y-1 text-sm">
            <p className="font-semibold text-slate-900 dark:text-white">
              ₹{selectedAppointment.amount || 0}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Status:{" "}
              <span
                className={
                  selectedAppointment.payment_status === "paid"
                    ? "font-semibold text-emerald-600"
                    : "font-semibold text-amber-600"
                }
              >
                {selectedAppointment.payment_status || "pending"}
              </span>
            </p>
            {selectedAppointment.payment_method && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Method: {selectedAppointment.payment_method}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase text-slate-400">
            Patient
          </p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">
            {selectedAppointment.patient_name || "Not available"}
          </p>
          {(() => {
            const c = customers.find(
              (x) => x.id === selectedAppointment.contact_id
            );
            return (
              <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                <p>📞 {c?.phone || "-"}</p>
                <p>✉️ {c?.email || "-"}</p>
              </div>
            );
          })()}
        </div>

        <DetailBox
          label="Details"
          value={`${selectedAppointment.gender || "—"}${
            selectedAppointment.age ? ` • ${selectedAppointment.age} yrs` : ""
          }`}
        />
      </div>

      <div className="border-t border-slate-200 px-6 py-5 dark:border-slate-700">
        <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Status
        </p>
        <div className="mb-5 flex flex-wrap gap-2">
          {(
            [
              "pending",
              "confirmed",
              "completed",
              "no-show",
              "cancelled",
            ] as const
          ).map((status) => (
            <button
              key={status}
              type="button"
              disabled={updatingAppointmentStatus}
              onClick={() =>
                updateAppointmentStatus(selectedAppointment.id, status)
              }
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition ${
                selectedAppointment.status === status
                  ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              } disabled:opacity-50`}
            >
              {updatingAppointmentStatus &&
                selectedAppointment.status !== status && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
              {status}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={() => printReceipt(selectedAppointment)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            onClick={() => setSelectedAppointment(null)}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </ModalShell>
  ) : null;

  const paymentModal = paymentOpen && selectedAppointment ? (
    <ModalShell onClose={() => setPaymentOpen(false)}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Payment
        </h2>
        <IconBtn onClick={() => setPaymentOpen(false)}>
          <XCircle className="h-5 w-5" />
        </IconBtn>
      </div>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Amount (₹)
          </label>
          <InputBox
            type="number"
            value={paymentAmount}
            onChange={setPaymentAmount}
            placeholder="0"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Status
          </label>
          <SelectBox value={paymentStatus} onChange={setPaymentStatus}>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="refunded">Refunded</option>
          </SelectBox>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Method
          </label>
          <SelectBox value={paymentMethod} onChange={setPaymentMethod}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="netbanking">Net Banking</option>
            <option value="other">Other</option>
          </SelectBox>
        </div>
        <button
          onClick={updatePayment}
          disabled={savingPayment}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
        >
          {savingPayment && <Loader2 className="h-4 w-4 animate-spin" />}
          {savingPayment ? "Saving..." : "Save Payment"}
        </button>
      </div>
    </ModalShell>
  ) : null;

  const prescriptionModal = prescriptionOpen ? (
    <ModalShell onClose={() => setPrescriptionOpen(false)}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          New Prescription
        </h2>
        <IconBtn onClick={() => setPrescriptionOpen(false)}>
          <XCircle className="h-5 w-5" />
        </IconBtn>
      </div>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Diagnosis *
          </label>
          <InputBox
            value={prescriptionDiagnosis}
            onChange={setPrescriptionDiagnosis}
            placeholder="e.g. Viral fever"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Medicines
          </label>
          <textarea
            value={prescriptionMedicines}
            onChange={(e) => setPrescriptionMedicines(e.target.value)}
            rows={5}
            placeholder={"Paracetamol 500mg — 1-0-1 — 5 days\nVitamin C — 0-1-0 — 7 days"}
            className="w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Notes
          </label>
          <textarea
            value={prescriptionNotes}
            onChange={(e) => setPrescriptionNotes(e.target.value)}
            rows={3}
            placeholder="Additional advice..."
            className="w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <button
          onClick={savePrescription}
          disabled={savingPrescription}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:opacity-50"
        >
          {savingPrescription && <Loader2 className="h-4 w-4 animate-spin" />}
          {savingPrescription ? "Saving..." : "Save Prescription"}
        </button>
      </div>
    </ModalShell>
  ) : null;

  // ==================== CUSTOMER DETAILS ====================

  if (selectedCustomer) {
    const customerAppointments = getCustomerAppointments(selectedCustomer.id);
    const upcoming = getUpcomingAppointment(selectedCustomer.id);
    const stats = getLifetimeStats(selectedCustomer.id);
    const customerTagList = tags[selectedCustomer.id] || [];

    return (
      <div className={theme === "dark" ? "dark" : ""}>
        <div className="min-h-screen bg-slate-50 p-4 text-slate-900 transition-colors md:p-6 lg:p-8 dark:bg-slate-950 dark:text-white">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>

            {upcoming && (
              <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-900 dark:from-emerald-950/40 dark:to-teal-950/40">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Upcoming
                    </p>
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                      {upcoming.appointment_date} at{" "}
                      {upcoming.appointment_time} ·{" "}
                      {getDoctorName(upcoming.doctor_id)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAppointment(upcoming)}
                  className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-800 dark:text-emerald-300"
                >
                  View
                </button>
              </div>
            )}

            {/* Profile */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 dark:border-slate-800 dark:from-slate-800 dark:to-slate-800">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white shadow-md">
                    {(selectedCustomer.name || selectedCustomer.phone || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {selectedCustomer.name || "Unnamed Customer"}
                    </h1>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      ID:{" "}
                      <span className="font-mono">{selectedCustomer.id}</span>
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {customerTagList.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
                        >
                          <Tag className="h-3 w-3" />
                          {tag}
                          <button
                            onClick={() =>
                              removeTagFromCustomer(selectedCustomer.id, tag)
                            }
                            className="ml-1 text-blue-400 transition hover:text-blue-700"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <div className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-800">
                        <input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && tagInput.trim()) {
                              addTagToCustomer(
                                selectedCustomer.id,
                                tagInput
                              );
                              setTagInput("");
                            }
                          }}
                          placeholder="Add tag"
                          className="w-20 bg-transparent text-xs text-slate-700 outline-none dark:text-slate-200"
                        />
                        <button
                          onClick={() => {
                            if (tagInput.trim()) {
                              addTagToCustomer(
                                selectedCustomer.id,
                                tagInput
                              );
                              setTagInput("");
                            }
                          }}
                          className="text-xs font-semibold text-blue-600"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                  {selectedCustomer.phone && (
                    <>
                      <a
                        href={`tel:${selectedCustomer.phone}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        <Phone className="h-4 w-4" /> Call
                      </a>
                      <a
                        href={`https://wa.me/${selectedCustomer.phone.replace(
                          /[^0-9]/g,
                          ""
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-600"
                      >
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </a>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setAppointmentPatientName(selectedCustomer.name || "");
                      setAppointmentOpen(true);
                      loadAppointmentOptions();
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" /> Book
                  </button>
                  <button
                    onClick={() => setPrescriptionOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
                  >
                    <Pill className="h-4 w-4" /> Prescribe
                  </button>
                </div>
              </div>

              <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
                <InfoCard
                  icon={<Phone className="h-4 w-4" />}
                  label="Phone"
                  value={selectedCustomer.phone || "—"}
                />
                <InfoCard
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  value={selectedCustomer.email || "—"}
                />
                <InfoCard
                  icon={<Building2 className="h-4 w-4" />}
                  label="Company"
                  value={selectedCustomer.company || "—"}
                />
              </div>
            </div>

            {/* Lifetime stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Appointments"
                value={stats.totalAppointments}
                icon={<CalendarDays className="h-5 w-5" />}
                variant="blue"
              />
              <StatCard
                title="Visits"
                value={stats.totalVisits}
                icon={<TrendingUp className="h-5 w-5" />}
                variant="indigo"
              />
              <StatCard
                title="Revenue"
                value={stats.totalRevenue}
                icon={<IndianRupee className="h-5 w-5" />}
                variant="amber"
                prefix="₹"
              />
              <StatCard
                title="Active"
                value={
                  customerAppointments.filter(
                    (a) => a.status === "pending" || a.status === "confirmed"
                  ).length
                }
                icon={<Clock className="h-5 w-5" />}
                variant="red"
              />
            </div>

            {/* Tabs */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex overflow-x-auto">
                  {(
                    [
                      { id: "overview", label: "Overview", icon: <Activity className="h-4 w-4" /> },
                      { id: "appointments", label: `Appointments (${customerAppointments.length})`, icon: <CalendarDays className="h-4 w-4" /> },
                      { id: "prescriptions", label: `Rx (${customerPrescriptions.length})`, icon: <Pill className="h-4 w-4" /> },
                      { id: "medical", label: "Medical", icon: <Heart className="h-4 w-4" /> },
                      { id: "notes", label: `Notes (${customerNotes.length})`, icon: <FileText className="h-4 w-4" /> },
                      { id: "messages", label: `Messages (${customerMessages.length})`, icon: <MessageCircle className="h-4 w-4" /> },
                      { id: "documents", label: `Docs (${customerDocuments.length})`, icon: <Paperclip className="h-4 w-4" /> },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setCustomerTab(tab.id)}
                      className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-5 py-3.5 text-sm font-semibold transition ${
                        customerTab === tab.id
                          ? "border-blue-600 bg-white text-blue-600 dark:bg-slate-900 dark:text-blue-400"
                          : "border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5 md:p-6">
                {customerTab === "overview" && (
                  <ActivityTimeline
                    customer={selectedCustomer}
                    appointments={customerAppointments}
                    notes={customerNotes}
                    messages={customerMessages}
                    onSelectAppointment={setSelectedAppointment}
                  />
                )}

                {customerTab === "appointments" && (
                  <AppointmentsTab
                    appointments={customerAppointments}
                    customerName={selectedCustomer.name || ""}
                    getDoctorName={getDoctorName}
                    getServiceName={getServiceName}
                    onSelect={setSelectedAppointment}
                    onCancel={cancelAppointment}
                    onReschedule={rescheduleAppointment}
                  />
                )}

                {customerTab === "prescriptions" && (
                  <PrescriptionsTab
                    prescriptions={customerPrescriptions}
                    loading={loadingPrescriptions}
                    onPrint={printPrescription}
                    onCreate={() => setPrescriptionOpen(true)}
                  />
                )}

                {customerTab === "medical" && (
                  <MedicalTab
                    medical={customerMedical}
                    loading={loadingMedical}
                    editing={editingMedical}
                    form={medicalForm}
                    setForm={setMedicalForm}
                    onEdit={() => setEditingMedical(true)}
                    onCancel={() => {
                      setEditingMedical(false);
                      setMedicalForm(customerMedical);
                    }}
                    onSave={saveMedicalInfo}
                    saving={savingMedical}
                  />
                )}

                {customerTab === "notes" && (
                  <div>
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Write a note..."
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                    <button
                      onClick={addCustomerNote}
                      disabled={savingNote || !newNote.trim()}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingNote && <Loader2 className="h-4 w-4 animate-spin" />}
                      {savingNote ? "Saving..." : "Add Note"}
                    </button>
                    <div className="mt-5 space-y-3">
                      {customerNotes.length === 0 ? (
                        <p className="text-sm text-slate-400">No notes yet.</p>
                      ) : (
                        customerNotes.map((note) => (
                          <div
                            key={note.id}
                            className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
                          >
                            <p className="text-sm text-slate-700 dark:text-slate-200">
                              {note.note_text}
                            </p>
                            <p className="mt-2 text-xs text-slate-400">
                              {new Date(note.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {customerTab === "messages" && (
                  <div>
                    {loadingMessages ? (
                      <SkeletonList />
                    ) : customerMessages.length === 0 ? (
                      <EmptyState
                        icon={<MessageCircle className="h-10 w-10" />}
                        title="No messages"
                        description="WhatsApp conversations appear here."
                      />
                    ) : (
                      <div className="space-y-3">
                        {customerMessages.map((msg) => {
                          const outbound =
                            (msg.direction || "").toLowerCase() === "outbound";
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${
                                outbound ? "justify-end" : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                                  outbound
                                    ? "bg-blue-600 text-white"
                                    : "border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                }`}
                              >
                                <p className="whitespace-pre-wrap">
                                  {msg.content_text || "(empty)"}
                                </p>
                                <p
                                  className={`mt-1 text-[10px] ${
                                    outbound
                                      ? "text-blue-100"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {new Date(msg.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {customerTab === "documents" && (
                  <div>
                    {loadingDocuments ? (
                      <SkeletonList />
                    ) : customerDocuments.length === 0 ? (
                      <EmptyState
                        icon={<Paperclip className="h-10 w-10" />}
                        title="No documents"
                        description="Uploaded files will appear here."
                      />
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {customerDocuments.map((doc) => (
                          <a
                            key={doc.id}
                            href={doc.file_url || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">
                                {doc.file_name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(doc.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {appointmentModal}
          {appointmentDetailsModal}
          {paymentModal}
          {prescriptionModal}
          <ToastContainer toasts={toasts} />
          <ConfirmDialog
            state={confirmState}
            onCancel={() =>
              setConfirmState((s) => ({ ...s, open: false }))
            }
          />
        </div>
      </div>
    );
  }

  // ==================== MAIN VIEW ====================

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 p-4 text-slate-900 transition-colors md:p-6 lg:p-8 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">
                Customer Management
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Manage customers, appointments, payments and analytics.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
              <button
                onClick={() => setShortcutsOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Keyboard className="h-4 w-4" />
              </button>
              <button
                onClick={() => exportCustomersCSV(false)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Download className="h-4 w-4" /> CSV
              </button>
              <button
                onClick={() => setAddCustomerOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
              <button
                onClick={loadData}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Main tabs */}
          <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            {(
              [
                { id: "customers", label: "Customers", icon: <Users className="h-4 w-4" /> },
                { id: "calendar", label: "Calendar", icon: <CalendarDays className="h-4 w-4" /> },
                { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id)}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  mainTab === tab.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Stats */}
          {mainTab !== "analytics" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Customers" value={customers.length} icon={<Users className="h-5 w-5" />} variant="blue" />
              <StatCard title="Appointments" value={appointments.length} icon={<CalendarDays className="h-5 w-5" />} variant="indigo" />
              <StatCard title="Pending" value={pendingAppointments} icon={<Clock className="h-5 w-5" />} variant="amber" />
              <StatCard title="Cancelled" value={cancelledAppointments} icon={<XCircle className="h-5 w-5" />} variant="red" />
            </div>
          )}

          {/* Calendar view */}
          {mainTab === "calendar" && (
            <CalendarView
              {...{
                calendarDate,
                calendarView,
                setCalendarView,
                changeCalendarDate,
                setCalendarDate,
                calendarMonthLabel,
                calendarMonthDays,
                calendarWeekDays,
                appointmentsForDate,
                isCalendarToday,
                formatCalendarDate,
                getAppointmentStatusClass,
                getAppointmentStatusLabel,
                getDoctorName,
                getServiceName,
                setSelectedAppointment,
                appointmentSearch,
                setAppointmentSearch,
                doctors,
                calendarDoctorFilter,
                setCalendarDoctorFilter,
                calendarStatusFilter,
                setCalendarStatusFilter,
                appointments,
              }}
            />
          )}

          {/* Analytics view */}
          {mainTab === "analytics" && (
            <AnalyticsView
              analytics={analytics}
              exportAppointments={exportAppointmentsCSV}
            />
          )}

          {/* Customers view */}
          {mainTab === "customers" && (
            <>
              {/* Search + filters */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={searchRef}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search customer...  ( / )"
                      className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <select
                    value={listStatusFilter}
                    onChange={(e) => setListStatusFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="">Any status</option>
                    <option value="has_upcoming">Has upcoming</option>
                    <option value="no_appointments">No appointments</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <select
                    value={listTagFilter}
                    onChange={(e) => setListTagFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="">Any tag</option>
                    {allTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                  <select
                    value={listSort}
                    onChange={(e) => setListSort(e.target.value as SortOption)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="recent">Recent</option>
                    <option value="name">Name A-Z</option>
                    <option value="appointments">Most appointments</option>
                  </select>
                </div>
              </div>

              {/* Bulk bar */}
              {selectedIds.size > 0 && (
                <div className="sticky top-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-md dark:border-blue-800 dark:bg-blue-950/60">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                    {selectedIds.size} selected
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={bulkSendWhatsApp}
                      disabled={bulkWorking}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                    >
                      {bulkWorking ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <MessageCircle className="h-3.5 w-3.5" />
                      )}
                      WhatsApp
                    </button>
                    <button
                      onClick={bulkAddTag}
                      disabled={bulkWorking}
                      className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <Tag className="h-3.5 w-3.5" /> Tag
                    </button>
                    <button
                      onClick={() => exportCustomersCSV(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <Download className="h-3.5 w-3.5" /> Export
                    </button>
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Customers list */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleSelectAll}
                      className="text-slate-500 transition hover:text-blue-600"
                    >
                      {selectedIds.size === filteredCustomers.length &&
                      filteredCustomers.length > 0 ? (
                        <CheckSquare className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>
                    <div>
                      <h2 className="font-semibold">Customers</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {filteredCustomers.length} found
                      </p>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <SkeletonList rows={5} />
                ) : filteredCustomers.length === 0 ? (
                  <EmptyState
                    icon={<Users className="h-10 w-10" />}
                    title="No customers"
                    description="Adjust filters or add a new customer."
                  />
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredCustomers.map((customer) => {
                      const cAppts = getCustomerAppointments(customer.id);
                      const cTags = tags[customer.id] || [];
                      const up = getUpcomingAppointment(customer.id);
                      return (
                        <div
                          key={customer.id}
                          className="p-5 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              <button
                                onClick={() => toggleSelected(customer.id)}
                                className="shrink-0 text-slate-400 transition hover:text-blue-600"
                              >
                                {selectedIds.has(customer.id) ? (
                                  <CheckSquare className="h-5 w-5 text-blue-600" />
                                ) : (
                                  <Square className="h-5 w-5" />
                                )}
                              </button>
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-semibold text-white shadow-sm">
                                {(customer.name || customer.phone || "?")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-semibold">
                                  {customer.name || "Unnamed"}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  {customer.phone}
                                </p>
                                {customer.email && (
                                  <p className="truncate text-xs text-slate-400">
                                    {customer.email}
                                  </p>
                                )}
                                {cTags.length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {cTags.slice(0, 3).map((tag) => (
                                      <span
                                        key={tag}
                                        className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                    {cTags.length > 3 && (
                                      <span className="text-[10px] text-slate-400">
                                        +{cTags.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {up && (
                                  <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    🟢 {up.appointment_date}{" "}
                                    {up.appointment_time}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {cAppts.length} appt
                                {cAppts.length === 1 ? "" : "s"}
                              </div>
                              {customer.phone && (
                                <>
                                  <a
                                    href={`tel:${customer.phone}`}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-600 transition hover:bg-emerald-50 dark:border-emerald-900 dark:bg-slate-800"
                                  >
                                    <Phone className="h-4 w-4" />
                                  </a>
                                  <a
                                    href={`https://wa.me/${customer.phone.replace(
                                      /[^0-9]/g,
                                      ""
                                    )}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-green-200 bg-white text-green-600 transition hover:bg-green-50 dark:border-green-900 dark:bg-slate-800"
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                  </a>
                                </>
                              )}
                              <button
                                onClick={() => setSelectedCustomer(customer)}
                                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {appointmentModal}
        {appointmentDetailsModal}
        {paymentModal}
        {prescriptionModal}

        {shortcutsOpen && (
          <ModalShell onClose={() => setShortcutsOpen(false)} size="sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Keyboard Shortcuts</h2>
              <IconBtn onClick={() => setShortcutsOpen(false)}>
                <XCircle className="h-5 w-5" />
              </IconBtn>
            </div>
            <div className="space-y-3 text-sm">
              {[
                { keys: ["/"], label: "Focus search" },
                { keys: ["N"], label: "New appointment" },
                { keys: ["Esc"], label: "Close / Back" },
                { keys: ["?"], label: "This dialog" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800"
                >
                  <span className="text-slate-600 dark:text-slate-300">
                    {item.label}
                  </span>
                  <div className="flex gap-1">
                    {item.keys.map((k) => (
                      <kbd
                        key={k}
                        className="rounded border border-slate-300 bg-slate-100 px-2 py-1 font-mono text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ModalShell>
        )}

        <ContactForm
          open={addCustomerOpen}
          onOpenChange={setAddCustomerOpen}
          onSaved={() => {
            setAddCustomerOpen(false);
            loadData();
            showToast("Customer added");
          }}
        />

        <ToastContainer toasts={toasts} />
        <ConfirmDialog
          state={confirmState}
          onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
        />
      </div>
    </div>
  );
}

// ==================== REUSABLE UI ====================

function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: "light" | "dark";
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}

function ModalShell({
  children,
  onClose,
  size = "md",
}: {
  children: React.ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg";
}) {
  const maxW =
    size === "sm" ? "max-w-md" : size === "lg" ? "max-w-2xl" : "max-w-lg";
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[90vh] w-full ${maxW} overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:text-white`}
      >
        {children}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  );
}

function InputBox({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
    />
  );
}

function SelectBox({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
    >
      {children}
    </select>
  );
}

function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-4 rounded-xl border border-slate-100 p-4 dark:border-slate-800"
        >
          <div className="h-11 w-11 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-full max-w-xs flex-col gap-2">
      {toasts.map((t) => {
        const bg =
          t.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200"
            : t.type === "error"
            ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/80 dark:text-red-200"
            : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/80 dark:text-blue-200";
        const icon =
          t.type === "success" ? (
            <Check className="h-4 w-4" />
          ) : t.type === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          );
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${bg}`}
          >
            {icon}
            <span className="flex-1">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

function ConfirmDialog({
  state,
  onCancel,
}: {
  state: ConfirmState;
  onCancel: () => void;
}) {
  if (!state.open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:text-white">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              state.destructive
                ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                : "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
            }`}
          >
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold">{state.title}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {state.message}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={state.onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
              state.destructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {state.confirmText || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== SUB COMPONENTS ====================

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-2 break-words text-sm font-medium">{value}</p>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  variant = "blue",
  prefix = "",
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  variant?: "blue" | "indigo" | "amber" | "red";
  prefix?: string;
}) {
  const variantClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    indigo:
      "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
    amber:
      "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    red: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-1 text-2xl font-bold">
            {prefix}
            {typeof value === "number" && !Number.isInteger(value)
              ? value.toFixed(1)
              : value}
          </p>
        </div>
        <div
          className={`rounded-lg p-2 ${
            variantClasses[variant] || variantClasses.blue
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const label =
    normalized === "confirmed"
      ? "Confirmed"
      : normalized === "pending"
      ? "Pending"
      : normalized === "cancelled" || normalized === "canceled"
      ? "Cancelled"
      : normalized === "completed"
      ? "Completed"
      : normalized === "no-show"
      ? "No-show"
      : status;
  const className =
    normalized === "confirmed"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
      : normalized === "pending"
      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
      : normalized === "cancelled" || normalized === "canceled"
      ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900"
      : normalized === "completed"
      ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
      : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";

  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${className}`}
    >
      {label}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-slate-300 dark:text-slate-600">{icon}</div>
      <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
        {title}
      </p>
      <p className="mt-1 max-w-xs text-xs text-slate-400">{description}</p>
    </div>
  );
}

function ActivityTimeline({
  customer,
  appointments,
  notes,
  messages,
  onSelectAppointment,
}: {
  customer: Customer;
  appointments: Appointment[];
  notes: Note[];
  messages: MessageItem[];
  onSelectAppointment: (a: Appointment) => void;
}) {
  type Item = {
    id: string;
    date: string;
    icon: React.ReactNode;
    color: string;
    title: string;
    subtitle?: string;
    onClick?: () => void;
  };

  const items: Item[] = [];
  items.push({
    id: `created-${customer.id}`,
    date: customer.created_at,
    icon: <User className="h-4 w-4" />,
    color: "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    title: "Customer created",
    subtitle: customer.name || customer.phone,
  });

  appointments.forEach((a) =>
    items.push({
      id: `appt-${a.id}`,
      date: `${a.appointment_date}T${a.appointment_time || "00:00"}:00`,
      icon: <CalendarDays className="h-4 w-4" />,
      color:
        a.status === "completed"
          ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
          : a.status === "cancelled"
          ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
          : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
      title: `Appointment ${a.status}`,
      subtitle: `${a.appointment_date} ${a.appointment_time}`,
      onClick: () => onSelectAppointment(a),
    })
  );

  notes.forEach((n) =>
    items.push({
      id: `note-${n.id}`,
      date: n.created_at,
      icon: <FileText className="h-4 w-4" />,
      color:
        "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
      title: "Note added",
      subtitle:
        n.note_text.length > 60
          ? `${n.note_text.slice(0, 60)}...`
          : n.note_text,
    })
  );

  messages.slice(0, 10).forEach((m) =>
    items.push({
      id: `msg-${m.id}`,
      date: m.created_at,
      icon: <MessageCircle className="h-4 w-4" />,
      color:
        "bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400",
      title: "WhatsApp message",
      subtitle:
        (m.content_text || "").length > 60
          ? `${(m.content_text || "").slice(0, 60)}...`
          : m.content_text || "(media)",
    })
  );

  items.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="h-10 w-10" />}
        title="No activity"
        description="Timeline will appear here."
      />
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-[19px] top-3 bottom-3 w-px bg-slate-200 dark:bg-slate-700" />
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="relative flex gap-4">
            <div
              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.color}`}
            >
              {item.icon}
            </div>
            <div
              className={`flex-1 rounded-xl border border-slate-100 bg-white p-3 transition dark:border-slate-800 dark:bg-slate-800 ${
                item.onClick
                  ? "cursor-pointer hover:border-blue-200 hover:shadow-sm"
                  : ""
              }`}
              onClick={item.onClick}
            >
              <p className="text-sm font-semibold">{item.title}</p>
              {item.subtitle && (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {item.subtitle}
                </p>
              )}
              <p className="mt-1 text-[10px] text-slate-400">
                {new Date(item.date).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppointmentsTab({
  appointments,
  customerName,
  getDoctorName,
  getServiceName,
  onSelect,
  onCancel,
  onReschedule,
}: {
  appointments: Appointment[];
  customerName: string;
  getDoctorName: (id?: string) => string;
  getServiceName: (id?: string) => string;
  onSelect: (a: Appointment) => void;
  onCancel: (id: string) => void;
  onReschedule: (id: string, date: string, time: string) => void;
}) {
  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-10 w-10" />}
        title="No appointments"
        description="Appointment history will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((a) => (
        <div
          key={a.id}
          className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 hover:shadow-sm dark:border-slate-700 dark:hover:border-blue-900"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button onClick={() => onSelect(a)} className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <span className="font-semibold">
                  {a.patient_name || customerName || "Patient"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {a.appointment_date}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {a.appointment_time}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Stethoscope className="mr-1 inline h-3 w-3" />
                  {getDoctorName(a.doctor_id)}
                </span>
                <span className="rounded-md bg-blue-50 px-2 py-1 font-medium text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                  {getServiceName(a.service_id)}
                </span>
                {a.amount ? (
                  <span className="rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    ₹{a.amount} · {a.payment_status || "pending"}
                  </span>
                ) : null}
              </div>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={a.status} />
              {(a.status === "pending" || a.status === "confirmed") && (
                <>
                  <button
                    onClick={() => {
                      const d = window.prompt("New date (YYYY-MM-DD):");
                      if (!d) return;
                      const t = window.prompt("New time (HH:MM):");
                      if (!t) return;
                      onReschedule(a.id, d, t);
                    }}
                    className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:border-blue-900 dark:bg-slate-800"
                  >
                    Reschedule
                  </button>
                  <button
                    onClick={() => onCancel(a.id)}
                    className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:bg-slate-800"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PrescriptionsTab({
  prescriptions,
  loading,
  onPrint,
  onCreate,
}: {
  prescriptions: Prescription[];
  loading: boolean;
  onPrint: (p: Prescription) => void;
  onCreate: () => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {prescriptions.length} prescription
          {prescriptions.length === 1 ? "" : "s"}
        </p>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" /> New Prescription
        </button>
      </div>

      {loading ? (
        <SkeletonList />
      ) : prescriptions.length === 0 ? (
        <EmptyState
          icon={<Pill className="h-10 w-10" />}
          title="No prescriptions"
          description="Create a prescription for this customer."
        />
      ) : (
        <div className="space-y-3">
          {prescriptions.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold">
                      {p.diagnosis || "Diagnosis"}
                    </span>
                  </div>
                  {p.medicines && (
                    <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {p.medicines}
                    </pre>
                  )}
                  {p.notes && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Note: {p.notes}
                    </p>
                  )}
                  <p className="mt-2 text-[10px] text-slate-400">
                    {new Date(p.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => onPrint(p)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Printer className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MedicalTab({
  medical,
  loading,
  editing,
  form,
  setForm,
  onEdit,
  onCancel,
  onSave,
  saving,
}: {
  medical: MedicalInfo;
  loading: boolean;
  editing: boolean;
  form: MedicalInfo;
  setForm: (m: MedicalInfo) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  if (loading) return <SkeletonList />;

  const hasData =
    medical.allergies?.length ||
    medical.chronic_conditions?.length ||
    medical.blood_group ||
    medical.emergency_contact;

  if (!editing && !hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Heart className="h-10 w-10 text-slate-300 dark:text-slate-600" />
        <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
          No medical info
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Add allergies and chronic conditions for safety.
        </p>
        <button
          onClick={onEdit}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Add Medical Info
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Allergies (comma separated)
          </label>
          <InputBox
            value={(form.allergies || []).join(", ")}
            onChange={(v) =>
              setForm({
                ...form,
                allergies: v
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Penicillin, Peanuts"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Chronic Conditions (comma separated)
          </label>
          <InputBox
            value={(form.chronic_conditions || []).join(", ")}
            onChange={(v) =>
              setForm({
                ...form,
                chronic_conditions: v
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Diabetes, Hypertension"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Blood Group
            </label>
            <SelectBox
              value={form.blood_group || ""}
              onChange={(v) => setForm({ ...form, blood_group: v })}
            >
              <option value="">Select</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </SelectBox>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Emergency Contact
            </label>
            <InputBox
              value={form.emergency_contact || ""}
              onChange={(v) => setForm({ ...form, emergency_contact: v })}
              placeholder="+91..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" /> Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Medical information
        </p>
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700"
        >
          <Edit3 className="h-4 w-4" /> Edit
        </button>
      </div>

      {medical.allergies?.length ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
          <p className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4" /> Allergies
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {medical.allergies.map((a) => (
              <span
                key={a}
                className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/50 dark:text-red-200"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {medical.chronic_conditions?.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-300">
            <Heart className="h-4 w-4" /> Chronic Conditions
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {medical.chronic_conditions.map((c) => (
              <span
                key={c}
                className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/50 dark:text-amber-200"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard
          icon={<Heart className="h-4 w-4" />}
          label="Blood Group"
          value={medical.blood_group || "—"}
        />
        <InfoCard
          icon={<Phone className="h-4 w-4" />}
          label="Emergency Contact"
          value={medical.emergency_contact || "—"}
        />
      </div>
    </div>
  );
}

function AnalyticsView({
  analytics,
  exportAppointments,
}: {
  analytics: {
    totalRevenue: number;
    pendingRevenue: number;
    noShowRate: number;
    completionRate: number;
    topDoctors: { id: string; name: string; count: number }[];
    weeklyTrend: { date: string; count: number }[];
    maxWeekly: number;
    peakHours: { hour: string; count: number }[];
    totalAppointments: number;
    totalCustomers: number;
  };
  exportAppointments: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Analytics Dashboard</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Business insights and performance metrics
          </p>
        </div>
        <button
          onClick={exportAppointments}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800"
        >
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenue"
          value={analytics.totalRevenue}
          icon={<IndianRupee className="h-5 w-5" />}
          variant="amber"
          prefix="₹"
        />
        <StatCard
          title="Pending"
          value={analytics.pendingRevenue}
          icon={<Clock className="h-5 w-5" />}
          variant="blue"
          prefix="₹"
        />
        <StatCard
          title="No-show Rate"
          value={analytics.noShowRate}
          icon={<XCircle className="h-5 w-5" />}
          variant="red"
        />
        <StatCard
          title="Completion"
          value={analytics.completionRate}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="indigo"
        />
      </div>

      {/* Weekly trend */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Last 7 days
        </h3>
        <div className="mt-5 flex h-40 items-end gap-2">
          {analytics.weeklyTrend.map((w, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {w.count}
              </div>
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400 transition-all"
                style={{
                  height: `${
                    (w.count / analytics.maxWeekly) * 100 || 2
                  }%`,
                  minHeight: "4px",
                }}
              />
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {w.date}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Top doctors */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Top Doctors
          </h3>
          {analytics.topDoctors.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">No data yet</p>
          ) : (
            <div className="mt-4 space-y-3">
              {analytics.topDoctors.map((d, i) => (
                <div key={d.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{d.name}</p>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-1.5 rounded-full bg-blue-600"
                        style={{
                          width: `${
                            (d.count /
                              (analytics.topDoctors[0]?.count || 1)) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {d.count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Peak hours */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Peak Hours
          </h3>
          {analytics.peakHours.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">No data yet</p>
          ) : (
            <div className="mt-4 space-y-3">
              {analytics.peakHours.map((h) => {
                const max = analytics.peakHours[0]?.count || 1;
                return (
                  <div key={h.hour} className="flex items-center gap-3">
                    <div className="w-14 text-sm font-semibold">{h.hour}</div>
                    <div className="flex-1">
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: `${(h.count / max) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {h.count}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CalendarView(props: any) {
  const {
    calendarDate,
    calendarView,
    setCalendarView,
    changeCalendarDate,
    setCalendarDate,
    calendarMonthLabel,
    calendarMonthDays,
    calendarWeekDays,
    appointmentsForDate,
    isCalendarToday,
    formatCalendarDate,
    getAppointmentStatusClass,
    getAppointmentStatusLabel,
    getDoctorName,
    getServiceName,
    setSelectedAppointment,
    appointmentSearch,
    setAppointmentSearch,
    doctors,
    calendarDoctorFilter,
    setCalendarDoctorFilter,
    calendarStatusFilter,
    setCalendarStatusFilter,
    appointments,
  } = props;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/40 p-5 md:p-6 dark:border-slate-800 dark:from-slate-800 dark:to-slate-800">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Calendar</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                View and manage appointments
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCalendarDate(new Date())}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800"
            >
              Today
            </button>
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
              <button
                onClick={() => changeCalendarDate(-1)}
                className="rounded-md p-1.5 text-slate-600 dark:text-slate-300"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => changeCalendarDate(1)}
                className="rounded-md p-1.5 text-slate-600 dark:text-slate-300"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
              {(["day", "week", "month"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setCalendarView(v)}
                  className={`rounded-md px-3 py-2 text-sm font-semibold capitalize ${
                    calendarView === v
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mt-5">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={appointmentSearch}
            onChange={(e) => setAppointmentSearch(e.target.value)}
            placeholder="Search appointments..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            {
              label: "Today",
              value: appointments.filter(
                (a: Appointment) =>
                  a.appointment_date === formatCalendarDate(new Date())
              ).length,
              className:
                "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
            },
            {
              label: "Pending",
              value: appointments.filter(
                (a: Appointment) => a.status.toLowerCase() === "pending"
              ).length,
              className:
                "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
            },
            {
              label: "Confirmed",
              value: appointments.filter(
                (a: Appointment) => a.status.toLowerCase() === "confirmed"
              ).length,
              className:
                "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
            },
            {
              label: "Completed",
              value: appointments.filter(
                (a: Appointment) => a.status.toLowerCase() === "completed"
              ).length,
              className:
                "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300",
            },
            {
              label: "Cancelled / No-show",
              value: appointments.filter((a: Appointment) =>
                ["cancelled", "canceled", "no-show"].includes(
                  a.status.toLowerCase()
                )
              ).length,
              className:
                "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-xl border px-4 py-3 ${s.className}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide">
                {s.label}
              </p>
              <p className="mt-1 text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-2 dark:border-slate-800">
          <select
            value={calendarDoctorFilter}
            onChange={(e) => setCalendarDoctorFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All Doctors</option>
            {doctors.map((d: Doctor) => (
              <option key={d.id} value={d.id}>
                {d.doctor_name}
              </option>
            ))}
          </select>
          <select
            value={calendarStatusFilter}
            onChange={(e) => setCalendarStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="no-show">No-show</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
          <h3 className="text-lg font-bold">
            {calendarView === "month"
              ? calendarMonthLabel
              : calendarView === "week"
              ? `${calendarWeekDays[0].toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })} - ${calendarWeekDays[6].toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}`
              : calendarDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
          </h3>
        </div>
      </div>

      {calendarView === "month" && (
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  className="border-r border-slate-200 px-3 py-3 text-center text-xs font-bold uppercase text-slate-500 last:border-r-0 dark:border-slate-800 dark:text-slate-400"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarMonthDays.map((date: Date) => {
                const appts = appointmentsForDate(date);
                const isCurrentMonth =
                  date.getMonth() === calendarDate.getMonth();
                return (
                  <div
                    key={formatCalendarDate(date)}
                    className={`min-h-[155px] border-b border-r border-slate-200 p-2 dark:border-slate-800 ${
                      !isCurrentMonth
                        ? "bg-slate-50/60 dark:bg-slate-800/40"
                        : "bg-white dark:bg-slate-900"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                          isCalendarToday(date)
                            ? "bg-blue-600 text-white"
                            : isCurrentMonth
                            ? "text-slate-700 dark:text-slate-200"
                            : "text-slate-400"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      {appts.length > 0 && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {appts.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {appts.slice(0, 4).map((a: Appointment) => (
                        <button
                          key={a.id}
                          onClick={() => setSelectedAppointment(a)}
                          className={`w-full rounded-lg border p-2 text-left transition hover:shadow-sm ${getAppointmentStatusClass(
                            a.status
                          )}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold">
                              {a.appointment_time}
                            </span>
                            <span className="truncate text-[9px] font-semibold uppercase">
                              {getAppointmentStatusLabel(a.status)}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs font-bold">
                            {a.patient_name || "Patient"}
                          </p>
                          <p className="truncate text-[10px] opacity-80">
                            {getDoctorName(a.doctor_id)}
                          </p>
                        </button>
                      ))}
                      {appts.length > 4 && (
                        <p className="w-full rounded-md px-2 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                          +{appts.length - 4} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {calendarView === "week" && (
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
              {calendarWeekDays.map((date: Date) => (
                <div
                  key={formatCalendarDate(date)}
                  className={`border-r border-slate-200 p-4 text-center last:border-r-0 dark:border-slate-800 ${
                    isCalendarToday(date)
                      ? "bg-blue-50 dark:bg-blue-950/40"
                      : ""
                  }`}
                >
                  <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                  <p
                    className={`mt-1 text-xl font-bold ${
                      isCalendarToday(date)
                        ? "text-blue-600"
                        : "text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {date.getDate()}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarWeekDays.map((date: Date) => {
                const appts = appointmentsForDate(date);
                return (
                  <div
                    key={formatCalendarDate(date)}
                    className="min-h-[420px] border-r border-slate-200 p-3 last:border-r-0 dark:border-slate-800"
                  >
                    <div className="space-y-2">
                      {appts.length === 0 ? (
                        <p className="py-10 text-center text-xs text-slate-400">
                          No appointments
                        </p>
                      ) : (
                        appts.map((a: Appointment) => (
                          <button
                            key={a.id}
                            onClick={() => setSelectedAppointment(a)}
                            className={`w-full rounded-xl border p-3 text-left transition hover:shadow-sm ${getAppointmentStatusClass(
                              a.status
                            )}`}
                          >
                            <p className="text-sm font-bold">
                              {a.appointment_time}
                            </p>
                            <p className="mt-1 truncate text-sm font-semibold">
                              {a.patient_name || "Patient"}
                            </p>
                            <p className="mt-1 truncate text-xs">
                              {getDoctorName(a.doctor_id)}
                            </p>
                            <p className="mt-1 truncate text-[11px] opacity-75">
                              {getServiceName(a.service_id)}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {calendarView === "day" && (
        <div className="p-5 md:p-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-800">
              <p className="font-semibold">
                {calendarDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {appointmentsForDate(calendarDate).length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-500">
                  No appointments scheduled.
                </div>
              ) : (
                appointmentsForDate(calendarDate).map((a: Appointment) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAppointment(a)}
                    className="flex w-full flex-col gap-4 p-5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800 md:flex-row md:items-center"
                  >
                    <div className="w-24 shrink-0">
                      <p className="text-lg font-bold">
                        {a.appointment_time}
                      </p>
                    </div>
                    <div
                      className={`flex-1 rounded-xl border p-4 ${getAppointmentStatusClass(
                        a.status
                      )}`}
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-bold">
                            {a.patient_name || "Patient"}
                          </p>
                          <p className="mt-1 text-sm">
                            {getDoctorName(a.doctor_id)} •{" "}
                            {getServiceName(a.service_id)}
                          </p>
                        </div>
                        <span className="w-fit rounded-full border bg-white/70 px-3 py-1 text-xs font-bold dark:bg-white/10">
                          {getAppointmentStatusLabel(a.status)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
