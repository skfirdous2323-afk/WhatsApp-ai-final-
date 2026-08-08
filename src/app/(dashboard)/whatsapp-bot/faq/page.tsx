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

      // Check if FAQ feature is enabled
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

      // Load FAQ data from Supabase
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

  // Toggle FAQ section on/off
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex flex-wrap items-center justify-between gap-3 md:gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              ❓ FAQ Management
            </h1>
            <p className="text-sm text-gray-500">
              Step 4 of 7 – Manage frequently asked questions for your WhatsApp Bot
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {/* Global On/Off Switch */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-full shadow-md border border-gray-200">
              <span className="text-xs md:text-sm font-medium text-gray-600">FAQ</span>
              <button
                onClick={handleToggleFAQ}
                disabled={saving}
                className={`relative inline-flex h-6 w-10 md:h-7 md:w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isEnabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 md:h-5 md:w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                    isEnabled ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-xs md:text-sm font-semibold ${isEnabled ? 'text-green-600' : 'text-red-500'}`}>
                {isEnabled ? 'ON' : 'OFF'}
              </span>
            </div>

            <span className="rounded-full bg-blue-100 px-3 py-1 md:px-4 md:py-2 text-xs md:text-sm font-medium text-blue-800 whitespace-nowrap">
              {faqs.length} FAQ{faqs.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-4 md:mb-6 rounded-lg border p-3 md:p-4 ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Disabled State */}
        {!isEnabled ? (
          <div className="rounded-2xl bg-white p-8 md:p-16 shadow-xl border border-gray-100 text-center">
            <div className="mx-auto max-w-md">
              <div className="w-16 h-16 md:w-24 md:h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <svg className="h-8 w-8 md:h-12 md:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900">FAQ Section Disabled</h3>
              <p className="mt-2 md:mt-3 text-sm md:text-base text-gray-500">Toggle the switch above to enable FAQ management</p>
              <div className="mt-4 md:mt-6 inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-gray-50 rounded-lg">
                <span className="text-xs md:text-sm text-gray-500">💡 Tip:</span>
                <span className="text-xs md:text-sm text-gray-600">Enable to add and manage FAQs</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Add FAQ */}
            <div className="mb-6 md:mb-8 rounded-xl border border-gray-100 bg-white p-4 md:p-6 shadow-lg">
              <h2 className="mb-4 md:mb-5 text-lg md:text-xl font-semibold text-gray-900">
                ➕ Add New FAQ
              </h2>

              <div className="space-y-4 md:space-y-5">
                {/* Question */}
                <div>
                  <label className="mb-1.5 md:mb-2 block text-sm font-medium text-gray-700">
                    Question *
                  </label>
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Example: What is your consultation fee?"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 md:px-4 md:py-3 text-sm md:text-base text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                {/* Answer */}
                <div>
                  <label className="mb-1.5 md:mb-2 block text-sm font-medium text-gray-700">
                    Answer *
                  </label>
                  <textarea
                    rows={4}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Enter the answer that WhatsApp Bot should provide..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 md:px-4 md:py-3 text-sm md:text-base text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                {/* Add button */}
                <button
                  onClick={addFAQ}
                  disabled={saving}
                  className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 md:px-6 md:py-3 text-sm md:text-base font-semibold text-white shadow-md transition hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "➕ Add FAQ"}
                </button>
              </div>
            </div>

            {/* FAQ List */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 md:p-6 shadow-lg">
              <div className="mb-4 md:mb-5 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                  📚 Saved FAQs
                </h2>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs md:text-sm font-medium text-blue-700">
                  {faqs.length} FAQ{faqs.length !== 1 ? "s" : ""}
                </span>
              </div>

              {loading ? (
                <div className="py-8 md:py-10 text-center text-gray-500">
                  Loading FAQs...
                </div>
              ) : faqs.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-8 md:py-10 text-center">
                  <p className="text-gray-500">No FAQs added yet.</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Add your first FAQ above.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {faqs.map((faq, index) => (
                    <div
                      key={faq.id}
                      className="rounded-lg border border-gray-200 p-4 md:p-5 transition hover:border-blue-300 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3 md:gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm md:text-base">
                            {index + 1}. {faq.question}
                          </p>
                          <p className="mt-1 md:mt-2 whitespace-pre-wrap text-gray-600 text-sm md:text-base">
                            {faq.answer}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteFAQ(faq.id)}
                          className="flex-shrink-0 rounded-lg bg-red-50 px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Navigation */}
        <div className="mt-6 md:mt-8 flex flex-wrap items-center justify-between gap-3 md:gap-4 border-t border-gray-200 pt-6">
          <Link
            href="/whatsapp-bot/services"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 md:px-6 md:py-2.5 text-sm md:text-base font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            ← Previous: Services
          </Link>
          <Link
            href="/whatsapp-bot/working-hours"
            className="rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-4 py-2 md:px-6 md:py-2.5 text-sm md:text-base font-semibold text-white shadow-md transition hover:from-green-700 hover:to-green-800"
          >
            Next → Working Hours
          </Link>
        </div>
      </div>
    </div>
  );
}
