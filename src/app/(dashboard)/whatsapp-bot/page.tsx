"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function WhatsAppBotPage() {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [clinicName, setClinicName] = useState("");
  const [clinicType, setClinicType] = useState("Dental");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [googleMaps, setGoogleMaps] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [language, setLanguage] = useState("English");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [website, setWebsite] = useState("");

  const [bookEnabled, setBookEnabled] = useState(true);
  const [doctorsEnabled, setDoctorsEnabled] = useState(true);
  const [servicesEnabled, setServicesEnabled] = useState(true);
  const [faqEnabled, setFaqEnabled] = useState(true);
  const [workingHoursEnabled, setWorkingHoursEnabled] = useState(true);
  const [contactEnabled, setContactEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  const [menuLabels, setMenuLabels] = useState({
    book: "📅 Book Appointment",
    doctors: "👨‍⚕️ Doctors",
    services: "🦷 Services",
    hours: "🕒 Working Hours",
    faq: "❓ FAQ",
    contact: "📞 Contact",
    location: "📍 Location",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showMessage('error', 'Logo size should be less than 2MB');
        return;
      }
      setLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogo(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  useEffect(() => {
    async function loadClinicSettings() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: clinic, error } = await supabase
        .from("clinics")
        .select(`
          clinic_name,
          clinic_type,
          whatsapp_number,
          phone_number,
          email,
          address,
          google_maps,
          website,
          language,
          timezone,
          book_enabled,
          doctors_enabled,
          services_enabled,
          faq_enabled,
          working_hours_enabled,
          contact_enabled,
          location_enabled,
          logo_url,
          clinic_logo,
          menu_labels
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to load clinic settings:", error);
        return;
      }

      if (!clinic) return;

      setClinicName(clinic.clinic_name || "");
      setClinicType(clinic.clinic_type || "Dental");
      setWhatsappNumber(clinic.whatsapp_number || "");
      setPhoneNumber(clinic.phone_number || "");
      setEmail(clinic.email || "");
      setAddress(clinic.address || "");
      setGoogleMaps(clinic.google_maps || "");
      setWebsite(clinic.website || "");
      setLanguage(clinic.language || "English");
      setTimezone(clinic.timezone || "Asia/Kolkata");

      setBookEnabled(clinic.book_enabled ?? true);
      setDoctorsEnabled(clinic.doctors_enabled ?? true);
      setServicesEnabled(clinic.services_enabled ?? true);
      setFaqEnabled(clinic.faq_enabled ?? true);
      setWorkingHoursEnabled(clinic.working_hours_enabled ?? true);
      setContactEnabled(clinic.contact_enabled ?? true);
      setLocationEnabled(clinic.location_enabled ?? true);

      if (clinic.menu_labels) {
        setMenuLabels(prev => ({
          ...prev,
          ...clinic.menu_labels,
        }));
      }

      const existingLogo = clinic.logo_url || clinic.clinic_logo;
      if (existingLogo) {
        setLogoPreview(existingLogo);
      }
    }

    loadClinicSettings();
  }, []);

  async function saveClinic() {
    if (!clinicName.trim()) {
      showMessage('error', 'Please enter clinic name');
      return;
    }
    if (!address.trim()) {
      showMessage('error', 'Please enter clinic address');
      return;
    }
    if (!whatsappNumber.trim()) {
      showMessage('error', 'Please enter WhatsApp number');
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showMessage('error', 'Please login first');
        return;
      }

      const { data: existingClinic, error: fetchError } = await supabase
        .from("clinics")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error("Error checking existing clinic:", fetchError);
        showMessage('error', 'Failed to check existing clinic');
        return;
      }

      let logoUrl = null;
      if (logo) {
        const fileExt = logo.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('clinic-logos')
          .upload(fileName, logo);

        if (uploadError) {
          console.error('Logo upload error:', uploadError);
          showMessage('error', 'Failed to upload logo');
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('clinic-logos')
          .getPublicUrl(fileName);

        logoUrl = publicUrl;
      }

      const clinicData = {
        clinic_name: clinicName,
        clinic_type: clinicType,
        whatsapp_number: whatsappNumber,
        phone_number: phoneNumber,
        email: email,
        address: address,
        google_maps: googleMaps,
        clinic_logo: logoUrl,
        logo_url: logoUrl,
        language: language,
        timezone: timezone,
        website: website,
        book_enabled: bookEnabled,
        doctors_enabled: doctorsEnabled,
        services_enabled: servicesEnabled,
        faq_enabled: faqEnabled,
        working_hours_enabled: workingHoursEnabled,
        contact_enabled: contactEnabled,
        location_enabled: locationEnabled,
        menu_labels: menuLabels,
      };

      let error;

      if (existingClinic) {
        const { error: updateError } = await supabase
          .from("clinics")
          .update(clinicData)
          .eq("id", existingClinic.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("clinics")
          .insert({
            ...clinicData,
            user_id: user.id,
          });
        error = insertError;
      }

      if (error) {
        console.error("Save error:", error);
        showMessage('error', error.message || 'Failed to save clinic');
        return;
      }

      showMessage('success', '✅ Clinic information saved successfully!');

      setTimeout(() => {
        router.push("/whatsapp-bot/doctors");
      }, 1500);

    } catch (err) {
      console.error(err);
      showMessage('error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                WhatsApp Bot Setup
              </h1>
              <p className="mt-1 text-gray-600">
                Step 1 of 6 – Clinic Information
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/whatsapp-bot/doctors"
                className={`rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-2.5 font-semibold text-white hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl ${
                  loading ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                Next → Doctors
              </Link>
            </div>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {message.text}
            </p>
          </div>
        )}

        <div className="rounded-xl bg-white p-8 shadow-xl border border-gray-100">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column - Form */}
            <div className="lg:col-span-2">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Business Category */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Select Your Business Category
                  </label>
                  <select
                    value="Healthcare"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900"
                    disabled
                  >
                    <option value="Healthcare">🏥 Healthcare / Clinic</option>
                  </select>
                </div>

                {/* Clinic Name */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Clinic Name *
                  </label>
                  <input
                    type="text"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder="Enter clinic name"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>

                {/* Clinic Type */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Clinic Type
                  </label>
                  <select
                    value={clinicType}
                    onChange={(e) => setClinicType(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  >
                    <option>Dental</option>
                    <option>General</option>
                    <option>Eye</option>
                    <option>Skin</option>
                    <option>ENT</option>
                    <option>Orthopedic</option>
                    <option>Cardiology</option>
                    <option>Neurology</option>
                    <option>Pediatrics</option>
                    <option>Gynecology</option>
                    <option>Other</option>
                  </select>
                </div>

                {/* WhatsApp Number */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    WhatsApp Number *
                  </label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+91XXXXXXXXXX"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91XXXXXXXXXX"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="clinic@email.com"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>

                {/* Website */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Website
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourclinic.com"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Address *
                  </label>
                  <textarea
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Clinic Address"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>

                {/* Google Maps */}
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Google Maps Link
                  </label>
                  <input
                    type="text"
                    value={googleMaps}
                    onChange={(e) => setGoogleMaps(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
              </div>
            </div>


          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Step 1 of 6</span>
              <div className="flex gap-1">
                <div className="h-2 w-8 rounded-full bg-blue-600"></div>
                <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                <div className="h-2 w-2 rounded-full bg-gray-300"></div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={saveClinic}
                disabled={loading}
                className="rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-6 py-2.5 font-semibold text-white hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  "💾 Save Clinic"
                )}
              </button>

              <Link
                href="/whatsapp-bot/doctors"
                className={`rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-2.5 font-semibold text-white hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg ${
                  loading ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                Next → Doctors
              </Link>
            </div>
          </div>

          {/* ✅ Policy Links - Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-wrap justify-center gap-3 text-sm">
              <Link href="/privacy-policy" className="text-gray-500 hover:text-blue-600 transition-colors">
                🔒 Privacy Policy
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/terms" className="text-gray-500 hover:text-blue-600 transition-colors">
                📋 Terms & Conditions
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/refund-policy" className="text-gray-500 hover:text-blue-600 transition-colors">
                💰 Refund Policy
              </Link>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">
              By using our services, you agree to our policies.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
