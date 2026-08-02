"use client";

import Link from "next/link";

export default function AppointmentSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8 text-black">
      <div className="mx-auto max-w-5xl rounded-xl border border-gray-200 bg-white p-8 shadow-lg">

        <h1 className="text-3xl font-bold text-black">
          WhatsApp Bot Setup
        </h1>

        <p className="mb-8 text-gray-600">
          Step 5 of 6 – Appointment Settings
        </p>

        <div className="rounded-xl border border-gray-200 bg-white p-6">

          <div className="mb-6">
            <label className="mb-2 block font-medium text-black">
              Appointment Duration
            </label>

            <select className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black">
              <option>15 Minutes</option>
              <option>20 Minutes</option>
              <option>30 Minutes</option>
              <option>45 Minutes</option>
              <option>60 Minutes</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="mb-2 block font-medium text-black">
              Maximum Appointments Per Day
            </label>

            <input
              type="number"
              placeholder="50"
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-4">

            <label className="flex items-center gap-2 text-black">
              <input type="checkbox" />
              Enable Online Booking
            </label>

            <label className="flex items-center gap-2 text-black">
              <input type="checkbox" />
              Send WhatsApp Reminder
            </label>

            <label className="flex items-center gap-2 text-black">
              <input type="checkbox" />
              Allow Cancellation
            </label>

          </div>

        </div>

        <div className="mt-8 flex justify-between">

          <Link
            href="/whatsapp-bot/working-hours"
            className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-black hover:bg-gray-100"
          >
            ← Previous
          </Link>

          <Link
            href="/whatsapp-bot/review"
            className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
          >
            Next → Review
          </Link>

        </div>

      </div>
    </div>
  );
}
