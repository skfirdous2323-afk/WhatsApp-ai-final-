"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { isAdmin } from "@/lib/auth/admin-check";

export default function CredentialsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setAdminEmail(user.email || "");

    if (!isAdmin(user.email)) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    await loadCustomers();
  };

  const loadCustomers = async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error("No session:", sessionError);
      router.push("/login");
      return;
    }

    const res = await fetch("/api/admin/get-credentials", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 401) {
      router.push("/login");
      return;
    }

    if (res.status === 403) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    const data = await res.json();
    setCustomers(data.customers || []);
    setLoading(false);
  };

  const reveal = async (id: string) => {
    if (revealed[id]) {
      const updated = { ...revealed };
      delete updated[id];
      setRevealed(updated);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    const res = await fetch(`/api/admin/reveal-password/${id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    if (data.password) {
      setRevealed((prev) => ({ ...prev, [id]: data.password }));
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied!");
  };

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">আপনি এই পেজ দেখার অনুমতি পাননি।</p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
            <p className="text-xs text-red-600">
              Logged in as: <strong>{adminEmail}</strong>
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">🔐 Customer Credentials</h1>
            <p className="text-gray-500">Total {customers.length} customers</p>
          </div>
          <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm">
            ✅ Admin: {adminEmail}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Password</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Clinic</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{c.email}</span>
                      <button onClick={() => copy(c.email)} className="text-xs">📋</button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {revealed[c.id] ? (
                      <div className="flex items-center gap-2">
                        <code className="bg-yellow-50 px-2 py-1 rounded text-xs">{revealed[c.id]}</code>
                        <button onClick={() => copy(revealed[c.id])} className="text-xs">📋</button>
                        <button onClick={() => reveal(c.id)} className="text-xs">🙈</button>
                      </div>
                    ) : (
                      <button onClick={() => reveal(c.id)} className="text-blue-600 text-xs">
                        👁️ Reveal
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">{c.phone || "-"}</td>
                  <td className="px-6 py-4 text-sm">{c.clinic_name || "-"}</td>
                  <td className="px-6 py-4 text-xs">
                    {new Date(c.signup_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {customers.length === 0 && (
            <div className="text-center py-12 text-gray-500">No customers yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
