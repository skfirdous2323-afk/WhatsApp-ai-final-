"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  required: boolean;
}

interface SummaryStats {
  totalDoctors: number;
  totalServices: number;
  workingDays: number;
  botStatus: "Ready" | "Incomplete" | "Not Configured" | "Published";
  completionPercentage: number;
  lastUpdated: string;
  clinicName: string;
  whatsappNumber: string;
}

export default function ReviewPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [summary, setSummary] = useState<SummaryStats>({
    totalDoctors: 0,
    totalServices: 0,
    workingDays: 0,
    botStatus: "Not Configured",
    completionPercentage: 0,
    lastUpdated: new Date().toLocaleString(),
    clinicName: "",
    whatsappNumber: ""
  });

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: "clinic", label: "Business Information", completed: false, required: true },
    { id: "doctors", label: "Doctors", completed: false, required: true },
    { id: "services", label: "Services", completed: false, required: true },
    { id: "working-hours", label: "Working Hours", completed: false, required: true },
    { id: "welcome-message", label: "Welcome Message", completed: false, required: false },
    { id: "faq", label: "FAQ", completed: false, required: false },
    { id: "ai-settings", label: "AI Settings", completed: false, required: false },
    { id: "whatsapp-connected", label: "WhatsApp Connected", completed: false, required: true },
    { id: "webhook-connected", label: "Meta Webhook Connected", completed: false, required: true },
    { id: "phone-verified", label: "Phone Number Verified", completed: false, required: true },
  ]);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Load clinic info
      const { data: clinic } = await supabase
        .from('clinics')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Load doctors
      const { data: doctors } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', user.id);

      // Load services
      const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id);

      // Load working hours
      const { data: workingHours } = await supabase
        .from('working_hours')
        .select('*')
        .eq('user_id', user.id);

      // Load welcome message
      const { data: welcomeMessage } = await supabase
        .from('clinic_settings')
        .select('welcome_message')
        .eq('user_id', user.id)
        .single();

      // Load FAQ
      const { data: faq } = await supabase
        .from('faq')
        .select('*')
        .eq('user_id', user.id);

      // Load AI settings
      const { data: aiSettings } = await supabase
        .from('ai_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Update summary
      const workingDays = workingHours?.filter(h => h.is_open).length || 0;
const hasDoctors = (doctors?.length ?? 0) > 0;
const hasServices = (services?.length ?? 0) > 0;

const hasClinic = !!clinic?.clinic_name;

const hasWhatsApp = !!clinic?.whatsapp_number;
const hasWelcome = !!welcomeMessage?.welcome_message;
const hasFaq = (faq?.length ?? 0) > 0;
const hasAI = !!aiSettings?.is_enabled;


      // Check if bot is already published
      const botStatus = clinic?.bot_status === 'published' ? 'Published' : 
        hasClinic && hasDoctors && hasServices && workingDays > 0 && hasWhatsApp ? "Ready" : "Incomplete";

      setIsPublished(clinic?.bot_status === 'published');

      setSummary({
        totalDoctors: doctors?.length || 0,
        totalServices: services?.length || 0,
        workingDays: workingDays,
        botStatus: botStatus as any,
        completionPercentage: calculateCompletion(hasClinic, hasDoctors, hasServices, workingDays > 0, hasWhatsApp, hasWelcome, hasFaq, hasAI),
        lastUpdated: new Date().toLocaleString(),
        clinicName: clinic?.clinic_name || "",
        whatsappNumber: clinic?.whatsapp_number || ""
      });

      // Update checklist with all items
      const updatedChecklist = checklist.map(item => {
        switch(item.id) {
          case "clinic":
            return { ...item, completed: !!clinic?.clinic_name };
          case "doctors":
            return { ...item, completed: hasDoctors };
          case "services":
            return { ...item, completed: hasServices };
          case "working-hours":
            return { ...item, completed: workingDays > 0 };
          case "welcome-message":
            return { ...item, completed: !!welcomeMessage?.welcome_message };
          case "faq":
            return { ...item, completed: hasFaq };
          case "ai-settings":
            return { ...item, completed: hasAI };
          case "whatsapp-connected":
            return { ...item, completed: !!clinic?.whatsapp_number };
          case "webhook-connected":
            return { ...item, completed: !!clinic?.webhook_configured };
          case "phone-verified":
            return { ...item, completed: !!clinic?.phone_verified };
          default:
            return item;
        }
      });
      setChecklist(updatedChecklist);

      // Validate
      const errors: string[] = [];
      if (!clinic?.clinic_name) errors.push("❌ Business name missing");
      if (!hasDoctors) errors.push("❌ No doctors added");
      if (!hasServices) errors.push("❌ No services added");
      if (workingDays === 0) errors.push("❌ Working hours not configured");
      if (!clinic?.whatsapp_number) errors.push("❌ WhatsApp not connected");
      if (!clinic?.webhook_configured) errors.push("❌ Webhook not configured");
      if (!clinic?.phone_verified) errors.push("❌ Phone number not verified");
      setValidationErrors(errors);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletion = (
    hasClinic: boolean, 
    hasDoctors: boolean, 
    hasServices: boolean, 
    hasHours: boolean,
    hasWhatsApp: boolean,
    hasWelcome: boolean,
    hasFaq: boolean,
    hasAI: boolean
  ) => {
    const total = 8;
    let completed = 0;
    if (hasClinic) completed++;
    if (hasDoctors) completed++;
    if (hasServices) completed++;
    if (hasHours) completed++;
    if (hasWhatsApp) completed++;
    if (hasWelcome) completed++;
    if (hasFaq) completed++;
    if (hasAI) completed++;
    return Math.round((completed / total) * 100);
  };

  const handlePublish = async () => {
    if (validationErrors.length > 0) {
      setMessage({ 
        type: 'error', 
        text: `Cannot publish: ${validationErrors.join(', ')}` 
      });
      return;
    }

    setPublishing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage({ type: 'error', text: 'Please login first' });
        return;
      }

      // Update bot status
      const { error } = await supabase
        .from('clinics')
        .update({ 
          bot_status: 'published',
          published_at: new Date().toISOString(),
          webhook_configured: true,
          phone_verified: true
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setIsPublished(true);
      setMessage({ type: 'success', text: '🎉 WhatsApp Bot published successfully!' });
      
      // Update summary
      setSummary(prev => ({ ...prev, botStatus: "Published" }));

    } catch (error) {
      console.error('Error publishing:', error);
      setMessage({ type: 'error', text: 'Failed to publish bot' });
    } finally {
      setPublishing(false);
    }
  };

  const handleSaveDraft = async () => {
    setPublishing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage({ type: 'error', text: 'Please login first' });
        return;
      }

      const { error } = await supabase
        .from('clinics')
        .update({ 
          bot_status: 'draft',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setMessage({ type: 'success', text: '📝 Draft saved successfully!' });

    } catch (error) {
      console.error('Error saving draft:', error);
      setMessage({ type: 'error', text: 'Failed to save draft' });
    } finally {
      setPublishing(false);
    }
  };

  const handleTestBot = () => {
    // Check if test route exists
    const testRoute = '/whatsapp-bot/test';
    fetch(testRoute, { method: 'HEAD' })
      .then(() => {
        window.open(testRoute, '_blank');
      })
      .catch(() => {
        setMessage({ type: 'error', text: 'Test bot route not available yet' });
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Loading review data...</p>
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
                Step 6 of 6 – Review & Publish
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                summary.botStatus === "Published" 
                  ? 'bg-green-100 text-green-800' 
                  : summary.botStatus === "Ready"
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {summary.botStatus === "Published" ? '✅ Published' : 
                 summary.botStatus === "Ready" ? '✅ Ready' : '⚠️ Incomplete'}
              </span>
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

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Doctors</p>
                    <p className="mt-2 text-2xl font-bold text-blue-600">{summary.totalDoctors}</p>
                  </div>
                  <div className="rounded-full bg-blue-100 p-3">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Services</p>
                    <p className="mt-2 text-2xl font-bold text-purple-600">{summary.totalServices}</p>
                  </div>
                  <div className="rounded-full bg-purple-100 p-3">
                    <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Working Days</p>
                    <p className="mt-2 text-2xl font-bold text-green-600">{summary.workingDays} / 7</p>
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
                    <p className="text-sm font-medium text-gray-500">Completion</p>
                    <p className="mt-2 text-2xl font-bold text-orange-600">{summary.completionPercentage}%</p>
                  </div>
                  <div className="rounded-full bg-orange-100 p-3">
                    <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6 rounded-xl bg-white p-4 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Setup Progress</span>
                <span className="text-sm font-bold text-blue-600">{summary.completionPercentage}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                  style={{ width: `${summary.completionPercentage}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Checklist */}
            <div className="mt-8 rounded-xl bg-white p-6 shadow-xl border border-gray-100">
              <h2 className="mb-6 text-xl font-semibold text-gray-900">
                ✅ Configuration Checklist
              </h2>

              <div className="grid gap-2 md:grid-cols-2">
                {checklist.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg ${
                        item.completed ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {item.completed ? '🟢' : '🔴'}
                      </span>
                      <span className={`text-sm ${
                        item.completed ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {item.label}
                        {item.required && <span className="ml-1 text-red-500">*</span>}
                      </span>
                    </div>
                    <span className={`text-xs font-medium ${
                      item.completed ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.completed ? 'Complete' : 'Missing'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="mt-8 rounded-xl bg-red-50 p-6 border border-red-200">
                <h3 className="text-sm font-semibold text-red-800">⚠️ Issues to Fix</h3>
                <ul className="mt-2 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-sm text-red-600">{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Publish Section */}
            <div className="mt-8 rounded-xl bg-white p-6 shadow-xl border border-gray-100">
              <h2 className="mb-6 text-xl font-semibold text-gray-900">
                🚀 Publish Section
              </h2>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handlePublish}
                  disabled={publishing || validationErrors.length > 0 || isPublished}
                  className={`flex-1 min-w-[150px] rounded-lg px-6 py-3 font-semibold text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                    isPublished 
                      ? 'bg-green-600 cursor-default'
                      : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                  }`}
                >
                  {publishing ? 'Publishing...' : 
                   isPublished ? '✅ Published' : '🚀 Publish WhatsApp Bot'}
                </button>

                <button
                  onClick={handleSaveDraft}
                  disabled={publishing}
                  className="flex-1 min-w-[150px] rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  💾 Save as Draft
                </button>

                <button
                  onClick={handleTestBot}
                  disabled={validationErrors.length > 0 || !isPublished}
                  className={`flex-1 min-w-[150px] rounded-lg px-6 py-3 font-semibold text-white transition-colors disabled:opacity-50 ${
                    isPublished 
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  🧪 Test Bot
                </button>
              </div>

              <div className="mt-4 rounded-lg bg-blue-50 p-3">
                <p className="text-xs text-blue-800">
                  💡 Last updated: {summary.lastUpdated}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Live Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 rounded-xl bg-white p-6 shadow-xl border border-gray-100">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                📱 WhatsApp Preview
              </h2>

              <div className="rounded-lg bg-gray-100 p-4">
                <div className="rounded-lg bg-white p-4 shadow-lg">
                  {/* Chat Header */}
                  <div className="mb-4 flex items-center gap-3 border-b border-gray-200 pb-3">
                    <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">
                      {summary.clinicName ? summary.clinicName.charAt(0).toUpperCase() : 'Z'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {summary.clinicName || 'ZIVEXO Clinic'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {summary.botStatus === "Published" ? '🟢 Online' : '⚪ Offline'}
                      </p>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="space-y-3">
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-lg bg-gray-200 px-3 py-2">
                        <p className="text-sm text-gray-800">👤 Hi</p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-lg bg-green-600 px-3 py-2">
                        <p className="text-sm text-white">
                          🤖 Welcome to {summary.clinicName || 'ZIVEXO Clinic'}.
                        </p>
                        <div className="mt-2 space-y-1 text-xs text-green-100">
                          <p>1️⃣ Book Appointment</p>
                          <p>2️⃣ Doctors ({summary.totalDoctors})</p>
                          <p>3️⃣ Services ({summary.totalServices})</p>
                          <p>4️⃣ Working Hours ({summary.workingDays} days)</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-lg bg-gray-200 px-3 py-2">
                        <p className="text-xs text-gray-500">
                          Bot is {summary.botStatus === "Published" ? '🟢 Active' : '🔴 Inactive'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center text-xs text-gray-500">
                  <p>💡 Preview conversation flow</p>
                  <p className="mt-1">Bot status: {summary.botStatus}</p>
                  {summary.whatsappNumber && (
                    <p className="mt-1 text-green-600">📱 {summary.whatsappNumber}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Step 6 of 6</span>
            <div className="flex gap-1">
              <div className="h-2 w-2 rounded-full bg-blue-600"></div>
              <div className="h-2 w-2 rounded-full bg-blue-600"></div>
              <div className="h-2 w-2 rounded-full bg-blue-600"></div>
              <div className="h-2 w-2 rounded-full bg-blue-600"></div>
              <div className="h-2 w-2 rounded-full bg-blue-600"></div>
              <div className="h-2 w-8 rounded-full bg-blue-600"></div>
            </div>
          </div>

          <Link
            href="/whatsapp-bot/working-hours"
            className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ← Previous
          </Link>
        </div>
      </div>
    </div>
  );
}
