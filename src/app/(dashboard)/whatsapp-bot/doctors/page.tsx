// src/app/(dashboard)/whatsapp-bot/doctors/page.tsx

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Doctor {
  id?: string;
  name: string;
  specialization: string;
  qualification: string;
  experience: string;
  fees: string;
  availableDays: string[];
  startTime: string;
  endTime: string;
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    specialization: "",
    qualification: "",
    experience: "",
    fees: "",
    availableDays: [] as string[],
    startTime: "09:00",
    endTime: "18:00"
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadDoctors();
  }, []);

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

  const loadDoctors = async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const clinicId = await getClinicId(user.id);

      const { data: clinic, error: clinicError } = await supabase
        .from("clinics")
        .select("doctors_enabled")
        .eq("id", clinicId)
        .single();

      if (clinicError) throw clinicError;

      if (clinic?.doctors_enabled === false) {
        setIsEnabled(false);
        setDoctors([]);
        setIsLoading(false);
        return;
      }

      setIsEnabled(true);

      const { data, error } = await supabase
        .from('clinic_doctors')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedDoctors = data?.map(doc => ({
        id: doc.id,
        name: doc.doctor_name,
        specialization: doc.specialization,
        qualification: doc.qualification,
        experience: doc.experience || "",
        fees: doc.consultation_fee || "",
        availableDays: doc.available_days || [],
        startTime: doc.start_time || "09:00",
        endTime: doc.end_time || "18:00"
      })) || [];

      setDoctors(mappedDoctors);
    } catch (error) {
      console.error('Error loading doctors:', error);
      showMessage('error', 'Failed to load doctors');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDoctors = async () => {
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
        .update({ doctors_enabled: newStatus })
        .eq("id", clinicId);

      if (error) throw error;

      setIsEnabled(newStatus);
      showMessage('success', `Doctors section ${newStatus ? 'enabled' : 'disabled'} successfully`);

      if (newStatus) {
        await loadDoctors();
      } else {
        setDoctors([]);
      }
    } catch (error) {
      console.error('Error toggling doctors:', error);
      showMessage('error', 'Failed to update doctors section');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEnabled) {
      showMessage('error', 'Doctors section is disabled. Enable it first.');
      return;
    }

    if (!formData.name || !formData.specialization || !formData.qualification) {
      showMessage('error', 'Please fill in all required fields');
      return;
    }

    if (formData.availableDays.length === 0) {
      showMessage('error', 'Please select at least one doctor availability day');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const clinicId = await getClinicId(user.id);

      if (editingId) {
        const { error } = await supabase
          .from('clinic_doctors')
          .update({
            doctor_name: formData.name,
            specialization: formData.specialization,
            qualification: formData.qualification,
            experience: formData.experience,
            consultation_fee: formData.fees,
            available_days: formData.availableDays,
            start_time: formData.startTime,
            end_time: formData.endTime
          })
          .eq('id', editingId)
          .eq('clinic_id', clinicId);

        if (error) throw error;
        showMessage('success', 'Doctor updated successfully');
      } else {
        const { error } = await supabase
          .from('clinic_doctors')
          .insert([{
            clinic_id: clinicId,
            user_id: user.id,
            doctor_name: formData.name,
            specialization: formData.specialization,
            qualification: formData.qualification,
            experience: formData.experience || null,
            consultation_fee: formData.fees || null,
            available_days: formData.availableDays,
            start_time: formData.startTime,
            end_time: formData.endTime
          }]);

        if (error) throw error;
        showMessage('success', 'Doctor added successfully');
      }

      resetForm();
      await loadDoctors();
    } catch (error) {
      console.error('Error saving doctor:', error);
      showMessage('error', `Failed to ${editingId ? 'update' : 'add'} doctor`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (doctor: Doctor) => {
    if (!isEnabled) {
      showMessage('error', 'Doctors section is disabled. Enable it first.');
      return;
    }

    setFormData({
      name: doctor.name,
      specialization: doctor.specialization,
      qualification: doctor.qualification,
      experience: doctor.experience || "",
      fees: doctor.fees || "",
      availableDays: doctor.availableDays || [],
      startTime: doctor.startTime || "09:00",
      endTime: doctor.endTime || "18:00"
    });
    setEditingId(doctor.id || null);
    document.getElementById('doctor-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRemove = async (id: string) => {
    if (!isEnabled) {
      showMessage('error', 'Doctors section is disabled. Enable it first.');
      return;
    }

    if (!confirm('Are you sure you want to remove this doctor?')) return;

    setIsSaving(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const clinicId = await getClinicId(user.id);

      const { error } = await supabase
        .from('clinic_doctors')
        .delete()
        .eq('id', id)
        .eq('clinic_id', clinicId);

      if (error) throw error;
      showMessage('success', 'Doctor removed successfully');
      await loadDoctors();
    } catch (error) {
      console.error('Error removing doctor:', error);
      showMessage('error', 'Failed to remove doctor');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      specialization: "",
      qualification: "",
      experience: "",
      fees: "",
      availableDays: [],
      startTime: "09:00",
      endTime: "18:00"
    });
    setEditingId(null);
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">

        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                Step 2 of 6
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
              Doctor Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your medical professionals and their availability
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow-md border border-gray-200">
              <span className="text-sm font-medium text-gray-600">Doctors</span>
              <button
                onClick={handleToggleDoctors}
                disabled={isSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  isEnabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-semibold ${isEnabled ? 'text-green-600' : 'text-red-500'}`}>
                {isEnabled ? 'ON' : 'OFF'}
              </span>
            </div>

            <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800">
              {doctors.length} Doctors
            </span>

            <div className="flex gap-2">
              <Link
                href="/whatsapp-bot"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ← Previous
              </Link>
              <Link
                href="/whatsapp-bot/services"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:from-blue-700 hover:to-blue-800 transition-colors shadow-md hover:shadow-lg"
              >
                Next → Services
              </Link>
            </div>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 rounded-xl p-4 shadow-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`text-sm font-medium ${
              message.type === 'success' ? 'text-emerald-800' : 'text-red-800'
            }`}>
              {message.text}
            </p>
          </div>
        )}

        {/* Disabled State */}
        {!isEnabled ? (
          <div className="rounded-2xl bg-white p-16 shadow-xl border border-gray-100 text-center">
            <div className="mx-auto max-w-md">
              <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Doctors Section Disabled</h3>
              <p className="mt-3 text-gray-500">Toggle the switch above to enable doctors management</p>
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-500">💡 Tip:</span>
                <span className="text-sm text-gray-600">Enable to add and manage doctors</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">

            {/* Form Section */}
            <div className="lg:col-span-1">
              <div id="doctor-form" className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-gray-200/50 border border-gray-100">
                <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                      <span className="text-xl">👨‍⚕️</span>
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        {editingId ? 'Edit Doctor' : 'Add New Doctor'}
                      </h2>
                      <p className="text-xs text-gray-500">
                        {editingId ? 'Update doctor information' : 'Enter doctor details'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                        Doctor Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Dr. John Smith"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                        Specialization <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleInputChange}
                        placeholder="Dental Surgeon"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                        Qualification <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="qualification"
                        value={formData.qualification}
                        onChange={handleInputChange}
                        placeholder="BDS, MDS"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                          Experience
                        </label>
                        <input
                          type="number"
                          name="experience"
                          value={formData.experience}
                          onChange={handleInputChange}
                          placeholder="5"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                          Fee (₹)
                        </label>
                        <input
                          type="number"
                          name="fees"
                          value={formData.fees}
                          onChange={handleInputChange}
                          placeholder="500"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Available Days <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                          <label key={day} className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition ${
                            formData.availableDays.includes(day)
                              ? 'border-blue-300 bg-blue-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}>
                            <input
                              type="checkbox"
                              checked={formData.availableDays.includes(day)}
                              onChange={(e) => {
                                setFormData((prev) => ({
                                  ...prev,
                                  availableDays: e.target.checked
                                    ? [...prev.availableDays, day]
                                    : prev.availableDays.filter((d) => d !== day),
                                }));
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-700">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={formData.startTime}
                          onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={formData.endTime}
                          onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          editingId ? 'Update Doctor' : 'Add Doctor'
                        )}
                      </button>
                      {editingId && (
                        <button
                          type="button"
                          onClick={resetForm}
                          className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Doctors List Section */}
            <div className="lg:col-span-2">
              <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-gray-200/50 border border-gray-100">
                <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                        <span className="text-xl">📋</span>
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-gray-900">Doctor List</h2>
                        <p className="text-xs text-gray-500">{doctors.length} total doctors</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                  ) : doctors.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">No doctors added yet</h3>
                      <p className="mt-1 text-sm text-gray-500">Add your first doctor using the form</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {doctors.map((doctor) => (
                        <div
                          key={doctor.id}
                          className="group rounded-xl border border-gray-200 bg-white p-5 hover:border-blue-300 hover:shadow-md transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-bold text-gray-900 truncate">{doctor.name}</h3>
                                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 whitespace-nowrap">
                                  {doctor.specialization}
                                </span>
                              </div>
                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="font-medium text-gray-500">Qualification:</span>
                                  <span className="ml-1 text-gray-800">{doctor.qualification}</span>
                                </div>
                                {doctor.experience && (
                                  <div>
                                    <span className="font-medium text-gray-500">Experience:</span>
                                    <span className="ml-1 text-gray-800">{doctor.experience} years</span>
                                  </div>
                                )}
                                {doctor.fees && (
                                  <div>
                                    <span className="font-medium text-gray-500">Fees:</span>
                                    <span className="ml-1 font-semibold text-green-600">₹{doctor.fees}</span>
                                  </div>
                                )}
                                {doctor.availableDays && doctor.availableDays.length > 0 && (
                                  <div className="sm:col-span-2">
                                    <span className="font-medium text-gray-500">Available:</span>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {doctor.availableDays.map((day) => (
                                        <span key={day} className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                          {day.substring(0, 3)}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {doctor.startTime && doctor.endTime && (
                                  <div className="sm:col-span-2">
                                    <span className="font-medium text-gray-500">Time:</span>
                                    <span className="ml-1 text-gray-800">
                                      {doctor.startTime} - {doctor.endTime}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleEdit(doctor)}
                                className="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleRemove(doctor.id!)}
                                className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
