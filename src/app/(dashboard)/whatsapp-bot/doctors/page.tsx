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
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Doctor>({
    name: "",
    specialization: "",
    qualification: "",
    experience: "",
    fees: ""
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
      showMessage('error', 'Failed to load doctors');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.specialization || !formData.qualification) {
      showMessage('error', 'Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('doctors')
          .update({
            name: formData.name,
            specialization: formData.specialization,
            qualification: formData.qualification,
            experience: formData.experience,
            fees: formData.fees
          })
          .eq('id', editingId);

        if (error) throw error;
        showMessage('success', 'Doctor updated successfully');
      } else {
        const { error } = await supabase
          .from('doctors')
          .insert([{
            name: formData.name,
            specialization: formData.specialization,
            qualification: formData.qualification,
            experience: formData.experience,
            fees: formData.fees
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
    setFormData({
      name: doctor.name,
      specialization: doctor.specialization,
      qualification: doctor.qualification,
      experience: doctor.experience || "",
      fees: doctor.fees || ""
    });
    setEditingId(doctor.id || null);
    document.getElementById('doctor-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Are you sure you want to remove this doctor?')) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('doctors')
        .delete()
        .eq('id', id);

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
      fees: ""
    });
    setEditingId(null);
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Doctor Management</h1>
              <p className="mt-1 text-gray-600">Step 2 of 6 – Manage your medical professionals</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                {doctors.length} Doctors
              </span>
              <Link
                href="/whatsapp-bot"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ← Previous
              </Link>
              <Link
                href="/whatsapp-bot/services"
                className="rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-6 py-2 text-sm font-semibold text-white hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl"
              >
                Next → Services
              </Link>
            </div>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 rounded-lg p-4 ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {message.text}
            </p>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div id="doctor-form" className="rounded-xl bg-white p-6 shadow-xl border border-gray-100">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingId ? 'Edit Doctor' : 'Add New Doctor'}
                </h2>
                <p className="text-sm text-gray-500">
                  {editingId ? 'Update doctor information' : 'Enter doctor details'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Doctor Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Dr. John Smith"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Specialization *
                  </label>
                  <input
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleInputChange}
                    placeholder="Dental Surgeon"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Qualification *
                  </label>
                  <input
                    type="text"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleInputChange}
                    placeholder="BDS, MDS"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Experience (Years)
                  </label>
                  <input
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    placeholder="5"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Consultation Fee (₹)
                  </label>
                  <input
                    type="number"
                    name="fees"
                    value={formData.fees}
                    onChange={handleInputChange}
                    placeholder="500"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 font-medium text-white hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="px-4 py-2.5 rounded-lg border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Doctors List Section */}
          <div className="lg:col-span-2">
            <div className="rounded-xl bg-white p-6 shadow-xl border border-gray-100">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-gray-900">Doctor List</h2>
                <span className="text-sm text-gray-500">{doctors.length} total</span>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                </div>
              ) : doctors.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No doctors added yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Add your first doctor using the form</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {doctors.map((doctor) => (
                    <div
                      key={doctor.id}
                      className="group rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">{doctor.name}</h3>
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 whitespace-nowrap">
                              {doctor.specialization}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
                            <div>
                              <span className="font-medium text-gray-600">Qualification:</span>
                              <span className="ml-1 text-gray-800">{doctor.qualification}</span>
                            </div>
                            {doctor.experience && (
                              <div>
                                <span className="font-medium text-gray-600">Experience:</span>
                                <span className="ml-1 text-gray-800">{doctor.experience} years</span>
                              </div>
                            )}
                            {doctor.fees && (
                              <div className="sm:col-span-2">
                                <span className="font-medium text-gray-600">Fees:</span>
                                <span className="ml-1 font-semibold text-green-600">₹{doctor.fees}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleEdit(doctor)}
                            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleRemove(doctor.id!)}
                            className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
    </div>
  );
}
