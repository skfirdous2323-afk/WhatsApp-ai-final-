"use client";

import Link from "next/link";

export default function WorkingHoursPage() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl rounded-xl border bg-white p-8 shadow">

        <h1 className="text-3xl font-bold">
          WhatsApp Bot Setup
        </h1>

        <p className="mb-8 text-gray-500">
          Step 4 of 6 – Working Hours
        </p>

        <div className="rounded-xl border p-6">

          <h2 className="mb-6 text-xl font-semibold">
            Clinic Working Hours
          </h2>

          <div className="space-y-4">

            {[
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ].map((day) => (
              <div
                key={day}
                className="grid grid-cols-1 gap-4 md:grid-cols-4 items-center"
              >
                <div className="font-medium">{day}</div>

                <input
                  type="time"
                  className="rounded-lg border p-3"
                />

                <input
                  type="time"
                  className="rounded-lg border p-3"
                />

                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  Closed
                </label>
              </div>
            ))}

          </div>

          <div className="mt-8">
            <label className="mb-2 block font-medium">
              Lunch Break (Optional)
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="time"
                className="rounded-lg border p-3"
              />

              <input
                type="time"
                className="rounded-lg border p-3"
              />
            </div>
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
            href="/whatsapp-bot/appointment-settings"
            className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white"
          >
            Next → Appointment Settings
          </Link>

        </div>

      </div>
    </div>
  );
}
