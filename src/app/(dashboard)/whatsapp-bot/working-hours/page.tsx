"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface DaySchedule {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breaks: Break[];
}

interface Break {
  id: string;
  start: string;
  end: string;
}

interface SpecialDay {
  id: string;
  date: string;
  reason: string;
  isClosed: boolean;
  openTime?: string;
  closeTime?: string;
}

export default function WorkingHoursPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
      closeTime: "18:00",
      breaks: []
    }))
  );

  const [specialDays, setSpecialDays] = useState<SpecialDay[]>([]);
  const [deletedSpecialDays, setDeletedSpecialDays] = useState<string[]>([]);
  const [newSpecialDay, setNewSpecialDay] = useState<SpecialDay>({
    id: "",
    date: "",
    reason: "",
    isClosed: true,
    openTime: "",
    closeTime: ""
  });

  const [appointmentSettings, setAppointmentSettings] = useState({
    slotDuration: "30",
    maxAppointmentsPerSlot: "1",
    bufferTime: "15",
    bookingNoticeHours: "2",
    allowSameDayBooking: true,
    autoRejectOutsideHours: true
  });

  const [analytics, setAnalytics] = useState({
    workingDays: 0,
    closedDays: 0,
    totalWeeklyHours: 0,
    averageDailyHours: 0
  });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    calculateAnalytics();
  }, [schedule]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Load working hours
      const { data: hoursData, error: hoursError } = await supabase
        .from('working_hours')
        .select('*')
        .eq('user_id', user.id);

      if (!hoursError && hoursData && hoursData.length > 0) {
        const updatedSchedule = schedule.map(day => {
          const existing = hoursData.find(h => h.day === day.day);
          if (existing) {
            return {
              ...day,
              isOpen: existing.is_open,
              openTime: existing.open_time || "09:00",
              closeTime: existing.close_time || "18:00",
              breaks: existing.breaks || []
            };
          }
          return day;
        });
        setSchedule(updatedSchedule);
      }

      // Load special days
      const { data: specialData, error: specialError } = await supabase
        .from('special_days')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date');

      if (!specialError && specialData) {
        setSpecialDays(specialData);
      }

      // Load appointment settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('appointment_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!settingsError && settingsData) {
        setAppointmentSettings({
          slotDuration: settingsData.slot_duration || "30",
          maxAppointmentsPerSlot: settingsData.max_appointments_per_slot || "1",
          bufferTime: settingsData.buffer_time || "15",
          bookingNoticeHours: settingsData.booking_notice_hours || "2",
          allowSameDayBooking: settingsData.allow_same_day_booking !== false,
          autoRejectOutsideHours: settingsData.auto_reject_outside_hours !== false
        });
      }

    } catch (error) {
      console.error('Error loading settings:', error);
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

  const validateBreakTime = (dayIndex: number, breakStart: string, breakEnd: string): boolean => {
    const day = schedule[dayIndex];
    if (!day.isOpen) return true;
    if (!breakStart || !breakEnd) return true;
    return breakStart >= day.openTime && breakEnd <= day.closeTime && breakStart < breakEnd;
  };

  const handleDayToggle = (index: number) => {
    setSchedule(prev => {
      const updated = [...prev];
      updated[index].isOpen = !updated[index].isOpen;
      return updated;
    });
  };

  const handleTimeChange = (index: number, field: 'openTime' | 'closeTime', value: string) => {
    const updated = [...schedule];
    updated[index][field] = value;
    
    // Validate time
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

  const handleBreakAdd = (index: number) => {
    const day = schedule[index];
    if (!day.isOpen) {
      showMessage('error', 'Cannot add break to closed day');
      return;
    }
    
    const defaultStart = day.openTime;
    const defaultEnd = day.closeTime;
    
    setSchedule(prev => {
      const updated = [...prev];
      updated[index].breaks.push({
        id: Date.now().toString(),
        start: defaultStart,
        end: defaultEnd
      });
      return updated;
    });
  };

  const handleBreakRemove = (dayIndex: number, breakIndex: number) => {
    setSchedule(prev => {
      const updated = [...prev];
      updated[dayIndex].breaks.splice(breakIndex, 1);
      return updated;
    });
  };

  const handleBreakTimeChange = (dayIndex: number, breakIndex: number, field: 'start' | 'end', value: string) => {
    const updated = [...schedule];
    const day = updated[dayIndex];
    const breakItem = day.breaks[breakIndex];
    
    const newBreak = { ...breakItem, [field]: value };
    const otherField = field === 'start' ? 'end' : 'start';
    
    // Validate break time
    if (!validateBreakTime(dayIndex, 
      field === 'start' ? value : breakItem.start,
      field === 'end' ? value : breakItem.end
    )) {
      showMessage('error', 'Break must be within working hours and start before end');
      return;
    }
    
    updated[dayIndex].breaks[breakIndex] = newBreak;
    setSchedule(updated);
  };

  const handleSpecialDayAdd = () => {
    if (!newSpecialDay.date || !newSpecialDay.reason) {
      showMessage('error', 'Please fill in date and reason');
      return;
    }

    // Check for duplicate date
    if (specialDays.some(day => day.date === newSpecialDay.date)) {
      showMessage('error', 'This date already has a special day set');
      return;
    }

    setSpecialDays(prev => [...prev, { ...newSpecialDay, id: Date.now().toString() }]);
    setNewSpecialDay({
      id: "",
      date: "",
      reason: "",
      isClosed: true,
      openTime: "",
      closeTime: ""
    });
    showMessage('success', 'Special day added successfully');
  };

  const handleSpecialDayRemove = (id: string) => {
    // Track deleted special days for database cleanup
    setDeletedSpecialDays(prev => [...prev, id]);
    setSpecialDays(prev => prev.filter(day => day.id !== id));
  };

  const handleAppointmentSettingChange = (field: string, value: any) => {
    setAppointmentSettings(prev => ({ ...prev, [field]: value }));
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showMessage('error', 'Please login first');
        return;
      }

      // Validate all times before saving
      for (const day of schedule) {
        if (day.isOpen) {
          if (!validateTime(day.openTime, day.closeTime)) {
            showMessage('error', `Invalid time range for ${day.day}`);
            return;
          }
          for (const breakItem of day.breaks) {
            if (!validateBreakTime(schedule.indexOf(day), breakItem.start, breakItem.end)) {
              showMessage('error', `Invalid break time for ${day.day}`);
              return;
            }
          }
        }
      }

      // Save working hours
      for (const day of schedule) {
        const { error } = await supabase
          .from('working_hours')
          .upsert({
            user_id: user.id,
            day: day.day,
            is_open: day.isOpen,
            open_time: day.openTime,
            close_time: day.closeTime,
            breaks: day.breaks
          }, {
            onConflict: 'user_id,day'
          });

        if (error) throw error;
      }

      // Delete removed special days
      if (deletedSpecialDays.length > 0) {
        const { error: deleteError } = await supabase
          .from('special_days')
          .delete()
          .in('id', deletedSpecialDays);

        if (deleteError) throw deleteError;
        setDeletedSpecialDays([]);
      }

      // Save special days
      for (const day of specialDays) {
        const { error } = await supabase
          .from('special_days')
          .upsert({
            user_id: user.id,
            date: day.date,
            reason: day.reason,
            is_closed: day.isClosed,
            open_time: day.openTime,
            close_time: day.closeTime
          }, {
            onConflict: 'user_id,date'
          });

        if (error) throw error;
      }

      // Save appointment settings
      const { error: settingsError } = await supabase
        .from('appointment_settings')
        .upsert({
          user_id: user.id,
          slot_duration: appointmentSettings.slotDuration,
          max_appointments_per_slot: appointmentSettings.maxAppointmentsPerSlot,
          buffer_time: appointmentSettings.bufferTime,
          booking_notice_hours: appointmentSettings.bookingNoticeHours,
          allow_same_day_booking: appointmentSettings.allowSameDayBooking,
          auto_reject_outside_hours: appointmentSettings.autoRejectOutsideHours
        }, {
          onConflict: 'user_id'
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Loading working hours...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                WhatsApp Bot Setup
              </h1>
              <p className="mt-1 text-gray-600">
                Step 4 of 6 – Working Hours & Settings
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-6 py-2.5 font-semibold text-white hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {saving ? 'Saving...' : '💾 Save All'}
              </button>
            </div>
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

        {/* Analytics Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Working Days</p>
                <p className="mt-2 text-2xl font-bold text-green-600">{analytics.workingDays} / 7</p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Closed Days</p>
                <p className="mt-2 text-2xl font-bold text-red-600">{analytics.closedDays} / 7</p>
              </div>
              <div className="rounded-full bg-red-100 p-3">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Weekly Hours</p>
                <p className="mt-2 text-2xl font-bold text-blue-600">{analytics.totalWeeklyHours}h</p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Daily Hours</p>
                <p className="mt-2 text-2xl font-bold text-purple-600">{analytics.averageDailyHours}h</p>
              </div>
              <div className="rounded-full bg-purple-100 p-3">
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
            <div className="rounded-xl bg-white p-6 shadow-xl border border-gray-100">
              <h2 className="mb-6 text-xl font-semibold text-gray-900">
                Weekly Schedule
              </h2>

              <div className="space-y-4">
                {schedule.map((day, index) => (
                  <div key={day.day} className="rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-colors">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-3 min-w-[120px]">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={day.isOpen}
                            onChange={() => handleDayToggle(index)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className={`font-medium ${day.isOpen ? 'text-gray-900' : 'text-gray-400'}`}>
                            {day.day}
                          </span>
                        </label>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          day.isOpen 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {day.isOpen ? 'Open' : 'Closed'}
                        </span>
                      </div>

                      {day.isOpen && (
                        <>
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={day.openTime}
                              onChange={(e) => handleTimeChange(index, 'openTime', e.target.value)}
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                            <span className="text-gray-400">→</span>
                            <input
                              type="time"
                              value={day.closeTime}
                              onChange={(e) => handleTimeChange(index, 'closeTime', e.target.value)}
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                          </div>

                          {/* Breaks */}
                          <div className="flex-1">
                            {day.breaks.map((breakItem, breakIndex) => (
                              <div key={breakItem.id} className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-gray-500">Break:</span>
                                <input
                                  type="time"
                                  value={breakItem.start}
                                  onChange={(e) => handleBreakTimeChange(index, breakIndex, 'start', e.target.value)}
                                  className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                />
                                <span className="text-gray-400 text-sm">→</span>
                                <input
                                  type="time"
                                  value={breakItem.end}
                                  onChange={(e) => handleBreakTimeChange(index, breakIndex, 'end', e.target.value)}
                                  className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                />
                                <button
                                  onClick={() => handleBreakRemove(index, breakIndex)}
                                  className="text-red-500 hover:text-red-700 text-sm"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => handleBreakAdd(index)}
                              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                            >
                              + Add Break
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Days */}
            <div className="mt-8 rounded-xl bg-white p-6 shadow-xl border border-gray-100">
              <h2 className="mb-6 text-xl font-semibold text-gray-900">
                Special Days
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newSpecialDay.date}
                    onChange={(e) => setNewSpecialDay(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Reason
                  </label>
                  <input
                    type="text"
                    value={newSpecialDay.reason}
                    onChange={(e) => setNewSpecialDay(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Holiday, Festival, etc."
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newSpecialDay.isClosed}
                      onChange={(e) => setNewSpecialDay(prev => ({ ...prev, isClosed: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Closed</span>
                  </label>
                  {!newSpecialDay.isClosed && (
                    <>
                      <input
                        type="time"
                        value={newSpecialDay.openTime}
                        onChange={(e) => setNewSpecialDay(prev => ({ ...prev, openTime: e.target.value }))}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                      <input
                        type="time"
                        value={newSpecialDay.closeTime}
                        onChange={(e) => setNewSpecialDay(prev => ({ ...prev, closeTime: e.target.value }))}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </>
                  )}
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleSpecialDayAdd}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    + Add Special Day
                  </button>
                </div>
              </div>

              {specialDays.length > 0 && (
                <div className="mt-4 space-y-2">
                  {specialDays.map((day) => (
                    <div key={day.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                      <div>
                        <span className="font-medium text-gray-900">{day.date}</span>
                        <span className="ml-3 text-sm text-gray-600">{day.reason}</span>
                        <span className={`ml-3 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          day.isClosed ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {day.isClosed ? 'Closed' : `Open ${formatTime(day.openTime || '')} - ${formatTime(day.closeTime || '')}`}
                        </span>
                      </div>
                      <button
                        onClick={() => handleSpecialDayRemove(day.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Settings & Preview */}
          <div className="lg:col-span-1">
            {/* Appointment Settings */}
            <div className="rounded-xl bg-white p-6 shadow-xl border border-gray-100">
              <h2 className="mb-6 text-xl font-semibold text-gray-900">
                ⚙️ Appointment Settings
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Slot Duration
                  </label>
                  <select
                    value={appointmentSettings.slotDuration}
                    onChange={(e) => handleAppointmentSettingChange('slotDuration', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Max Appointments per Slot
                  </label>
                  <input
                    type="number"
                    value={appointmentSettings.maxAppointmentsPerSlot}
                    onChange={(e) => handleAppointmentSettingChange('maxAppointmentsPerSlot', e.target.value)}
                    min="1"
                    max="10"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Buffer Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={appointmentSettings.bufferTime}
                    onChange={(e) => handleAppointmentSettingChange('bufferTime', e.target.value)}
                    min="0"
                    max="60"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Booking Notice (hours before)
                  </label>
                  <input
                    type="number"
                    value={appointmentSettings.bookingNoticeHours}
                    onChange={(e) => handleAppointmentSettingChange('bookingNoticeHours', e.target.value)}
                    min="0"
                    max="48"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={appointmentSettings.allowSameDayBooking}
                      onChange={(e) => handleAppointmentSettingChange('allowSameDayBooking', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Allow Same-Day Booking</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={appointmentSettings.autoRejectOutsideHours}
                      onChange={(e) => handleAppointmentSettingChange('autoRejectOutsideHours', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Auto-Reject Outside Hours</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="mt-8 rounded-xl bg-white p-6 shadow-xl border border-gray-100">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                📋 Live Preview
              </h2>

              <div className="space-y-2">
                {schedule.slice(0, 5).map((day) => (
                  <div key={day.day} className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-sm font-medium text-gray-700">{day.day}</span>
                    {day.isOpen ? (
                      <span className="text-sm text-green-600">
                        🟢 {formatTime(day.openTime)} – {formatTime(day.closeTime)}
                      </span>
                    ) : (
                      <span className="text-sm text-red-600">🔴 Closed</span>
                    )}
                  </div>
                ))}
                {schedule.length > 5 && (
                  <div className="text-center text-sm text-gray-500">
                    +{schedule.length - 5} more days
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Step 4 of 6</span>
            <div className="flex gap-1">
              <div className="h-2 w-2 rounded-full bg-blue-600"></div>
              <div className="h-2 w-2 rounded-full bg-blue-600"></div>
              <div className="h-2 w-2 rounded-full bg-blue-600"></div>
              <div className="h-2 w-8 rounded-full bg-blue-600"></div>
              <div className="h-2 w-2 rounded-full bg-gray-300"></div>
              <div className="h-2 w-2 rounded-full bg-gray-300"></div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/whatsapp-bot/services"
              className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ← Previous
            </Link>
            <Link


href="/whatsapp-bot/review-and-publish"


              className="rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-6 py-2.5 font-semibold text-white hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg"
            >
              Next → Review & Publish


            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
