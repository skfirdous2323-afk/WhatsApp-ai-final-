"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Crown,
  Headphones,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Zap,
  Building2,
} from "lucide-react";

const professionalFeatures = [
  "WhatsApp Business Integration",
  "AI WhatsApp Assistant",
  "Automated Appointment Booking",
  "Clinic CRM & Customer Management",
  "Doctor & Service Management",
  "Automatic Appointment Reminders",
  "Dashboard & Analytics",
  "Standard Support",
];

const enterpriseFeatures = [
  "Everything in Professional",
  "Advanced AI & Workflow Automation",
  "Multi-Doctor Management",
  "Multi-Branch Support",
  "Custom Workflow Configuration",
  "Tailored Integrations",
  "White-label CRM Options",
  "Dedicated Setup & Support",
];

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f8fc] text-slate-900">
      <section className="relative border-b border-slate-200/70 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.12),_transparent_58%)]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:px-8 lg:pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700 sm:text-sm">
              <Sparkles className="h-4 w-4" />
              ZIVEXO CRM Pricing
            </div>

            <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Better clinic management.
              <span className="mt-1 block text-blue-600">
                Smarter automation.
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Manage appointments, patient relationships and WhatsApp
              communication from one professional workspace built for modern
              clinics.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-xs font-medium text-slate-500 sm:text-sm">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Secure workspace
              </span>
              <span className="inline-flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                WhatsApp automation
              </span>
              <span className="inline-flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-600" />
                Built to save time
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mb-9 flex flex-col items-center gap-4 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Choose the right plan for your clinic
          </h2>
          <p className="max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
            Start with Professional or talk to us about a solution tailored to
            your business.
          </p>

          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              aria-pressed={billing === "monthly"}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition sm:px-6 ${
                billing === "monthly"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              aria-pressed={billing === "annual"}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition sm:px-6 ${
                billing === "annual"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Annually
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  billing === "annual"
                    ? "bg-emerald-400 text-slate-950"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                SAVE
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto grid max-w-5xl items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
          <article className="relative flex flex-col rounded-3xl border border-blue-200 bg-white p-6 shadow-xl shadow-blue-900/[0.06] sm:p-8">
            <div className="absolute inset-x-8 top-0 h-1 rounded-b-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Crown className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-950 sm:text-2xl">
                  Professional
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Everything a growing clinic needs to manage its daily
                  operations and automate patient communication.
                </p>
              </div>

              <span className="shrink-0 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-bold tracking-wide text-blue-700 sm:text-xs">
                POPULAR
              </span>
            </div>

            <div className="mt-7 rounded-2xl bg-slate-50 p-5 sm:p-6">
              <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                <span className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                  {billing === "monthly" ? "₹2,499" : "₹28,000"}
                </span>
                <span className="pb-1 text-sm text-slate-500">
                  / {billing === "monthly" ? "month" : "year"}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-500">
                {billing === "monthly"
                  ? "Flexible monthly plan"
                  : "₹1,988 less than 12 monthly payments"}
              </p>

              {billing === "annual" && (
                <div className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  Annual billing selected
                </div>
              )}
            </div>

            <div className="mt-7">
              <h4 className="text-sm font-bold text-slate-900">
                What&apos;s included
              </h4>
              <ul className="mt-4 space-y-3.5">
                {professionalFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm leading-5 text-slate-600"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto pt-8">
              <Link
                href="/signup"
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <p className="mt-3 text-center text-xs text-slate-400">
                Create your ZIVEXO account to get started.
              </p>
            </div>
          </article>

          <article className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/[0.03] sm:p-8">
            <div>
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-950 sm:text-2xl">
                Enterprise
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Advanced automation and tailored solutions for multi-doctor,
                multi-branch and growing healthcare businesses.
              </p>
            </div>

            <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <div className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Custom Pricing
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Setup and monthly fees are tailored to your requirements.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-xs text-slate-500">Setup</div>
                  <div className="mt-1 font-bold text-slate-900">Custom</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-xs text-slate-500">Monthly</div>
                  <div className="mt-1 font-bold text-slate-900">Custom</div>
                </div>
              </div>
            </div>

            <div className="mt-7">
              <h4 className="text-sm font-bold text-slate-900">
                Enterprise capabilities
              </h4>
              <ul className="mt-4 space-y-3.5">
                {enterpriseFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm leading-5 text-slate-600"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto pt-8">
              <Link
                href="/signup"
                className="group flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-800 transition hover:border-violet-300 hover:bg-violet-50 focus:outline-none focus:ring-4 focus:ring-violet-100"
              >
                Contact for Pricing
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <p className="mt-3 text-center text-xs text-slate-400">
                Discuss a solution for your organization.
              </p>
            </div>
          </article>
        </div>

        <div className="mx-auto mt-8 max-w-5xl rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Headphones className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Need a tailored solution?
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                  Enterprise pricing depends on your clinic&apos;s requirements.
                </p>
              </div>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Built for modern healthcare teams
            </span>
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-6 text-slate-400">
          WhatsApp/Meta conversation charges, if applicable, are billed
          separately. Payment processing is not enabled on this page yet.
        </p>
      </section>
    </main>
  );
}
