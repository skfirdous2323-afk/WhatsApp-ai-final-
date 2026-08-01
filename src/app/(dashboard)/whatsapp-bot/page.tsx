"use client";

import Link from "next/link";

export default function WhatsAppBotPage() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl rounded-xl border bg-white p-8 shadow">
        <h1 className="mb-2 text-3xl font-bold">
          WhatsApp Bot Setup
        </h1>

        <p className="mb-8 text-gray-500">
          Step 1 of 6 – Clinic Information
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block font-medium">
              Clinic Name *
            </label>
            <input
              type="text"
              placeholder="Smile Care Dental Clinic"
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Clinic Logo
            </label>
            <input
              type="file"
              className="w-full rounded-lg border p-2"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Clinic Type
            </label>

            <select className="w-full rounded-lg border p-3">
              <option>Dental</option>
              <option>General</option>
              <option>Eye</option>
              <option>Skin</option>
              <option>ENT</option>
              <option>Orthopedic</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Doctor Name *
            </label>

            <input
              type="text"
              placeholder="Dr. John Smith"
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              WhatsApp Number *
            </label>

            <input
              type="text"
              placeholder="+91XXXXXXXXXX"
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Phone Number
            </label>

            <input
              type="text"
              placeholder="+91XXXXXXXXXX"
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Email
            </label>

            <input
              type="email"
              placeholder="clinic@email.com"
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Address *
            </label>

            <textarea
              rows={3}
              placeholder="Clinic Address"
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block font-medium">
              Google Maps Link
            </label>

            <input
              type="text"
              placeholder="https://maps.google.com/..."
              className="w-full rounded-lg border p-3"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          <button className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700">
            Save Clinic Information
          </button>

          <Link
            href="/whatsapp-bot/doctors"
            className="rounded-lg border border-green-600 px-6 py-3 font-semibold text-green-600 hover:bg-green-50"
          >
            Next → Doctors
          </Link>
        </div>
      </div>
    </div>
  );
}
