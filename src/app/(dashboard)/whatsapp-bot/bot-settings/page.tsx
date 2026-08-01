"use client";

import Link from "next/link";

export default function BotSettingsPage() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl rounded-xl border bg-white p-8 shadow">

        <h1 className="text-3xl font-bold">
          WhatsApp Bot Settings
        </h1>

        <p className="mb-8 text-gray-500">
          Configure your clinic chatbot
        </p>

        <div className="grid gap-6">

          <div>
            <label className="mb-2 block font-medium">
              Welcome Message
            </label>

            <textarea
              rows={4}
              className="w-full rounded-lg border p-3"
              placeholder="Welcome to our clinic. How can we help you today?"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Language
            </label>

            <select className="w-full rounded-lg border p-3">
              <option>English</option>
              <option>Hindi</option>
              <option>Bengali</option>
            </select>
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" />
            Enable AI Replies
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" />
            Enable Appointment Booking
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" />
            Enable FAQ Replies
          </label>

        </div>

        <div className="mt-8 flex justify-between">

          <Link
            href="/whatsapp-bot/review"
            className="rounded-lg border px-6 py-3 font-semibold"
          >
            ← Previous
          </Link>

          <button className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white">
            Save Bot Settings
          </button>

        </div>

      </div>
    </div>
  );
}

