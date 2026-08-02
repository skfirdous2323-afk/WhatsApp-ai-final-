"use client";

import Link from "next/link";

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8 text-black">
      <div className="mx-auto max-w-5xl rounded-xl border border-gray-200 bg-white p-8 shadow-lg">

        <h1 className="text-3xl font-bold text-black">
          WhatsApp Bot Setup
        </h1>

        <p className="mb-8 text-gray-600">
          Step 3 of 6 – Services
        </p>

        <div className="rounded-xl border border-gray-200 bg-white p-6">

          <h2 className="mb-6 text-xl font-semibold text-black">
            Clinic Services
          </h2>

          <div className="grid gap-6 md:grid-cols-2">

            <div>
              <label className="mb-2 block font-medium text-black">
                Service Name *
              </label>

              <input
                type="text"
                placeholder="Dental Cleaning"
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black placeholder:text-gray-500"
              />
            </div>

            <div>
              <label className="mb-2 block font-medium text-black">
                Price
              </label>

              <input
                type="number"
                placeholder="500"
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black placeholder:text-gray-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block font-medium text-black">
                Description
              </label>

              <textarea
                rows={4}
                placeholder="Service description..."
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black placeholder:text-gray-500"
              />
            </div>

          </div>

          <button
            className="mt-8 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            + Add Another Service
          </button>

        </div>

        <div className="mt-8 flex justify-between">

          <Link
            href="/whatsapp-bot/doctors"
            className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-black hover:bg-gray-100"
          >
            ← Previous
          </Link>

          <Link
            href="/whatsapp-bot/working-hours"
            className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
          >
            Next → Working Hours
          </Link>

        </div>

      </div>
    </div>
  );
}
