"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface PaymentSettings {
  cash_enabled: boolean;
  upi_enabled: boolean;
  upi_qr_url: string | null;
  pay_at_clinic_enabled: boolean;
}

const defaultSettings: PaymentSettings = {
  cash_enabled: true,
  upi_enabled: false,
  upi_qr_url: null,
  pay_at_clinic_enabled: true,
};

export default function PaymentSetupPage() {
  const supabase = createClient();

  const [settings, setSettings] = useState<PaymentSettings>(defaultSettings);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user }, error: userError } =
        await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Please login first.");
      }

      const { data: clinic, error: clinicError } = await supabase
        .from("clinics")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (clinicError || !clinic) {
        throw new Error("Clinic not found.");
      }

      setClinicId(clinic.id);

      const { data, error } = await supabase
        .from("clinic_payment_settings")
        .select("cash_enabled, upi_enabled, upi_qr_url, pay_at_clinic_enabled")
        .eq("clinic_id", clinic.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          cash_enabled: data.cash_enabled,
          upi_enabled: data.upi_enabled,
          upi_qr_url: data.upi_qr_url,
          pay_at_clinic_enabled: data.pay_at_clinic_enabled,
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to load settings.",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: keyof PaymentSettings, value: boolean) => {
    setSettings((previous) => ({ ...previous, [key]: value }));
  };

  const handleQrUpload = async (file?: File) => {
    if (!file || !clinicId) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setMessage({ type: "error", text: "Please select PNG, JPG or WEBP image." });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "QR image must be smaller than 2 MB." });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please login first.");

      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/${clinicId}/upi-qr-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("clinic-payment-qr")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("clinic-payment-qr")
        .getPublicUrl(path);

      setSettings((previous) => ({
        ...previous,
        upi_qr_url: data.publicUrl,
      }));

      setMessage({
        type: "success",
        text: "QR image uploaded. Save your settings to finish.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "QR upload failed.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!clinicId) return;

    setSaving(true);
    setMessage(null);

    try {
      const { data: { user }, error: userError } =
        await supabase.auth.getUser();

      if (userError || !user) throw new Error("Please login first.");

      const { error } = await supabase
        .from("clinic_payment_settings")
        .upsert(
          {
            clinic_id: clinicId,
            user_id: user.id,
            cash_enabled: settings.cash_enabled,
            upi_enabled: settings.upi_enabled,
            upi_qr_url: settings.upi_qr_url,
            pay_at_clinic_enabled: settings.pay_at_clinic_enabled,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "clinic_id" }
        );

      if (error) throw error;

      setMessage({
        type: "success",
        text: "Payment settings saved successfully.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const paymentMethods = [
    {
      key: "cash_enabled" as const,
      title: "Cash",
      description: "Accept cash payments at your clinic.",
    },
    {
      key: "upi_enabled" as const,
      title: "UPI Payment",
      description: "Allow patients to pay using UPI.",
    },
    {
      key: "pay_at_clinic_enabled" as const,
      title: "Pay at Clinic",
      description: "Patients can pay when they visit the clinic.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold text-blue-600">
            WHATSAPP BOT SETUP · STEP 5 OF 5
          </p>
          <h1 className="text-3xl font-bold text-gray-900">
            Payment Setup
          </h1>
          <p className="mt-2 text-gray-500">
            Configure how your clinic collects payments from patients.
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 rounded-xl border p-4 ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-5">
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold text-gray-900">
              Clinic Payment Methods
            </h2>

            <div className="space-y-5">
              {paymentMethods.map((method) => (
                <div
                  key={method.key}
                  className="flex items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {method.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {method.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings[method.key]}
                    onClick={() =>
                      updateSetting(method.key, !settings[method.key])
                    }
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                      settings[method.key] ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                        settings[method.key] ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                UPI QR Code
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Upload your clinic's UPI QR code for patients to scan and pay.
              </p>
            </div>

            {settings.upi_qr_url && (
              <div className="mt-5">
                <img
                  src={settings.upi_qr_url}
                  alt="Clinic UPI QR Code"
                  className="h-44 w-44 rounded-xl border bg-white object-contain p-2"
                />
              </div>
            )}

            <label className="mt-5 inline-flex cursor-pointer items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100">
              {uploading ? "Uploading..." : settings.upi_qr_url ? "Change QR Code" : "Upload QR Code"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={uploading}
                onChange={(event) => {
                  void handleQrUpload(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>

            <p className="mt-2 text-xs text-gray-400">
              PNG, JPG or WEBP · Maximum 2 MB
            </p>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Online Payment Gateway
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Online gateway integration will be available soon.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                Coming Soon
              </span>
            </div>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/whatsapp-bot/working-hours"
            className="rounded-xl border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Previous
          </Link>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || uploading}
            className="rounded-xl bg-blue-600 px-7 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Payment Setup"}
          </button>
        </div>

        <p className="mt-5 text-center text-xs text-gray-400">
          You can change payment settings later from Dashboard Settings.
          <br />
          These settings are for clinic patient payments, not ZIVEXO subscription billing.
        </p>
      </div>
    </div>
  );
}
