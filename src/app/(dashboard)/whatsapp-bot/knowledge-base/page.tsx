"use client";

import Link from "next/link";

export default function KnowledgeBasePage() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl rounded-xl border bg-white p-8 shadow">

        <h1 className="text-3xl font-bold">
          AI Knowledge Base
        </h1>

        <p className="mb-8 text-gray-500">
          Train your WhatsApp AI Bot with clinic information
        </p>

        <div className="space-y-6">

          <div>
            <label className="mb-2 block font-medium">
              Welcome Message
            </label>

            <textarea
              rows={3}
              className="w-full rounded-lg border p-3"
              placeholder="Welcome to our clinic..."
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Frequently Asked Questions
            </label>

            <textarea
              rows={5}
              className="w-full rounded-lg border p-3"
              placeholder="Q: What are your timings?&#10;A: 9 AM to 8 PM"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Treatments & Services
            </label>

            <textarea
              rows={5}
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Pricing Information
            </label>

            <textarea
              rows={4}
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Clinic Rules
            </label>

            <textarea
              rows={4}
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Emergency Contact
            </label>

            <input
              type="text"
              placeholder="+91XXXXXXXXXX"
              className="w-full rounded-lg border p-3"
            />
          </div>

        </div>

        <div className="mt-8 flex justify-between">

          <Link
            href="/whatsapp-bot/bot-settings"
            className="rounded-lg border px-6 py-3 font-semibold"
          >
            ← Previous
          </Link>

          <button
            className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white"
          >
            🤖 Train AI Bot
          </button>

        </div>

      </div>
    </div>
  );
}
