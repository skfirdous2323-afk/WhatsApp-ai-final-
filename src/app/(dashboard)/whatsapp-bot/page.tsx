"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function WhatsAppBotPage() {
  const supabase = createClient();

  const [clinicName, setClinicName] = useState("");
  const [clinicType, setClinicType] = useState("Dental");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [googleMaps, setGoogleMaps] = useState("");

  const [loading, setLoading] = useState(false);

  async function saveClinic() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please login first.");
        return;
      }

      const { error } = await supabase
        .from("clinics")
        .insert({
          user_id: user.id,
          clinic_name: clinicName,
          clinic_type: clinicType,
          whatsapp_number: whatsappNumber,
          phone_number: phoneNumber,
          email,
          address,
          google_maps: googleMaps,
        });

      if (error) {
        alert(error.message);
        return;
      }

      alert("✅ Clinic information saved successfully.");
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          WhatsApp Bot Setup
        </h1>

        <p className="mb-8 text-gray-600">
          Step 1 of 6 – Clinic Information
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block font-medium text-gray-900">
              Clinic Name *
            </label>
            <input
              type="text"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="Enter clinic name"
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium text-gray-900">
              Clinic Type
            </label>
            <select
              value={clinicType}
              onChange={(e) => setClinicType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900"
            >
              <option>Dental</option>
              <option>General</option>
              <option>Eye</option>
              <option>Skin</option>
              <option>ENT</option>
              <option>Orthopedic</option>
            </select>
          </div>


          <div>
            <label className="mb-2 block font-medium text-gray-900">
              WhatsApp Number
            </label>
            <input
              type="text"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="+91XXXXXXXXXX"
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium text-gray-900">
              Phone Number
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91XXXXXXXXXX"
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium text-gray-900">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="clinic@email.com"
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block font-medium text-gray-900">
              Address *
            </label>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Clinic Address"
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block font-medium text-gray-900">
              Google Maps Link
            </label>
            <input
              type="text"
              value={googleMaps}
              onChange={(e) => setGoogleMaps(e.target.value)}
              placeholder="https://maps.google.com/..."
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          <button
            onClick={saveClinic}
            disabled={loading}
            className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Clinic"}
          </button>

          <Link
            href="/whatsapp-bot/doctors"
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Next →
          </Link>
        </div>
      </div>
    </div>
  );
}
