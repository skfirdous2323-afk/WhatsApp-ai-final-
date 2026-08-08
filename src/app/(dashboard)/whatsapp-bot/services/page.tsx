"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [analytics, setAnalytics] = useState({
    total: 0,
    active: 0,
    featured: 0,
    avgPrice: 0,
    totalBookings: 0,
    revenue: 0,
    topService: ""
  });

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

  const durationOptions = ["15", "30", "45", "60", "90", "120"];
  const categoryOptions = [
    "Consultation",
    "Treatment",
    "Surgery",
    "Diagnostic",
    "Follow-up",
    "Emergency",
    "Cosmetic",
    "Preventive",
    "Other"
  ];

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

    if (clinicError || !clinic) {
      throw new Error("Clinic not found");
    }

    return clinic.id;
  };

  const loadServices = async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        showMessage('error', 'Please login first');
        return;
      }

      const clinicId = await getClinicId(user.id);

      // Check if services feature is enabled
      const { data: clinic, error: clinicError } = await supabase
        .from("clinics")
        .select("services_enabled")
        .eq("id", clinicId)
        .single();

      if (clinicError) throw clinicError;

      if (clinic?.services_enabled === false) {
        setIsEnabled(false);
        setServices([]);
        setIsLoading(false);
        return;
      }

      setIsEnabled(true);

      const { data, error } = await supabase
        .from('clinic_services')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedServices = data?.map((item: any) => ({
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
      calculateAnalytics(mappedServices);
    } catch (error: any) {
      console.error('Error loading services:', error);
      showMessage('error', `Failed to load services: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDoctors = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const clinicId = await getClinicId(user.id);

      const { data, error } = await supabase
        .from('clinic_doctors')
        .select('id, doctor_name, specialization')
        .eq('clinic_id', clinicId)
        .order('doctor_name');

      if (error) throw error;

      const mappedDoctors = data?.map((doc: any) => ({
        id: doc.id,
        name: doc.doctor_name,
        specialization: doc.specialization
      })) || [];

      setDoctors(mappedDoctors);
    } catch (error: any) {
      console.error('Error loading doctors:', error);
    }
  };

  // Toggle services section on/off
  const handleToggleServices = async () => {
    setIsSaving(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const clinicId = await getClinicId(user.id);

      const newStatus = !isEnabled;

      const { error } = await supabase
        .from("clinics")
        .update({ services_enabled: newStatus })
        .eq("id", clinicId);

      if (error) throw error;

      setIsEnabled(newStatus);
      showMessage('success', `Services section ${newStatus ? 'enabled' : 'disabled'} successfully`);

      if (newStatus) {
        await loadServices();
      } else {
        setServices([]);
      }
    } catch (error) {
      console.error('Error toggling services:', error);
      showMessage('error', 'Failed to update services section');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateAnalytics = (data: Service[]) => {
    const activeServices = data.filter(s => s.is_active);
    const featuredServices = data.filter(s => s.is_featured);
    const prices = data.map(s => parseFloat(s.price) || 0);
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

    setAnalytics({
      total: data.length,
      active: activeServices.length,
      featured: featuredServices.length,
      avgPrice: avgPrice,
      totalBookings: data.length * 25,
      revenue: data.length * 25 * 500,
      topService: data.length > 0 ? data[0].service_name : "N/A"
    });
  };

  const applyFilters = () => {
    let filtered = [...services];

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(s => s.category === categoryFilter);
    }

    if (statusFilter === "active") {
      filtered = filtered.filter(s => s.is_active);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter(s => !s.is_active);
    }

    setFilteredServices(filtered);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleDoctorSelect = (doctorId: string) => {
    setFormData(prev => {
      const current = prev.assigned_doctors || [];
      if (current.includes(doctorId)) {
        return { ...prev, assigned_doctors: current.filter(id => id !== doctorId) };
      } else {
        return { ...prev, assigned_doctors: [...current, doctorId] };
      }
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showMessage('error', 'Image size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      setFormData(prev => ({ ...prev, image_file: file }));
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setFormData(prev => ({ ...prev, image_url: null, image_file: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEnabled) {
      showMessage('error', 'Services section is disabled. Enable it first.');
      return;
    }

    if (!formData.service_name.trim()) {
      showMessage('error', 'Please enter service name');
      return;
    }
    if (!formData.price.trim()) {
      showMessage('error', 'Please enter service price');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        showMessage('error', 'Please login first');
        return;
      }

      const clinicId = await getClinicId(user.id);

      let imageUrl = formData.image_url;
      if (formData.image_file) {
        const fileExt = formData.image_file.name.split('.').pop();
        const fileName = `service-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('service-images')
          .upload(fileName, formData.image_file);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('service-images')
            .getPublicUrl(fileName);
          imageUrl = publicUrl;
        }
      }

      const serviceData = {
        clinic_id: clinicId,
        user_id: user.id,
        service_name: formData.service_name,
        description: formData.description,
        price: formData.price,
        duration_minutes: parseInt(formData.duration_minutes) || 30,
        category: formData.category,
        assigned_doctors: formData.assigned_doctors || [],
        image_url: imageUrl,
        is_featured: formData.is_featured,
        whatsapp_reply: formData.whatsapp_reply,
        preparation_instructions: formData.preparation_instructions,
        is_active: formData.is_active,
      };

      let error;
      if (editingId) {
        const { error: updateError } = await supabase
          .from('clinic_services')
          .update(serviceData)
          .eq('id', editingId)
          .eq('clinic_id', clinicId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('clinic_services')
          .insert([serviceData]);
        error = insertError;
      }

      if (error) throw error;

      showMessage('success', editingId ? 'Service updated successfully!' : 'Service added successfully!');
      resetForm();
      await loadServices();
    } catch (error: any) {
      console.error('Error saving service:', error);
      showMessage('error', `Failed to ${editingId ? 'update' : 'add'} service: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (service: Service) => {
    if (!isEnabled) {
      showMessage('error', 'Services section is disabled. Enable it first.');
      return;
    }

    setFormData({
      service_name: service.service_name,
      description: service.description || "",
      price: service.price || "",
      duration_minutes: service.duration_minutes?.toString() || "30",
      category: service.category || "",
      assigned_doctors: service.assigned_doctors || [],
      image_url: service.image_url || null,
      image_file: null,
      is_featured: service.is_featured || false,
      whatsapp_reply: service.whatsapp_reply || "",
      preparation_instructions: service.preparation_instructions || "",
      is_active: service.is_active !== undefined ? service.is_active : true,
    });
    setImagePreview(service.image_url);
    setEditingId(service.id || null);
    document.getElementById('service-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!isEnabled) {
      showMessage('error', 'Services section is disabled. Enable it first.');
      return;
    }

    if (!confirm('Are you sure you want to delete this service?')) return;

    setIsSaving(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        showMessage('error', 'Please login first');
        return;
      }

      const clinicId = await getClinicId(user.id);

      const { error } = await supabase
        .from('clinic_services')
        .delete()
        .eq('id', id)
        .eq('clinic_id', clinicId);

      if (error) throw error;
      showMessage('success', 'Service deleted successfully');
      await loadServices();
    } catch (error: any) {
      console.error('Error deleting service:', error);
      showMessage('error', `Failed to delete service: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = async (service: Service) => {
    if (!isEnabled) {
      showMessage('error', 'Services section is disabled. Enable it first.');
      return;
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        showMessage('error', 'Please login first');
        return;
      }

      const clinicId = await getClinicId(user.id);

      const { error } = await supabase
        .from('clinic_services')
        .insert([{
          clinic_id: clinicId,
          user_id: user.id,
          service_name: `${service.service_name} (Copy)`,
          description: service.description || "",
          price: service.price || "",
          duration_minutes: parseInt(service.duration_minutes) || 30,
          category: service.category || "",
          assigned_doctors: service.assigned_doctors || [],
          image_url: service.image_url || null,
          is_featured: service.is_featured || false,
          whatsapp_reply: service.whatsapp_reply || "",
          preparation_instructions: service.preparation_instructions || "",
          is_active: true,
        }]);

      if (error) throw error;
      showMessage('success', 'Service duplicated successfully!');
      await loadServices();
    } catch (error: any) {
      console.error('Error duplicating service:', error);
      showMessage('error', `Failed to duplicate service: ${error.message}`);
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Price', 'Duration', 'Category', 'Status', 'Featured', 'Description'];
    const rows = filteredServices.map(s => [
      s.service_name,
      s.price,
      s.duration_minutes,
      s.category,
      s.is_active ? 'Active' : 'Inactive',
      s.is_featured ? 'Yes' : 'No',
      s.description || ""
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `services-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">WhatsApp Bot Setup</h1>
            <p className="mt-1 text-sm text-gray-500">Step 3 of 6 – Services</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Global On/Off Switch - Same as Doctors page */}
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-md border border-gray-200">
              <span className="text-sm font-medium text-gray-600">Services</span>
              <button
                onClick={handleToggleServices}
                disabled={isSaving}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isEnabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-semibold ${isEnabled ? 'text-green-600' : 'text-red-500'}`}>
                {isEnabled ? 'ON' : 'OFF'}
              </span>
            </div>

            <button
              onClick={exportCSV}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              📤 Export CSV
            </button>
            <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800">
              {services.length} Services
            </span>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {message.text}
            </p>
          </div>
        )}

        {/* Disabled State - Same as Doctors page */}
        {!isEnabled ? (
          <div className="rounded-2xl bg-white p-16 shadow-xl border border-gray-100 text-center">
            <div className="mx-auto max-w-md">
              <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Services Section Disabled</h3>
              <p className="mt-3 text-gray-500">Toggle the switch above to enable services management</p>
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-500">💡 Tip:</span>
                <span className="text-sm text-gray-600">Enable to add and manage services</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Analytics Dashboard Cards */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Services</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{analytics.total}</p>
                  </div>
                  <div className="rounded-full bg-blue-100 p-3">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active Services</p>
                    <p className="mt-2 text-2xl font-bold text-green-600">{analytics.active}</p>
                  </div>
                  <div className="rounded-full bg-green-100 p-3">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Featured Services</p>
                    <p className="mt-2 text-2xl font-bold text-yellow-600">{analytics.featured}</p>
                  </div>
                  <div className="rounded-full bg-yellow-100 p-3">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Avg. Price</p>
                    <p className="mt-2 text-2xl font-bold text-purple-600">₹{analytics.avgPrice.toFixed(0)}</p>
                  </div>
                  <div className="rounded-full bg-purple-100 p-3">
                    <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v1m0 4.5V15m0-1v-1m0 4.5V19m0-1v-1M9 11.5c.542.79 1.442 1.5 3 1.5s2.458-.71 3-1.5" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="🔍 Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="">All Categories</option>
                {categoryOptions.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setViewMode("card")}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    viewMode === "card"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  📊 Card
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    viewMode === "table"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  📋 Table
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Form Section */}
              <div className="lg:col-span-2">
                <div id="service-form" className="rounded-xl bg-white p-6 shadow-xl border border-gray-100">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {editingId ? 'Edit Service' : 'Add New Service'}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {editingId ? 'Update service information' : 'Enter service details'}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Service Name *
                        </label>
                        <input
                          type="text"
                          name="service_name"
                          value={formData.service_name}
                          onChange={handleInputChange}
                          placeholder="Dental Cleaning"
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Price (₹) *
                        </label>
                        <input
                          type="number"
                          name="price"
                          value={formData.price}
                          onChange={handleInputChange}
                          placeholder="500"
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Duration (Minutes)
                        </label>
                        <select
                          name="duration_minutes"
                          value={formData.duration_minutes}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        >
                          {durationOptions.map(opt => (
                            <option key={opt} value={opt}>{opt} min</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Service Category
                        </label>
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        >
                          <option value="">Select category</option>
                          {categoryOptions.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Description
                        </label>
                        <textarea
                          name="description"
                          rows={3}
                          value={formData.description}
                          onChange={handleInputChange}
                          placeholder="Service description..."
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          👨‍⚕️ Assigned Doctors
                        </label>
                        <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg bg-gray-50 min-h-[60px]">
                          {doctors.length === 0 ? (
                            <span className="text-sm text-gray-500">No doctors available. Add doctors first.</span>
                          ) : (
                            doctors.map(doctor => (
                              <button
                                key={doctor.id}
                                type="button"
                                onClick={() => handleDoctorSelect(doctor.id)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                  formData.assigned_doctors.includes(doctor.id)
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                {doctor.name}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          🖼️ Service Image/Icon
                        </label>
                        <div className="flex items-center gap-4">
                          {imagePreview ? (
                            <>
                              <img
                                src={imagePreview}
                                alt="Service preview"
                                className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                              />
                              <button
                                type="button"
                                onClick={removeImage}
                                className="text-sm text-red-600 hover:text-red-800 font-medium"
                              >
                                Remove
                              </button>
                            </>
                          ) : (
                            <div className="flex-1">
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Recommended: Square image, max 2MB
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          📱 WhatsApp Quick Reply Text
                        </label>
                        <textarea
                          name="whatsapp_reply"
                          rows={2}
                          value={formData.whatsapp_reply}
                          onChange={handleInputChange}
                          placeholder="Your appointment for {service} has been confirmed..."
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          📄 Preparation Instructions
                        </label>
                        <textarea
                          name="preparation_instructions"
                          rows={2}
                          value={formData.preparation_instructions}
                          onChange={handleInputChange}
                          placeholder="Please arrive 15 minutes before appointment..."
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          ⭐ Featured Service
                        </label>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              name="is_featured"
                              checked={formData.is_featured}
                              onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Yes</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          🔒 Status
                        </label>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              name="is_active"
                              checked={formData.is_active}
                              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-700">Active</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-2.5 font-semibold text-white hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? (
                          <span className="flex items-center justify-center">
                            <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            {editingId ? 'Updating...' : 'Adding...'}
                          </span>
                        ) : (
                          editingId ? 'Update Service' : 'Add Service'
                        )}
                      </button>
                      {editingId && (
                        <button
                          type="button"
                          onClick={resetForm}
                          className="px-6 py-2.5 rounded-lg border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              {/* Services List Section */}
              <div className="lg:col-span-1">
                <div className="rounded-xl bg-white p-6 shadow-xl border border-gray-100">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Service List</h2>
                    <span className="text-sm text-gray-500">{filteredServices.length} shown</span>
                  </div>

                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                  ) : filteredServices.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500">No services found</p>
                      <p className="text-xs text-gray-400 mt-1">Try adjusting filters</p>
                    </div>
                  ) : viewMode === "card" ? (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {filteredServices.map((service) => (
                        <div
                          key={service.id}
                          className={`rounded-lg border p-4 transition-all ${
                            service.is_active
                              ? 'border-gray-200 hover:border-blue-300'
                              : 'border-gray-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900 truncate">{service.service_name}</h3>
                                {service.is_featured && (
                                  <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                                    ⭐
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 space-y-1">
                                <p className="text-sm text-gray-600">₹{service.price}</p>
                                {service.duration_minutes && (
                                  <p className="text-xs text-gray-500">{service.duration_minutes} min</p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 ml-2">
                              <button
                                onClick={() => handleEdit(service)}
                                className="text-xs font-medium text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDuplicate(service)}
                                className="text-xs font-medium text-purple-600 hover:text-purple-800"
                              >
                                Duplicate
                              </button>
                              <button
                                onClick={() => handleDelete(service.id!)}
                                className="text-xs font-medium text-red-600 hover:text-red-800"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredServices.map((service) => (
                            <tr key={service.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  {service.image_url && (
                                    <img
                                      src={service.image_url}
                                      alt={service.service_name}
                                      className="h-8 w-8 rounded object-cover"
                                    />
                                  )}
                                  <span className="text-sm font-medium text-gray-900">{service.service_name}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-600">₹{service.price}</td>
                              <td className="px-3 py-2 text-sm text-gray-600">{service.duration_minutes} min</td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  service.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {service.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEdit(service)}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDuplicate(service)}
                                    className="text-xs font-medium text-purple-600 hover:text-purple-800"
                                  >
                                    Copy
                                  </button>
                                  <button
                                    onClick={() => handleDelete(service.id!)}
                                    className="text-xs font-medium text-red-600 hover:text-red-800"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Navigation */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Step 3 of 6</span>
            <div className="flex gap-1">
              <div className="h-2 w-2 rounded-full bg-blue-600"></div>
              <div className="h-2 w-2 rounded-full bg-blue-600"></div>
              <div className="h-2 w-8 rounded-full bg-blue-600"></div>
              <div className="h-2 w-2 rounded-full bg-gray-300"></div>
              <div className="h-2 w-2 rounded-full bg-gray-300"></div>
              <div className="h-2 w-2 rounded-full bg-gray-300"></div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/whatsapp-bot/doctors"
              className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ← Previous
            </Link>
            <Link
              href="/whatsapp-bot/faq"
              className="rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-6 py-2.5 font-semibold text-white hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg"
            >
              Next → FAQ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
