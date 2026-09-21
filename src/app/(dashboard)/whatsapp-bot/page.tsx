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

  const [menuDescriptions, setMenuDescriptions] = useState({
    book: "Book an appointment with our doctors",
    doctors: "View our available doctors",
    services: "Explore our available services",
    hours: "Check our working hours",
    faq: "Find answers to common questions",
    contact: "Contact us for assistance",
    location: "Find our clinic location",
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
          menu_labels,
          menu_descriptions
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

      if (clinic.menu_descriptions) {
        setMenuDescriptions(prev => ({
          ...prev,
          ...clinic.menu_descriptions,
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
        menu_descriptions: menuDescriptions,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">

        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                Step 1 of 6
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
              Clinic Information
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Set up your clinic details and customize your WhatsApp bot menu
            </p>
          </div>
          <Link
            href="/whatsapp-bot/doctors"
            className={`group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-500/40 ${
              loading ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            Next: Doctors
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 rounded-xl p-4 shadow-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`text-sm font-medium ${
              message.type === 'success' ? 'text-emerald-800' : 'text-red-800'
            }`}>
              {message.text}
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">

          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-gray-200/50 border border-gray-100">
              <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                    <span className="text-xl">🏥</span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Clinic Details</h2>
                    <p className="text-xs text-gray-500">Basic information about your clinic</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Business Category */}
                <div className="mb-5">
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Business Category
                  </label>
                  <select
                    value="Healthcare"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900"
                    disabled
                  >
                    <option value="Healthcare">🏥 Healthcare / Clinic</option>
                  </select>
                </div>

                {/* Logo */}
                <div className="mb-6">
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Clinic Logo
                  </label>
                  <div className="flex items-center gap-5">
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <svg className="h-7 w-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                        id="logo-upload"
                      />
                      <div className="flex flex-wrap gap-2">
                        <label
                          htmlFor="logo-upload"
                          className="cursor-pointer rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition"
                        >
                          Upload Logo
                        </label>
                        {logoPreview && (
                          <button
                            onClick={removeLogo}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-gray-500">PNG or JPG, max 2MB</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Clinic Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      placeholder="Sunrise Health Clinic"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Clinic Type
                    </label>
                    <select
                      value={clinicType}
                      onChange={(e) => setClinicType(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition"
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

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      WhatsApp Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="clinic@email.com"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Website
                    </label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://yourclinic.com"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Clinic Address"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Google Maps Link
                    </label>
                    <input
                      type="text"
                      value={googleMaps}
                      onChange={(e) => setGoogleMaps(e.target.value)}
                      placeholder="https://maps.google.com/..."
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Menu Customization */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 overflow-hidden rounded-2xl bg-white shadow-xl shadow-gray-200/50 border border-gray-100">
              <div className="border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                    <span className="text-base">📋</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Menu Customization</h3>
                    <p className="text-xs text-gray-500">Toggle & rename items</p>
                  </div>
                </div>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-4 space-y-3">
                {[
                  ["book", "Book Appointment", bookEnabled, setBookEnabled],
                  ["doctors", "Doctors", doctorsEnabled, setDoctorsEnabled],
                  ["services", "Services", servicesEnabled, setServicesEnabled],
                  ["hours", "Working Hours", workingHoursEnabled, setWorkingHoursEnabled],
                  ["faq", "FAQ", faqEnabled, setFaqEnabled],
                  ["contact", "Contact", contactEnabled, setContactEnabled],
                  ["location", "Location", locationEnabled, setLocationEnabled],
                ].map(([key, defaultName, enabled, setEnabled]) => (
                  <div
                    key={key as string}
                    className={`rounded-xl border-2 p-3 transition-all ${
                      enabled
                        ? "border-blue-100 bg-blue-50/30"
                        : "border-gray-100 bg-gray-50/50 opacity-70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-800">
                        {defaultName as string}
                      </span>
                      <button
                        type="button"
                        onClick={() => (setEnabled as React.Dispatch<React.SetStateAction<boolean>>)(!(enabled as boolean))}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          enabled ? "bg-green-500" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            enabled ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="text"
                        value={menuLabels[key as keyof typeof menuLabels]}
                        onChange={(e) =>
                          setMenuLabels((prev) => ({
                            ...prev,
                            [key as string]: e.target.value,
                          }))
                        }
                        placeholder={defaultName as string}
                        className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                      />

                      <input
                        type="text"
                        value={menuDescriptions[key as keyof typeof menuDescriptions]}
                        onChange={(e) =>
                          setMenuDescriptions((prev) => ({
                            ...prev,
                            [key as string]: e.target.value,
                          }))
                        }
                        placeholder="Menu description"
                        className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500">Step 1 of 6</span>
            <div className="flex gap-1">
              <div className="h-1.5 w-6 rounded-full bg-blue-600"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-gray-300"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-gray-300"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-gray-300"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-gray-300"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-gray-300"></div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={saveClinic}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-700 hover:to-emerald-800 hover:shadow-xl hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <span>💾</span>
                  Save Clinic
                </>
              )}
            </button>

            <Link
              href="/whatsapp-bot/doctors"
              className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-500/40 ${
                loading ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              Next: Doctors
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs">
          <Link href="/privacy-policy" className="text-gray-400 hover:text-gray-600 transition-colors">
            🔒 Privacy Policy
          </Link>
          <span className="text-gray-300">·</span>
          <Link href="/terms" className="text-gray-400 hover:text-gray-600 transition-colors">
            📋 Terms & Conditions
          </Link>
          <span className="text-gray-300">·</span>
          <Link href="/refund-policy" className="text-gray-400 hover:text-gray-600 transition-colors">
            💰 Refund Policy
          </Link>
        </div>

      </div>
    </div>
  );
}
