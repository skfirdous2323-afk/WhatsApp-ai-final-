"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Plus,
  Edit3,
  Copy,
  Trash2,
  Download,
  Loader2,
  Check,
  X,
  AlertCircle,
  Star,
  Clock,
  IndianRupee,
  Image as ImageIcon,
  MessageCircle,
  FileText,
  Stethoscope,
  Upload,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Sparkles,
  TrendingUp,
  Package,
  Filter,
  Info,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";

// ==================== TYPES ====================

interface Doctor {
  id: string;
  name: string;
  specialization: string;
}

interface Service {
  id?: string;
  service_name: string;
  description: string;
  price: string;
  duration_minutes: string;
  category: string;
  assigned_doctors: string[];
  image_url: string | null;
  image_file?: File | null;
  is_featured: boolean;
  whatsapp_reply: string;
  preparation_instructions: string;
  is_active: boolean;
  created_at?: string;
}

type Toast = {
  id: string;
  type: "success" | "error" | "info";
  message: string;
};

// ==================== CONSTANTS ====================

const DURATION_OPTIONS = ["15", "30", "45", "60", "90", "120"];

const CATEGORY_OPTIONS = [
  { value: "Consultation", emoji: "🩺" },
  { value: "Treatment", emoji: "💊" },
  { value: "Surgery", emoji: "🏥" },
  { value: "Diagnostic", emoji: "🔬" },
  { value: "Follow-up", emoji: "📋" },
  { value: "Emergency", emoji: "🚑" },
  { value: "Cosmetic", emoji: "✨" },
  { value: "Preventive", emoji: "🛡️" },
  { value: "Other", emoji: "📌" },
];

const getCategoryEmoji = (category: string) => {
  const cat = CATEGORY_OPTIONS.find((c) => c.value === category);
  return cat?.emoji || "📌";
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    Consultation: "bg-blue-50 text-blue-700 border-blue-200",
    Treatment: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Surgery: "bg-red-50 text-red-700 border-red-200",
    Diagnostic: "bg-purple-50 text-purple-700 border-purple-200",
    "Follow-up": "bg-amber-50 text-amber-700 border-amber-200",
    Emergency: "bg-rose-50 text-rose-700 border-rose-200",
    Cosmetic: "bg-pink-50 text-pink-700 border-pink-200",
    Preventive: "bg-cyan-50 text-cyan-700 border-cyan-200",
    Other: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return colors[category] || colors.Other;
};

// ==================== MAIN COMPONENT ====================

