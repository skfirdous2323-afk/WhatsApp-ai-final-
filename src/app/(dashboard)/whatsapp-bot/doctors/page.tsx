"use client";

import { useState } from "react";
import Link from "next/link";

export default function DoctorsPage() {
  const [doctorName, setDoctorName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [qualification, setQualification] = useState("");
  const [experience, setExperience] = useState("");
  const [fees, setFees] = useState("");

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-5xl rounded-xl bg-white p-8 shadow-lg">

        <h1 className="mb-2 text-3xl font-bold text-black">
          WhatsApp Bot Setup
        </h1>

        <p className="mb-8 text-gray-600">
          Step 2 of 6 – Doctors
        </p>

        <div className="grid gap-6 md:grid-cols-2">

          <div>
            <label className="mb-2 block font-medium text-black">
              Doctor Name
            </label>

            <input
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="Dr. John Smith"
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium text-black">
              Specialization
            </label>

            <input
              type="text"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="Dental Surgeon"
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium text-black">
              Qualification
            </label>

            <input
              type="text"
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              placeholder="BDS, MDS"
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium text-black">
              Experience (Years)
            </label>

            <input
              type="number"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="5"
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium text-black">
              Consultation Fee
            </label>

            <input
              type="number"
              value={fees}
              onChange={(e) => setFees(e.target.value)}
              placeholder="500"
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
            />
          </div>

        </div>

        <div className="mt-10 flex justify-between">

          <Link
            href="/whatsapp-bot"
            className="rounded-lg border border-gray-400 px-6 py-3 font-semibold text-black"
          >
            ← Previous
          </Link>

          <Link
            href="/whatsapp-bot/services"
            className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
          >
            Next → Services
          </Link>

        </div>

      </div>
    </div>
  );
}
