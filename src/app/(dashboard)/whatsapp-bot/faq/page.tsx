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
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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

      // Get user's clinic
      const { data: clinic, error: clinicError } = await supabase
        .from("clinics")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (clinicError || !clinic) {
        setMessage({
          type: "error",
          text: "Clinic not found.",
        });
        return;
      }

      // Load FAQ data from Supabase
      const { data, error } = await supabase
        .from("clinic_knowledge_base")
        .select("id, question, answer")
        .eq("clinic_id", clinic.id)
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

  useEffect(() => {
    loadFAQs();
  }, []);

  async function addFAQ() {
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

      const { data: clinic, error: clinicError } = await supabase
        .from("clinics")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (clinicError || !clinic) {
        setMessage({
          type: "error",
          text: "Clinic not found.",
        });
        return;
      }

      const { error } = await supabase
        .from("clinic_knowledge_base")
        .insert({
          clinic_id: clinic.id,
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
    if (!confirm("Are you sure you want to delete this FAQ?")) {
      return;
    }

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
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              ❓ FAQ Management
            </h1>

            <p className="mt-2 text-gray-600">
              Manage frequently asked questions for your WhatsApp Bot
            </p>
          </div>

          <div className="rounded-lg bg-white px-4 py-2 shadow-sm border">
            <span className="text-sm text-gray-500">
              Step 4 of 7
            </span>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 rounded-lg border p-4 ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Add FAQ */}
        <div className="mb-8 rounded-xl border border-gray-100 bg-white p-6 shadow-lg">
          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            ➕ Add New FAQ
          </h2>

          <div className="space-y-5">

            {/* Question */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Question *
              </label>

              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Example: What is your consultation fee?"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* Answer */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Answer *
              </label>

              <textarea
                rows={4}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Enter the answer that WhatsApp Bot should provide..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* Add button */}
            <button
              onClick={addFAQ}
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 font-semibold text-white shadow-md transition hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "➕ Add FAQ"}
            </button>
          </div>
        </div>

        {/* FAQ List */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-lg">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              📚 Saved FAQs
            </h2>

            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
              {faqs.length} FAQ{faqs.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="py-10 text-center text-gray-500">
              Loading FAQs...
            </div>
          ) : faqs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-10 text-center">
              <p className="text-gray-500">
                No FAQs added yet.
              </p>

              <p className="mt-1 text-sm text-gray-400">
                Add your first FAQ above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={faq.id}
                  className="rounded-lg border border-gray-200 p-5 transition hover:border-blue-300 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {index + 1}. {faq.question}
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-gray-600">
                        {faq.answer}
                      </p>
                    </div>

                    <button
                      onClick={() => deleteFAQ(faq.id)}
                      className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-6">

          <Link
            href="/whatsapp-bot/services"
            className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            ← Previous: Services
          </Link>

          <Link
            href="/whatsapp-bot/working-hours"
            className="rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-6 py-2.5 font-semibold text-white shadow-md transition hover:from-green-700 hover:to-green-800"
          >
            Next → Working Hours
          </Link>

        </div>
      </div>
    </div>
  );
}
