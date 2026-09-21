"use client";

import { Check, Crown, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Starter",
    setup: "₹5,999",
    monthly: "₹1,999",
    description: "For small clinics getting started with WhatsApp automation.",
    features: [
      "Customer Management",
      "Doctor & Service Management",
      "Appointment Management",
      "WhatsApp Appointment Bot",
      "Appointment Confirmation",
      "Clinic Branding",
      "Basic Reports",
    ],
  },
  {
    name: "Professional",
    setup: "₹9,999",
    monthly: "₹2,999",
    description: "Complete CRM and automation for growing clinics.",
    popular: true,
    features: [
      "Everything in Starter",
      "AI WhatsApp Assistant",
      "Automatic Appointment Reminders",
      "Patient Notes & Visit History",
      "Appointment Calendar",
      "Custom WhatsApp Menu",
      "Doctor-wise Availability",
      "Analytics & Reports",
      "Priority Support",
    ],
  },
  {
    name: "Enterprise",
    setup: "Custom",
    monthly: "Custom",
    description: "Advanced automation for multi-doctor and multi-branch clinics.",
    features: [
      "Everything in Professional",
      "Multi-doctor & Multi-branch",
      "Advanced Automation",
      "Custom Integrations",
      "White-label CRM",
      "Custom AI Workflows",
      "Dedicated Support",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            <Crown className="h-4 w-4" />
            ZIVEXO CRM Pricing
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Simple pricing for modern clinics
          </h1>

          <p className="mt-3 text-slate-600">
            Manage customers, appointments and WhatsApp automation from one
            powerful CRM.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border bg-white p-6 shadow-sm ${
                plan.popular
                  ? "border-blue-500 shadow-lg shadow-blue-100"
                  : "border-slate-200"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-bold text-white">
                  MOST POPULAR
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                  {plan.name}
                </h2>

                <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500">
                  {plan.description}
                </p>
              </div>

              <div className="border-b border-slate-100 pb-6">
                <div className="text-sm text-slate-500">Setup</div>
                <div className="mt-1 text-3xl font-bold text-slate-900">
                  {plan.setup}
                </div>

                <div className="mt-4 text-sm text-slate-500">Monthly</div>
                <div className="mt-1 text-2xl font-bold text-blue-600">
                  {plan.monthly}
                  {plan.monthly !== "Custom" && (
                    <span className="text-sm font-normal text-slate-500">
                      {" "}
                      / month
                    </span>
                  )}
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-slate-700"
                  >
                    <span className="mt-0.5 rounded-full bg-green-100 p-1 text-green-600">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  plan.popular
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                {plan.popular && <Sparkles className="h-4 w-4" />}
                {plan.name === "Enterprise" ? "Contact Sales" : "Get Started"}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          WhatsApp/Meta conversation charges, if applicable, are billed
          separately.
        </p>
      </div>
    </div>
  );
}
