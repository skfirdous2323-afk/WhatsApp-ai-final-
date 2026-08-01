"use client";

import Link from "next/link";

export default function ReviewPage() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl rounded-xl border bg-white p-8 shadow">

        <h1 className="text-3xl font-bold">
          WhatsApp Bot Setup
        </h1>

        <p className="mb-8 text-gray-500">
          Step 6 of 6 – Review & Publish
        </p>

        <div className="rounded-xl border p-6">

          <h2 className="mb-6 text-xl font-semibold">
            Review Your Bot Configuration
          </h2>

          <div className="space-y-4">

            <div className="rounded-lg border p-4">
              ✅ Clinic Information
            </div>

            <div className="rounded-lg border p-4">
              ✅ Doctors
            </div>

            <div className="rounded-lg border p-4">
              ✅ Services
            </div>

            <div className="rounded-lg border p-4">
              ✅ Working Hours
            </div>

            <div className="rounded-lg border p-4">
              ✅ Appointment Settings
            </div>

          </div>

        </div>

        <div className="mt-8 flex justify-between">

          <Link
            href="/whatsapp-bot/appointment-settings"
            className="rounded-lg border px-6 py-3 font-semibold"
          >
            ← Previous
          </Link>

          <button
            className="rounded-lg bg-green-600 px-8 py-3 font-semibold text-white hover:bg-green-700"
          >
            🚀 Publish WhatsApp Bot
          </button>

        </div>

      </div>
    </div>
  );
}
