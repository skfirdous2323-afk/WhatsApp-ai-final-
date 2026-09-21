"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface DaySchedule {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export default function WorkingHoursPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
  ];

  const [schedule, setSchedule] = useState<DaySchedule[]>(
    daysOfWeek.map(day => ({
      day,
      isOpen: true,
      openTime: "09:00",
      closeTime: "18:00"
    }))
  );

  const [appointmentSettings, setAppointmentSettings] = useState({
    slot_duration: "30",
    max_booking_days: "7",
    allow_online_booking: true,
    auto_confirm_booking: true
  });

  const [analytics, setAnalytics] = useState({
    workingDays: 0,
    closedDays: 0,
    totalWeeklyHours: 0,
    averageDailyHours: 0
  });

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

  const handleToggleWorkingHours = async () => {
    setSaving(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        showMessage('error', 'Please login first');
        return;
      }

      const clinicIdValue = await getClinicId(user.id);
      const newStatus = !isEnabled;

      let isColumnExists = true;
      try {
        const { data: clinic } = await supabase
          .from("clinics")
          .select("working_hours_enabled")
          .eq("id", clinicIdValue)
          .maybeSingle();

        if (!clinic) {
          isColumnExists = false;
        }
      } catch (err) {
        isColumnExists = false;
      }

      if (!isColumnExists) {
        setIsEnabled(newStatus);
        showMessage('success', `Working hours section ${newStatus ? 'enabled' : 'disabled'} successfully`);
        return;
      }

      const { error } = await supabase
        .from("clinics")
        .update({ working_hours_enabled: newStatus })
        .eq("id", clinicIdValue);

      if (error) throw error;

      setIsEnabled(newStatus);
      showMessage('success', `Working hours section ${newStatus ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Error toggling working hours:', error);
      showMessage('error', 'Failed to update working hours section');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    calculateAnalytics();
  }, [schedule]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setLoading(false);
        return;
      }

      const clinicIdValue = await getClinicId(user.id);
      setClinicId(clinicIdValue);

      try {
        const { data: clinic } = await supabase
          .from("clinics")
          .select("working_hours_enabled")
          .eq("id", clinicIdValue)
          .maybeSingle();

        if (clinic) {
          setIsEnabled(clinic.working_hours_enabled !== false);
        }
      } catch (err) {
        console.warn('working_hours_enabled column not found, defaulting to enabled');
        setIsEnabled(true);
      }

      const { data: hoursData, error: hoursError } = await supabase
        .from('clinic_working_hours')
        .select('*')
        .eq('clinic_id', clinicIdValue);

      if (!hoursError && hoursData && hoursData.length > 0) {
        const updatedSchedule = schedule.map(day => {
          const existing = hoursData.find((h: any) => h.day_name === day.day);
          if (existing) {
            return {
              ...day,
              isOpen: !existing.is_closed,
              openTime: existing.open_time || "09:00",
              closeTime: existing.close_time || "18:00"
            };
          }
          return day;
        });
        setSchedule(updatedSchedule);
      }

      const { data: settingsData, error: settingsError } = await supabase
        .from('clinic_appointment_settings')
        .select('*')
        .eq('clinic_id', clinicIdValue)
        .maybeSingle();

      if (!settingsError && settingsData) {
        setAppointmentSettings({
          slot_duration: settingsData.slot_duration?.toString() || "30",
          max_booking_days: settingsData.max_booking_days?.toString() || "7",
          allow_online_booking: settingsData.allow_online_booking !== false,
          auto_confirm_booking: settingsData.auto_confirm_booking !== false
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showMessage('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = () => {
    const working = schedule.filter(day => day.isOpen);
    const closed = schedule.filter(day => !day.isOpen);

    let totalHours = 0;
    working.forEach(day => {
      if (day.isOpen) {
        const open = day.openTime.split(':').map(Number);
        const close = day.closeTime.split(':').map(Number);
        const hours = close[0] - open[0] + (close[1] - open[1]) / 60;
        totalHours += hours;
      }
    });

    setAnalytics({
      workingDays: working.length,
      closedDays: closed.length,
      totalWeeklyHours: Math.round(totalHours * 10) / 10,
      averageDailyHours: working.length > 0 ? Math.round((totalHours / working.length) * 10) / 10 : 0
    });
  };

  const validateTime = (openTime: string, closeTime: string): boolean => {
    if (!openTime || !closeTime) return true;
    return openTime < closeTime;
  };

  const handleDayToggle = (index: number) => {
    if (!isEnabled) {
      showMessage('error', 'Working hours section is disabled. Enable it first.');
      return;
    }
    setSchedule(prev => {
      const updated = [...prev];
      updated[index].isOpen = !updated[index].isOpen;
      return updated;
    });
  };

  const handleTimeChange = (index: number, field: 'openTime' | 'closeTime', value: string) => {
    if (!isEnabled) {
      showMessage('error', 'Working hours section is disabled. Enable it first.');
      return;
    }
    const updated = [...schedule];
    updated[index][field] = value;

    if (field === 'openTime' && updated[index].closeTime) {
      if (!validateTime(value, updated[index].closeTime)) {
        showMessage('error', 'Close time must be after open time');
        return;
      }
    }
    if (field === 'closeTime' && updated[index].openTime) {
      if (!validateTime(updated[index].openTime, value)) {
        showMessage('error', 'Close time must be after open time');
        return;
      }
    }
    setSchedule(updated);
  };

  const handleAppointmentSettingChange = (field: string, value: any) => {
    if (!isEnabled) {
      showMessage('error', 'Working hours section is disabled. Enable it first.');
      return;
    }
    setAppointmentSettings(prev => ({ ...prev, [field]: value }));
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSave = async () => {
    if (!isEnabled) {
      showMessage('error', 'Working hours section is disabled. Enable it first.');
      return;
    }

    if (!clinicId) {
      showMessage('error', 'Clinic not found');
      return;
    }

    setSaving(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        showMessage('error', 'Please login first');
        return;
      }

      for (const day of schedule) {
        if (day.isOpen) {
          if (!validateTime(day.openTime, day.closeTime)) {
            showMessage('error', `Invalid time range for ${day.day}`);
            return;
          }
        }
      }

      for (const day of schedule) {
        const { error } = await supabase
          .from('clinic_working_hours')
          .upsert({
            clinic_id: clinicId,
            user_id: user.id,
            day_name: day.day,
            is_closed: !day.isOpen,
            open_time: day.openTime,
            close_time: day.closeTime
          }, {
            onConflict: 'clinic_id,day_name'
          });

        if (error) throw error;
      }

      const { error: settingsError } = await supabase
        .from('clinic_appointment_settings')
        .upsert({
          clinic_id: clinicId,
          user_id: user.id,
          slot_duration: parseInt(appointmentSettings.slot_duration) || 30,
          max_booking_days: parseInt(appointmentSettings.max_booking_days) || 7,
          allow_online_booking: appointmentSettings.allow_online_booking,
          auto_confirm_booking: appointmentSettings.auto_confirm_booking
        }, {
          onConflict: 'clinic_id'
        });

      if (settingsError) throw settingsError;

      showMessage('success', '✅ Working hours saved successfully!');
    } catch (error) {
      console.error('Error saving:', error);
      showMessage('error', 'Failed to save working hours');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">

        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                Step 4 of 6
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
              Working Hours & Settings
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Set your weekly schedule and appointment preferences
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow-md border border-gray-200">
              <span className="text-sm font-medium text-gray-600">Hours</span>
              <button
                onClick={handleToggleWorkingHours}
                disabled={saving}
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

            <button
              onClick={handleSave}
              disabled={saving || !isEnabled}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-700 hover:to-emerald-800 hover:shadow-xl hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <span>💾</span>
                  Save All
                </>
              )}
            </button>
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
              <h3 className="text-2xl font-bold text-gray-900">Working Hours Section Disabled</h3>
              <p className="mt-3 text-gray-500">Toggle the switch above to enable working hours management</p>
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-500">💡 Tip:</span>
                <span className="text-sm text-gray-600">Enable to manage working hours</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Analytics Cards */}
            <div className="mb-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-white p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Working Days</p>
                    <p className="mt-2 text-2xl font-bold text-green-600">{analytics.workingDays} / 7</p>
                  </div>
                  <div className="rounded-xl bg-green-100 p-3">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Closed Days</p>
                    <p className="mt-2 text-2xl font-bold text-red-600">{analytics.closedDays} / 7</p>
                  </div>
                  <div className="rounded-xl bg-red-100 p-3">
                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly Hours</p>
                    <p className="mt-2 text-2xl font-bold text-blue-600">{analytics.totalWeeklyHours}h</p>
                  </div>
                  <div className="rounded-xl bg-blue-100 p-3">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Daily</p>
                    <p className="mt-2 text-2xl font-bold text-purple-600">{analytics.averageDailyHours}h</p>
                  </div>
                  <div className="rounded-xl bg-purple-100 p-3">
                    <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              {/* Left Column - Schedule */}
              <div className="lg:col-span-2">
                <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-gray-200/50 border border-gray-100">
                  <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                        <span className="text-xl">📅</span>
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-gray-900">Weekly Schedule</h2>
                        <p className="text-xs text-gray-500">Toggle days and set working hours</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="space-y-3">
                      {schedule.map((day, index) => (
                        <div
                          key={day.day}
                          className={`rounded-xl border-2 p-4 transition-all ${
                            day.isOpen
                              ? 'border-blue-100 bg-blue-50/30'
                              : 'border-gray-100 bg-gray-50/50 opacity-70'
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-3 min-w-[140px]">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={day.isOpen}
                                  onChange={() => handleDayToggle(index)}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className={`text-sm font-semibold ${day.isOpen ? 'text-gray-900' : 'text-gray-400'}`}>
                                  {day.day}
                                </span>
                              </label>
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                day.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {day.isOpen ? 'Open' : 'Closed'}
                              </span>
                            </div>

                            {day.isOpen && (
                              <div className="flex items-center gap-2 ml-auto">
                                <input
                                  type="time"
                                  value={day.openTime}
                                  onChange={(e) => handleTimeChange(index, 'openTime', e.target.value)}
                                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                                />
                                <span className="text-gray-400 text-sm font-medium">→</span>
                                <input
                                  type="time"
                                  value={day.closeTime}
                                  onChange={(e) => handleTimeChange(index, 'closeTime', e.target.value)}
                                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Appointment Settings */}
              <div className="lg:col-span-1">
                <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-gray-200/50 border border-gray-100">
                  <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                        <span className="text-xl">⚙️</span>
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-gray-900">Appointment Settings</h2>
                        <p className="text-xs text-gray-500">Configure slot preferences</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-5">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                        Slot Duration (minutes)
                      </label>
                      <select
                        value={appointmentSettings.slot_duration}
                        onChange={(e) => handleAppointmentSettingChange('slot_duration', e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition"
                      >
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">60 minutes</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                        Max Booking Days in Advance
                      </label>
                      <select
                        value={appointmentSettings.max_booking_days}
                        onChange={(e) => handleAppointmentSettingChange('max_booking_days', e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition"
                      >
                        <option value="1">1 day</option>
                        <option value="2">2 days</option>
                        <option value="3">3 days</option>
                        <option value="4">4 days</option>
                        <option value="5">5 days</option>
                        <option value="6">6 days</option>
                        <option value="7">7 days</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Navigation */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500">Step 4 of 6</span>
            <div className="flex gap-1">
              <div className="h-1.5 w-6 rounded-full bg-blue-600"></div>
              <div className="h-1.5 w-6 rounded-full bg-blue-600"></div>
              <div className="h-1.5 w-6 rounded-full bg-blue-600"></div>
              <div className="h-1.5 w-6 rounded-full bg-blue-600"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-gray-300"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-gray-300"></div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/whatsapp-bot/services"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              ← Previous
            </Link>
            <Link
              href="/whatsapp-bot/review"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-500/40"
            >
              Next → Review & Publish
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
