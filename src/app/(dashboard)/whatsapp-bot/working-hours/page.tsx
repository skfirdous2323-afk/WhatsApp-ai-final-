"use client";

import Link from "next/link";

export default function WorkingHoursPage() {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-8 text-black">
      <div className="mx-auto max-w-5xl rounded-xl border border-gray-200 bg-white p-8 shadow-lg">

        <h1 className="text-3xl font-bold text-black">
          WhatsApp Bot Setup
        </h1>

        <p className="mb-8 text-gray-600">
          Step 4 of 6 – Working Hours
        </p>

        <div className="rounded-xl border border-gray-200 bg-white p-6">

          <h2 className="mb-6 text-xl font-semibold text-black">
            Clinic Working Hours
          </h2>

          <div className="space-y-4">

            {days.map((day) => (
              <div
                key={day}
                className="grid grid-cols-1 items-center gap-4 md:grid-cols-4"
              >
                <div className="font-medium text-black">
                  {day}
                </div>

                <input
                  type="time"
                  className="rounded-lg border border-gray-300 bg-white p-3 text-black"
                />

                <input
                  type="time"
                  className="rounded-lg border border-gray-300 bg-white p-3 text-black"
                />

                <label className="flex items-center gap-2 text-black">
                  <input type="checkbox" />
                  Closed
                </label>
              </div>
            ))}

          </div>

          <div className="mt-8">

            <label className="mb-2 block font-medium text-black">
              Lunch Break (Optional)
            </label>

            <div className="grid gap-4 md:grid-cols-2">

              <input
                type="time"
                className="rounded-lg border border-gray-300 bg-white p-3 text-black"
              />

              <input
                type="time"
                className="rounded-lg border border-gray-300 bg-white p-3 text-black"
              />

            </div>

          </div>

        </div>

        <div className="mt-8 flex justify-between">

          <Link
            href="/whatsapp-bot/services"
            className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-black hover:bg-gray-100"
          >
            ← Previous
          </Link>

          <Link
            href="/whatsapp-bot/appointment-settings"
            className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
          >
            Next → Appointment Settings
          </Link>

        </div>

      </div>
    </div>
  );
}
