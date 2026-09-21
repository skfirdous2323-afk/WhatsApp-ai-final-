"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export default function FAQPage() {
  const supabase = createClient();

  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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

  async function loadFAQs() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage({
          type: "error",
          text: "Please login first.",
        });
        return;
      }

      const clinicId = await getClinicId(user.id);

      let isEnabled = true;
      try {
        const { data: clinic } = await supabase
          .from("clinics")
          .select("faq_enabled")
          .eq("id", clinicId)
          .maybeSingle();

        if (clinic) {
          isEnabled = clinic.faq_enabled !== false;
        }
      } catch (err) {
        console.warn('faq_enabled column not found, defaulting to enabled');
        isEnabled = true;
      }

      if (!isEnabled) {
        setIsEnabled(false);
        setFaqs([]);
        setLoading(false);
        return;
      }

      setIsEnabled(true);

      const { data, error } = await supabase
        .from("clinic_knowledge_base")
        .select("id, question, answer")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("FAQ load error:", error);
        setMessage({
          type: "error",
          text: error.message,
        });
        return;
      }

      setFaqs(data || []);
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: "Failed to load FAQs.",
      });
    } finally {
      setLoading(false);
    }
  }

  const handleToggleFAQ = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage({
          type: "error",
          text: "Please login first.",
        });
        return;
      }

      const clinicId = await getClinicId(user.id);
      const newStatus = !isEnabled;

      const { error } = await supabase
        .from("clinics")
        .update({ faq_enabled: newStatus })
        .eq("id", clinicId);

      if (error) throw error;

      setIsEnabled(newStatus);
      setMessage({
        type: "success",
        text: `FAQ section ${newStatus ? 'enabled' : 'disabled'} successfully`,
      });

      if (newStatus) {
        await loadFAQs();
      } else {
        setFaqs([]);
      }
    } catch (error) {
      console.error('Error toggling FAQ:', error);
      setMessage({
        type: "error",
        text: "Failed to update FAQ section",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadFAQs();
  }, []);

  async function addFAQ() {
    if (!isEnabled) {
      setMessage({
        type: "error",
        text: "FAQ section is disabled. Enable it first.",
      });
      return;
    }

    if (!question.trim()) {
      setMessage({
        type: "error",
        text: "Please enter a question.",
      });
      return;
    }

    if (!answer.trim()) {
      setMessage({
        type: "error",
        text: "Please enter an answer.",
      });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage({
          type: "error",
          text: "Please login first.",
        });
        return;
      }

      const clinicId = await getClinicId(user.id);

      const { error } = await supabase
        .from("clinic_knowledge_base")
        .insert({
          clinic_id: clinicId,
          user_id: user.id,
          question: question.trim(),
          answer: answer.trim(),
        });

      if (error) {
        console.error("FAQ save error:", error);
        setMessage({
          type: "error",
          text: error.message,
        });
        return;
      }

      setQuestion("");
      setAnswer("");

      setMessage({
        type: "success",
        text: "✅ FAQ added successfully!",
      });

      await loadFAQs();
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: "Failed to save FAQ.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteFAQ(id: string) {
    if (!isEnabled) {
      setMessage({
        type: "error",
        text: "FAQ section is disabled. Enable it first.",
      });
      return;
    }

    if (!confirm("Are you sure you want to delete this FAQ?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("clinic_knowledge_base")
        .delete()
        .eq("id", id);

      if (error) {
        setMessage({
          type: "error",
          text: error.message,
        });
        return;
      }

      setFaqs((current) => current.filter((faq) => faq.id !== id));

      setMessage({
        type: "success",
        text: "✅ FAQ deleted successfully.",
      });
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: "Failed to delete FAQ.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="mx-auto max-w-6xl p-4 md:p-6 lg:p-8">

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
              FAQ Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage frequently asked questions for your WhatsApp Bot
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow-md border border-gray-200">
              <span className="text-sm font-medium text-gray-600">FAQ</span>
              <button
                onClick={handleToggleFAQ}
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

            <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800 whitespace-nowrap">
              {faqs.length} FAQ{faqs.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 rounded-xl p-4 shadow-sm ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200"
              : "bg-red-50 border border-red-200"
          }`}>
            <p className={`text-sm font-medium ${
              message.type === "success" ? "text-emerald-800" : "text-red-800"
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
              <h3 className="text-2xl font-bold text-gray-900">FAQ Section Disabled</h3>
              <p className="mt-3 text-gray-500">Toggle the switch above to enable FAQ management</p>
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-500">💡 Tip:</span>
                <span className="text-sm text-gray-600">Enable to add and manage FAQs</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Add FAQ */}
            <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-xl shadow-gray-200/50 border border-gray-100">
              <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                    <span className="text-xl">➕</span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Add New FAQ</h2>
                    <p className="text-xs text-gray-500">Add question & answer for the WhatsApp Bot</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Question <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Example: What is your consultation fee?"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Answer <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Enter the answer that WhatsApp Bot should provide..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition"
                  />
                </div>

                <button
                  onClick={addFAQ}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <span>➕</span>
                      Add FAQ
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* FAQ List */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-gray-200/50 border border-gray-100">
              <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                      <span className="text-xl">📚</span>
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">Saved FAQs</h2>
                      <p className="text-xs text-gray-500">{faqs.length} FAQ{faqs.length !== 1 ? "s" : ""} added</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    {faqs.length} total
                  </span>
                </div>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="py-10 text-center text-gray-500">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    <p className="mt-3 text-sm">Loading FAQs...</p>
                  </div>
                ) : faqs.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-12 text-center">
                    <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                      <span className="text-3xl">📝</span>
                    </div>
                    <p className="text-gray-500 font-medium">No FAQs added yet.</p>
                    <p className="mt-1 text-sm text-gray-400">Add your first FAQ using the form above.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {faqs.map((faq, index) => (
                      <div
                        key={faq.id}
                        className="group rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-blue-300 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-3">
                              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
                                {index + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm md:text-base">
                                  {faq.question}
                                </p>
                                <p className="mt-2 whitespace-pre-wrap text-gray-600 text-sm">
                                  {faq.answer}
                                </p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteFAQ(faq.id)}
                            className="flex-shrink-0 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
              ← Previous: Services
            </Link>
            <Link
              href="/whatsapp-bot/working-hours"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-500/40"
            >
              Next → Working Hours
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
