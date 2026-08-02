"use client";

import Link from "next/link";

export default function ReviewPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8 text-black">
      <div className="mx-auto max-w-5xl rounded-xl border border-gray-200 bg-white p-8 shadow-lg">

        <h1 className="text-3xl font-bold text-black">
          WhatsApp Bot Setup
        </h1>

        <p className="mb-8 text-gray-600">
          Step 6 of 6 – Review & Publish
        </p>

        <div className="rounded-xl border border-gray-200 bg-white p-6">

          <h2 className="mb-6 text-xl font-semibold text-black">
            Review Your Bot Configuration
          </h2>

          <div className="space-y-4">

            <div className="rounded-lg border border-gray-300 bg-white p-4 text-black">
              ✅ Clinic Information
            </div>

            <div className="rounded-lg border border-gray-300 bg-white p-4 text-black">
              ✅ Doctors
            </div>

            <div className="rounded-lg border border-gray-300 bg-white p-4 text-black">
              ✅ Services
            </div>

            <div className="rounded-lg border border-gray-300 bg-white p-4 text-black">
              ✅ Working Hours
            </div>

            <div className="rounded-lg border border-gray-300 bg-white p-4 text-black">
              ✅ Appointment Settings
            </div>

          </div>

        </div>

        <div className="mt-8 flex justify-between">

          <Link
            href="/whatsapp-bot/appointment-settings"
            className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-black hover:bg-gray-100"
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
