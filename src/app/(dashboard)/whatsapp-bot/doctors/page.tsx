"use client";

import Link from "next/link";

export default function DoctorsPage() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl rounded-xl border bg-white p-8 shadow">

        <h1 className="text-3xl font-bold">
          WhatsApp Bot Setup
        </h1>

        <p className="mb-8 text-gray-500">
          Step 2 of 6 – Doctors
        </p>

        <div className="rounded-xl border p-6">

          <h2 className="mb-6 text-xl font-semibold">
            Doctor Information
          </h2>

          <div className="grid gap-6 md:grid-cols-2">

            <div>
              <label className="mb-2 block font-medium">
                Doctor Name *
              </label>

              <input
                type="text"
                placeholder="Dr. Rahul Sharma"
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">
                Specialization *
              </label>

              <select className="w-full rounded-lg border p-3">
                <option>General Physician</option>
                <option>Dental</option>
                <option>Eye Specialist</option>
                <option>Skin Specialist</option>
                <option>Cardiologist</option>
                <option>Orthopedic</option>
                <option>ENT</option>
                <option>Pediatrician</option>
                <option>Gynecologist</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block font-medium">
                Qualification
              </label>

              <input
                type="text"
                placeholder="MBBS, BDS, MD"
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">
                Experience
              </label>

              <input
                type="text"
                placeholder="10 Years"
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">
                Consultation Fee
              </label>

              <input
                type="number"
                placeholder="500"
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">
                Doctor Photo
              </label>

              <input
                type="file"
                className="w-full rounded-lg border p-2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block font-medium">
                Available Days
              </label>

              <div className="grid grid-cols-4 gap-3">

                <label><input type="checkbox" /> Monday</label>
                <label><input type="checkbox" /> Tuesday</label>
                <label><input type="checkbox" /> Wednesday</label>
                <label><input type="checkbox" /> Thursday</label>
                <label><input type="checkbox" /> Friday</label>
                <label><input type="checkbox" /> Saturday</label>
                <label><input type="checkbox" /> Sunday</label>

              </div>
            </div>

            <div>
              <label className="mb-2 block font-medium">
                Start Time
              </label>

              <input
                type="time"
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">
                End Time
              </label>

              <input
                type="time"
                className="w-full rounded-lg border p-3"
              />
            </div>

          </div>

          <button className="mt-8 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white">
            + Add Another Doctor
          </button>

        </div>

        <div className="mt-8 flex justify-between">

          <Link
            href="/whatsapp-bot"
            className="rounded-lg border px-6 py-3 font-semibold"
          >
            ← Previous
          </Link>

          <Link
            href="/whatsapp-bot/services"
            className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white"
          >
            Next → Services
          </Link>

        </div>

      </div>
    </div>
  );
}
