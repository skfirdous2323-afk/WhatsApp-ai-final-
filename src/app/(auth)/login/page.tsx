// src/app/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? "bg-white/80 backdrop-blur-md shadow-sm" : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">Z</span>
              </div>
              <span className="text-xl font-bold text-gray-900">ZIVEXO</span>
            </Link>

            {/* Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-gray-600 hover:text-gray-900">Features</Link>
              <Link href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">Pricing</Link>
              <Link href="#testimonials" className="text-sm text-gray-600 hover:text-gray-900">Testimonials</Link>
              <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900">Log in</Link>
              <Link
                href="/signup"
                className="bg-[#0a1628] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#1a2a4a] transition"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full mb-6">
              <span className="text-blue-600 text-sm font-medium">🚀 New Update</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#0a1628] leading-tight max-w-4xl mx-auto">
              WhatsApp CRM for
              <span className="text-blue-600 block">Clinics & Doctors</span>
            </h1>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto mt-4">
              Automate appointments, patient communication, and clinic management — all from one platform.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <Link
                href="/signup"
                className="bg-[#0a1628] text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-[#1a2a4a] transition shadow-lg"
              >
                Start for free
              </Link>
              <Link
                href="#demo"
                className="border border-gray-300 text-gray-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition"
              >
                Talk to sales
              </Link>
            </div>
            <p className="text-sm text-gray-400 mt-4">Trusted by 50+ clinics</p>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-12 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-sm text-gray-400 font-medium uppercase tracking-wider mb-6">
            Trusted by clinics worldwide
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 items-center opacity-60">
            <span className="text-xl font-semibold text-gray-700">🏥 Apollo</span>
            <span className="text-xl font-semibold text-gray-700">💊 MedPlus</span>
            <span className="text-xl font-semibold text-gray-700">🦷 Clove</span>
            <span className="text-xl font-semibold text-gray-700">❤️ HeartCare</span>
            <span className="text-xl font-semibold text-gray-700">👁️ EyeQ</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0a1628]">
              Click, click, done.
            </h2>
            <p className="text-gray-500 mt-2">Everything you need to run your clinic</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-slate-50 rounded-2xl p-8 border border-gray-100">
              <div className="text-3xl mb-4">📱</div>
              <h3 className="text-xl font-bold text-[#0a1628]">WhatsApp Auto</h3>
              <p className="text-gray-500 text-sm mt-2">
                24/7 automated messaging, appointment booking, and patient support.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-50 rounded-2xl p-8 border border-gray-100">
              <div className="text-3xl mb-4">👨‍⚕️</div>
              <h3 className="text-xl font-bold text-[#0a1628]">Doctor & Patient Mgmt</h3>
              <p className="text-gray-500 text-sm mt-2">
                Manage doctors, services, working hours, and patient records.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-50 rounded-2xl p-8 border border-gray-100">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-[#0a1628]">Analytics Dashboard</h3>
              <p className="text-gray-500 text-sm mt-2">
                Real-time insights, appointment reports, and revenue tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a1628] text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-400">Product</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                <li><Link href="#features">Features</Link></li>
                <li><Link href="#pricing">Pricing</Link></li>
                <li><Link href="#demo">Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-400">Company</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                <li><Link href="/about">About</Link></li>
                <li><Link href="/blog">Blog</Link></li>
                <li><Link href="/careers">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-400">Legal</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                <li><Link href="/privacy-policy">Privacy Policy</Link></li>
                <li><Link href="/terms">Terms of Service</Link></li>
                <li><Link href="/refund-policy">Refund Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-400">Social</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                <li><a href="#">Twitter</a></li>
                <li><a href="#">LinkedIn</a></li>
                <li><a href="#">YouTube</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-6 flex flex-wrap justify-between items-center text-sm text-gray-400">
            <span>© 2026 ZIVEXO. All rights reserved.</span>
            <span>v3.0.1</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
