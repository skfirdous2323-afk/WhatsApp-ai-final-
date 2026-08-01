"use client";

import Link from "next/link";

export default function ServicesPage() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl rounded-xl border bg-white p-8 shadow">

        <h1 className="text-3xl font-bold">
          WhatsApp Bot Setup
        </h1>

        <p className="mb-8 text-gray-500">
          Step 3 of 6 – Services
        </p>

        <div className="rounded-xl border p-6">

          <h2 className="mb-6 text-xl font-semibold">
            Clinic Services
          </h2>

          <div className="grid gap-6 md:grid-cols-2">

            <div>
              <label className="mb-2 block font-medium">
                Service Name *
              </label>
              <input
                type="text"
                placeholder="Dental Cleaning"
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">
                Price
              </label>
              <input
                type="number"
                placeholder="500"
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block font-medium">
                Description
              </label>
              <textarea
                rows={4}
                placeholder="Service description..."
                className="w-full rounded-lg border p-3"
              />
            </div>

          </div>

          <button className="mt-8 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white">
            + Add Another Service
          </button>

        </div>

        <div className="mt-8 flex justify-between">

          <Link
            href="/whatsapp-bot/doctors"
            className="rounded-lg border px-6 py-3 font-semibold"
          >
            ← Previous
          </Link>

          <Link
            href="/whatsapp-bot/working-hours"
            className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white"
          >
            Next → Working Hours
          </Link>

        </div>

      </div>
    </div>
  );
}