export default function ServicesPage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [showForm, setShowForm] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    service_name: "",
    description: "",
    price: "",
    duration_minutes: "30",
    category: "",
    assigned_doctors: [] as string[],
    image_url: null as string | null,
    image_file: null as File | null,
    is_featured: false,
    whatsapp_reply: "",
    preparation_instructions: "",
    is_active: true,
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // ==================== TOAST ====================

  const showToast = (type: Toast["type"], message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // ==================== LOAD ====================

  useEffect(() => {
    loadServices();
    loadDoctors();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [services, searchTerm, categoryFilter, statusFilter]);

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

  const loadServices = async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        showToast("error", "Please login first");
        return;
      }

      const clinicId = await getClinicId(user.id);

      let enabled = true;
      try {
        const { data: clinic } = await supabase
          .from("clinics")
          .select("services_enabled")
          .eq("id", clinicId)
          .maybeSingle();

        if (clinic) enabled = clinic.services_enabled !== false;
      } catch {
        enabled = true;
      }

      if (!enabled) {
        setIsEnabled(false);
        setServices([]);
        setIsLoading(false);
        return;
      }

      setIsEnabled(true);

      const { data, error } = await supabase
        .from("clinic_services")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mappedServices: Service[] =
        data?.map((item: any) => ({
          id: item.id,
          service_name: item.service_name,
          description: item.description || "",
          price: item.price || "",
          duration_minutes: item.duration_minutes?.toString() || "30",
          category: item.category || "",
          assigned_doctors: item.assigned_doctors || [],
          image_url: item.image_url || null,
          is_featured: item.is_featured || false,
          whatsapp_reply: item.whatsapp_reply || "",
          preparation_instructions: item.preparation_instructions || "",
          is_active: item.is_active !== undefined ? item.is_active : true,
          created_at: item.created_at,
        })) || [];

      setServices(mappedServices);
    } catch (error: any) {
      console.error("Error loading services:", error);
      showToast("error", `Failed to load: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDoctors = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) return;

      const clinicId = await getClinicId(user.id);

      const { data, error } = await supabase
        .from("clinic_doctors")
        .select("id, doctor_name, specialization")
        .eq("clinic_id", clinicId)
        .order("doctor_name");

      if (error) throw error;

      setDoctors(
        data?.map((doc: any) => ({
          id: doc.id,
          name: doc.doctor_name,
          specialization: doc.specialization,
        })) || []
      );
    } catch (error) {
      console.error("Error loading doctors:", error);
    }
  };

  // ==================== TOGGLE ====================

  const handleToggleServices = async () => {
    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const clinicId = await getClinicId(user.id);
      const newStatus = !isEnabled;

      const { error } = await supabase
        .from("clinics")
        .update({ services_enabled: newStatus })
        .eq("id", clinicId);

      if (error) throw error;

      setIsEnabled(newStatus);
      showToast(
        "success",
        `Services ${newStatus ? "enabled" : "disabled"}`
      );

      if (newStatus) await loadServices();
      else setServices([]);
    } catch (error) {
      showToast("error", "Failed to update services");
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== ANALYTICS ====================

  const analytics = useMemo(() => {
    const activeServices = services.filter((s) => s.is_active);
    const featuredServices = services.filter((s) => s.is_featured);
    const prices = services
      .map((s) => parseFloat(s.price) || 0)
      .filter((p) => p > 0);
    const avgPrice =
      prices.length > 0
        ? prices.reduce((a, b) => a + b, 0) / prices.length
        : 0;

    const categories = new Set(services.map((s) => s.category).filter(Boolean));

    return {
      total: services.length,
      active: activeServices.length,
      featured: featuredServices.length,
      avgPrice,
      categories: categories.size,
    };
  }, [services]);

  // ==================== FILTERS ====================

  const applyFilters = () => {
    let filtered = [...services];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.service_name.toLowerCase().includes(term) ||
          s.description?.toLowerCase().includes(term)
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter((s) => s.category === categoryFilter);
    }

    if (statusFilter === "active") {
      filtered = filtered.filter((s) => s.is_active);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter((s) => !s.is_active);
    } else if (statusFilter === "featured") {
      filtered = filtered.filter((s) => s.is_featured);
    }

    setFilteredServices(filtered);
  };

  // ==================== FORM ====================

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleDoctorSelect = (doctorId: string) => {
    setFormData((prev) => {
      const current = prev.assigned_doctors || [];
      return {
        ...prev,
        assigned_doctors: current.includes(doctorId)
          ? current.filter((id) => id !== doctorId)
          : [...current, doctorId],
      };
    });
  };

  const handleImageUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      showToast("error", "Image must be less than 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      showToast("error", "Please select an image file");
      return;
    }

    setUploadingImage(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const clinicId = await getClinicId(user.id);

      const fileExt = file.name.split(".").pop();
      const fileName = `${clinicId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("service-images")
        .upload(fileName, file, { upsert: false });

      if (uploadError) {
        // If bucket doesn't exist, show clear message
        if (uploadError.message?.includes("not found")) {
          showToast(
            "error",
            "Storage bucket 'service-images' not found. Create it in Supabase Storage."
          );
          return;
        }
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from("service-images")
        .getPublicUrl(fileName);

      setFormData((prev) => ({ ...prev, image_url: urlData.publicUrl }));
      setImagePreview(urlData.publicUrl);
      showToast("success", "Image uploaded");
    } catch (error: any) {
      console.error("Image upload error:", error);
      showToast("error", `Upload failed: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const removeImage = () => {
    setFormData((prev) => ({ ...prev, image_url: null }));
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ==================== SUBMIT ====================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEnabled) {
      showToast("error", "Enable services first");
      return;
    }
    if (!formData.service_name.trim()) {
      showToast("error", "Service name is required");
      return;
    }
    if (!formData.price.trim()) {
      showToast("error", "Price is required");
      return;
    }

    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        showToast("error", "Please login");
        return;
      }

      const clinicId = await getClinicId(user.id);

      const serviceData = {
        clinic_id: clinicId,
        user_id: user.id,
        service_name: formData.service_name.trim(),
        description: formData.description.trim(),
        price: formData.price,
        duration_minutes: parseInt(formData.duration_minutes) || 30,
        category: formData.category,
        assigned_doctors: formData.assigned_doctors || [],
        image_url: formData.image_url,
        is_featured: formData.is_featured,
        whatsapp_reply: formData.whatsapp_reply.trim(),
        preparation_instructions: formData.preparation_instructions.trim(),
        is_active: formData.is_active,
      };

      let error;
      if (editingId) {
        const { error: updateError } = await supabase
          .from("clinic_services")
          .update(serviceData)
          .eq("id", editingId)
          .eq("clinic_id", clinicId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("clinic_services")
          .insert([serviceData]);
        error = insertError;
      }

      if (error) throw error;

      showToast(
        "success",
        editingId ? "Service updated successfully" : "Service added successfully"
      );
      resetForm();
      await loadServices();
    } catch (error: any) {
      console.error("Save error:", error);
      showToast(
        "error",
        `Failed to save: ${error.message}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (service: Service) => {
    setFormData({
      service_name: service.service_name,
      description: service.description || "",
      price: service.price || "",
      duration_minutes: service.duration_minutes?.toString() || "30",
      category: service.category || "",
      assigned_doctors: service.assigned_doctors || [],
      image_url: service.image_url,
      image_file: null,
      is_featured: service.is_featured || false,
      whatsapp_reply: service.whatsapp_reply || "",
      preparation_instructions: service.preparation_instructions || "",
      is_active: service.is_active,
    });
    setImagePreview(service.image_url);
    setEditingId(service.id || null);
    setShowForm(true);
    document
      .getElementById("service-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDelete = async (id: string) => {
    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const clinicId = await getClinicId(user.id);

      const { error } = await supabase
        .from("clinic_services")
        .delete()
        .eq("id", id)
        .eq("clinic_id", clinicId);

      if (error) throw error;

      showToast("success", "Service deleted");
      setDeleteConfirmId(null);
      await loadServices();
    } catch (error: any) {
      showToast("error", `Delete failed: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = async (service: Service) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const clinicId = await getClinicId(user.id);

      const { error } = await supabase.from("clinic_services").insert([
        {
          clinic_id: clinicId,
          user_id: user.id,
          service_name: `${service.service_name} (Copy)`,
          description: service.description || "",
          price: service.price || "",
          duration_minutes: parseInt(service.duration_minutes) || 30,
          category: service.category || "",
          assigned_doctors: service.assigned_doctors || [],
          image_url: service.image_url,
          is_featured: false,
          whatsapp_reply: service.whatsapp_reply || "",
          preparation_instructions: service.preparation_instructions || "",
          is_active: service.is_active,
        },
      ]);

      if (error) throw error;

      showToast("success", "Service duplicated");
      await loadServices();
    } catch (error: any) {
      showToast("error", `Duplicate failed: ${error.message}`);
    }
  };

  const exportCSV = () => {
    const headers = [
      "Name",
      "Price",
      "Duration",
      "Category",
      "Status",
      "Featured",
      "Doctors",
      "Description",
    ];
    const rows = filteredServices.map((s) => [
      s.service_name,
      s.price,
      s.duration_minutes,
      s.category,
      s.is_active ? "Active" : "Inactive",
      s.is_featured ? "Yes" : "No",
      s.assigned_doctors
        .map((id) => doctors.find((d) => d.id === id)?.name || "")
        .join(" | "),
      s.description || "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `services-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("success", "CSV exported");
  };

  const resetForm = () => {
    setFormData({
      service_name: "",
      description: "",
      price: "",
      duration_minutes: "30",
      category: "",
      assigned_doctors: [],
      image_url: null,
      image_file: null,
      is_featured: false,
      whatsapp_reply: "",
      preparation_instructions: "",
      is_active: true,
    });
    setImagePreview(null);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-slate-50/70">
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
        {/* ============ HEADER ============ */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <Sparkles className="h-3 w-3" />
                Step 3 of 6
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Services Management
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Manage your clinic services and treatment options
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle */}
            <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <span className="text-xs font-semibold text-slate-600">
                Services
              </span>
              <button
                onClick={handleToggleServices}
                disabled={isSaving}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  isEnabled ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                    isEnabled ? "translate-x-[18px]" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span
                className={`text-xs font-bold ${
                  isEnabled ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {isEnabled ? "ON" : "OFF"}
              </span>
            </div>

            <button
              onClick={exportCSV}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </header>

        {/* ============ DISABLED ============ */}
        {!isEnabled ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
              <EyeOff className="h-9 w-9 text-slate-400" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              Services Section Disabled
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Enable the toggle above to start adding services
            </p>
          </div>
        ) : (
          <>
            {/* ============ ANALYTICS ============ */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatCard
                label="Total Services"
                value={analytics.total}
                icon={<Package className="h-5 w-5" />}
                tone="blue"
              />
              <StatCard
                label="Active"
                value={analytics.active}
                icon={<Check className="h-5 w-5" />}
                tone="emerald"
              />
              <StatCard
                label="Featured"
                value={analytics.featured}
                icon={<Star className="h-5 w-5" />}
                tone="amber"
              />
              <StatCard
                label="Categories"
                value={analytics.categories}
                icon={<Filter className="h-5 w-5" />}
                tone="purple"
              />
              <StatCard
                label="Avg Price"
                value={`₹${analytics.avgPrice.toFixed(0)}`}
                icon={<IndianRupee className="h-5 w-5" />}
                tone="pink"
              />
            </div>

            {/* ============ FILTERS ============ */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search services..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.emoji} {c.value}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="featured">Featured</option>
                </select>
                <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    onClick={() => setViewMode("card")}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      viewMode === "card"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" /> Cards
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      viewMode === "table"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <List className="h-3.5 w-3.5" /> Table
                  </button>
                </div>
              </div>
            </div>

            {/* ============ MAIN GRID ============ */}
            <div className="grid gap-6 lg:grid-cols-5">
              {/* ============ FORM ============ */}
              <div className="lg:col-span-2">
                <div
                  id="service-form"
                  className="sticky top-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                        {editingId ? (
                          <Edit3 className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">
                          {editingId ? "Edit Service" : "New Service"}
                        </h2>
                        <p className="text-[11px] text-slate-500">
                          {editingId
                            ? "Update details"
                            : "Fill service information"}
                        </p>
                      </div>
                    </div>
                    {editingId && (
                      <button
                        onClick={resetForm}
                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSubmit} className="max-h-[calc(100vh-200px)] space-y-4 overflow-y-auto p-5">
                    {/* Image upload */}
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-700">
                        Service Image
                      </label>
                      <div className="flex items-center gap-3">
                        {imagePreview || formData.image_url ? (
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 border-slate-200">
                            <img
                              src={imagePreview || formData.image_url || ""}
                              alt="Service"
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={removeImage}
                              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition hover:bg-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingImage}
                            className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-500 disabled:opacity-50"
                          >
                            {uploadingImage ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <ImageIcon className="h-5 w-5" />
                            )}
                          </button>
                        )}
                        <div className="flex-1">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingImage}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                          >
                            <Upload className="h-3 w-3" />
                            {uploadingImage
                              ? "Uploading..."
                              : formData.image_url
                              ? "Change"
                              : "Upload"}
                          </button>
                          <p className="mt-1 text-[10px] text-slate-500">
                            JPG, PNG · Max 5MB
                          </p>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {/* Name */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Service Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="service_name"
                        value={formData.service_name}
                        onChange={handleInputChange}
                        placeholder="e.g. General Consultation"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    {/* Price + Duration */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                          Price (₹) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="price"
                          value={formData.price}
                          onChange={handleInputChange}
                          placeholder="500"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                          Duration
                        </label>
                        <select
                          name="duration_minutes"
                          value={formData.duration_minutes}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          {DURATION_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt} min
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Category
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">Select category</option>
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.emoji} {c.value}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Description
                      </label>
                      <textarea
                        name="description"
                        rows={3}
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Brief description of this service..."
                        className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    {/* Doctors */}
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-700">
                        <Stethoscope className="mr-1 inline h-3 w-3" />
                        Assigned Doctors
                      </label>
                      {doctors.length === 0 ? (
                        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                          No doctors yet. Add doctors first.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {doctors.map((doctor) => {
                            const selected = formData.assigned_doctors.includes(
                              doctor.id
                            );
                            return (
                              <button
                                key={doctor.id}
                                type="button"
                                onClick={() => handleDoctorSelect(doctor.id)}
                                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                  selected
                                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                                }`}
                              >
                                {selected && (
                                  <Check className="mr-1 inline h-3 w-3" />
                                )}
                                {doctor.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* WhatsApp Reply */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        <MessageCircle className="mr-1 inline h-3 w-3" />
                        WhatsApp Auto-Reply
                      </label>
                      <textarea
                        name="whatsapp_reply"
                        rows={2}
                        value={formData.whatsapp_reply}
                        onChange={handleInputChange}
                        placeholder="Message sent to patients when they select this service..."
                        className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>

                    {/* Preparation */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        <FileText className="mr-1 inline h-3 w-3" />
                        Preparation Instructions
                      </label>
                      <textarea
                        name="preparation_instructions"
                        rows={2}
                        value={formData.preparation_instructions}
                        onChange={handleInputChange}
                        placeholder="e.g. Come empty stomach, bring reports..."
                        className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    {/* Toggles */}
                    <div className="flex flex-wrap gap-3">
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                        <input
                          type="checkbox"
                          name="is_featured"
                          checked={formData.is_featured}
                          onChange={handleInputChange}
                          className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                        />
                        <Star className="h-3.5 w-3.5 text-amber-500" />
                        Featured
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                        <input
                          type="checkbox"
                          name="is_active"
                          checked={formData.is_active}
                          onChange={handleInputChange}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                        />
                        <Eye className="h-3.5 w-3.5 text-emerald-500" />
                        Active
                      </label>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-2 border-t border-slate-100 pt-4">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            {editingId ? "Update" : "Save Service"}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* ============ LIST ============ */}
              <div className="lg:col-span-3">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">
                          All Services
                        </h2>
                        <p className="text-[11px] text-slate-500">
                          {filteredServices.length} of {services.length} shown
                        </p>
                      </div>
                    </div>
                  </div>

                  {isLoading ? (
                    <SkeletonList />
                  ) : filteredServices.length === 0 ? (
                    <EmptyState
                      hasServices={services.length > 0}
                      onReset={() => {
                        setSearchTerm("");
                        setCategoryFilter("");
                        setStatusFilter("all");
                      }}
                    />
                  ) : viewMode === "card" ? (
                    <CardView
                      services={filteredServices}
                      doctors={doctors}
                      onEdit={handleEdit}
                      onDuplicate={handleDuplicate}
                      onDelete={(id) => setDeleteConfirmId(id)}
                    />
                  ) : (
                    <TableView
                      services={filteredServices}
                      doctors={doctors}
                      onEdit={handleEdit}
                      onDelete={(id) => setDeleteConfirmId(id)}
                    />
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============ NAVIGATION ============ */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">
              Step 3 of 6
            </span>
            <div className="flex gap-1">
              <div className="h-1.5 w-6 rounded-full bg-blue-600"></div>
              <div className="h-1.5 w-6 rounded-full bg-blue-600"></div>
              <div className="h-1.5 w-6 rounded-full bg-blue-600"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-slate-200"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-slate-200"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-slate-200"></div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/whatsapp-bot/doctors"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Doctors
            </Link>
            <Link
              href="/whatsapp-bot/faq"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              FAQ
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ============ DELETE CONFIRM ============ */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Delete service?
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  This action cannot be undone. The service will be permanently
                  removed.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ TOASTS ============ */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}

// ==================== SUB COMPONENTS ====================

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "amber" | "purple" | "pink";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    pink: "bg-pink-50 text-pink-600",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-1.5 truncate text-xl font-bold text-slate-900">
            {value}
          </p>
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function CardView({
  services,
  doctors,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  services: Service[];
  doctors: Doctor[];
  onEdit: (s: Service) => void;
  onDuplicate: (s: Service) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2">
      {services.map((service) => {
        const assignedNames = service.assigned_doctors
          .map((id) => doctors.find((d) => d.id === id)?.name)
          .filter(Boolean);

        return (
          <div
            key={service.id}
            className={`group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md ${
              !service.is_active ? "opacity-60" : ""
            }`}
          >
            {/* Featured badge */}
            {service.is_featured && (
              <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Star className="h-3.5 w-3.5 fill-current" />
              </div>
            )}

            <div className="flex gap-3">
              {/* Image */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                {service.image_url ? (
                  <img
                    src={service.image_url}
                    alt={service.service_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">
                    {getCategoryEmoji(service.category)}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-slate-900">
                  {service.service_name}
                </h3>

                {/* Category */}
                {service.category && (
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getCategoryColor(
                      service.category
                    )}`}
                  >
                    {service.category}
                  </span>
                )}

                {/* Price + duration */}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                    <IndianRupee className="h-3 w-3" />
                    {service.price}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Clock className="h-3 w-3" />
                    {service.duration_minutes}m
                  </span>
                </div>

                {/* Assigned doctors */}
                {assignedNames.length > 0 && (
                  <p className="mt-1.5 truncate text-[10px] text-slate-500">
                    <Stethoscope className="mr-1 inline h-2.5 w-2.5" />
                    {assignedNames.slice(0, 2).join(", ")}
                    {assignedNames.length > 2 &&
                      ` +${assignedNames.length - 2}`}
                  </p>
                )}
              </div>
            </div>

            {service.description && (
              <p className="mt-3 line-clamp-2 text-xs text-slate-500">
                {service.description}
              </p>
            )}

            {/* Actions */}
            <div className="mt-3 flex items-center justify-end gap-1 border-t border-slate-100 pt-3">
              <button
                onClick={() => onEdit(service)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                title="Edit"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDuplicate(service)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-purple-50 hover:text-purple-600"
                title="Duplicate"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete(service.id!)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {!service.is_active && (
              <span className="absolute left-3 top-3 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                Inactive
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TableView({
  services,
  doctors,
  onEdit,
  onDelete,
}: {
  services: Service[];
  doctors: Doctor[];
  onEdit: (s: Service) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-slate-100 bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Service
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Category
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Price
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Duration
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Doctors
            </th>
            <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {services.map((service) => (
            <tr
              key={service.id}
              className="transition hover:bg-slate-50"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {getCategoryEmoji(service.category)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {service.service_name}
                    </p>
                    {service.is_featured && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                        <Star className="h-2.5 w-2.5 fill-current" /> Featured
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                {service.category ? (
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getCategoryColor(
                      service.category
                    )}`}
                  >
                    {service.category}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm font-bold text-emerald-600">
                ₹{service.price}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {service.duration_minutes}m
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">
                {service.assigned_doctors.length || "—"}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => onEdit(service)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(service.id!)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-slate-100 p-4"
        >
          <div className="flex gap-3">
            <div className="h-16 w-16 rounded-xl bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 rounded bg-slate-200" />
              <div className="h-3 w-1/3 rounded bg-slate-200" />
              <div className="h-3 w-1/2 rounded bg-slate-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  hasServices,
  onReset,
}: {
  hasServices: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <Package className="h-7 w-7 text-slate-400" />
      </div>
      <p className="mt-4 text-sm font-bold text-slate-700">
        {hasServices ? "No matching services" : "No services yet"}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {hasServices
          ? "Try adjusting your filters"
          : "Add your first service using the form"}
      </p>
      {hasServices && (
        <button
          onClick={onReset}
          className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-full max-w-xs flex-col gap-2">
      {toasts.map((t) => {
        const tones =
          t.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : t.type === "error"
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-blue-200 bg-blue-50 text-blue-800";
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
            className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${tones}`}
          >
            {icon}
            <span className="flex-1">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
