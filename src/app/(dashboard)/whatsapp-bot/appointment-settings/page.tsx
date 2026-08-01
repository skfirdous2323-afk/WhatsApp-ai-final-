"use client";

import Link from "next/link";

export default function AppointmentSettingsPage() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl rounded-xl border bg-white p-8 shadow">

        <h1 className="text-3xl font-bold">
          WhatsApp Bot Setup
        </h1>

        <p className="mb-8 text-gray-500">
          Step 5 of 6 – Appointment Settings
        </p>

        <div className="rounded-xl border p-6">

          <div className="mb-6">
            <label className="mb-2 block font-medium">
              Appointment Duration
            </label>

            <select className="w-full rounded-lg border p-3">
              <option>15 Minutes</option>
              <option>20 Minutes</option>
              <option>30 Minutes</option>
              <option>45 Minutes</option>
              <option>60 Minutes</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="mb-2 block font-medium">
              Maximum Appointments Per Day
            </label>

            <input
              type="number"
              placeholder="50"
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" />
              Enable Online Booking
            </label>

            <label className="flex items-center gap-2">
              <input type="checkbox" />
              Send WhatsApp Reminder
            </label>

            <label className="flex items-center gap-2">
              <input type="checkbox" />
              Allow Cancellation
            </label>
          </div>

        </div>

        <div className="mt-8 flex justify-between">

          <Link
            href="/whatsapp-bot/services"
            className="rounded-lg border px-6 py-3 font-semibold"
          >
            ← Previous
          </Link>

          <Link
            href="/whatsapp-bot/review"
            className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white"
          >
            Next → Review
          </Link>

        </div>

      </div>
    </div>
  );
}
