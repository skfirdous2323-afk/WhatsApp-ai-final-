"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  MessageSquare,
  UsersRound,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const t = useTranslations("LoginPage");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const destination = inviteToken
      ? `/join/${encodeURIComponent(inviteToken)}`
      : "/dashboard";

    window.location.href = destination;
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* Brand panel */}
        <section className="relative hidden overflow-hidden bg-primary lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.10),transparent_40%)]" />

          <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>

                <div>
                  <div className="text-xl font-bold tracking-tight text-white">
                    ZIVEXO
                  </div>
                  <div className="text-xs font-medium text-white/70">
                    CRM
                  </div>
                </div>
              </div>

              <div className="mt-24 max-w-lg">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                  WhatsApp-powered Business Management Platform
                </p>

                <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
                  Manage customers.
                  <br />
                  Automate WhatsApp.
                  <br />
                  Grow your business.
                </h1>

                <p className="mt-6 max-w-md text-base leading-7 text-white/75">
                  Bring conversations, customers, appointments and business
                  workflows together in one powerful CRM platform.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-white/65">
              <ShieldCheck className="h-4 w-4" />
              Secure business management platform
            </div>
          </div>
        </section>

        {/* Login panel */}
        <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-md">

            {/* Mobile branding */}
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>

              <div>
                <div className="text-xl font-bold tracking-tight">
                  ZIVEXO
                </div>
                <div className="text-xs font-medium text-muted-foreground">
                  CRM
                </div>
              </div>
            </div>

            <Card className="border-border/70 bg-card shadow-xl shadow-black/5">
              <CardHeader className="space-y-4 pb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  {inviteToken ? (
                    <UsersRound className="h-6 w-6 text-primary" />
                  ) : (
                    <LockKeyhole className="h-6 w-6 text-primary" />
                  )}
                </div>

                <div>
                  <CardTitle className="text-2xl font-bold tracking-tight">
                    {inviteToken
                      ? t("titleAccept")
                      : t("titleWelcome")}
                  </CardTitle>

                  <CardDescription className="mt-2 text-sm leading-6">
                    {inviteToken
                      ? t("descAccept")
                      : t("descWelcome")}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleLogin} className="space-y-5">

                  {error && (
                    <div
                      role="alert"
                      className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-500"
                    >
                      {error}
                    </div>
                  )}

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      {t("emailLabel")}
                    </Label>

                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder={t("emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11 rounded-lg bg-background"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">
                        {t("passwordLabel")}
                      </Label>

                      <Link
                        href="/forgot-password"
                        className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                      >
                        {t("forgotPassword")}
                      </Link>
                    </div>

                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder={t("passwordPlaceholder")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-11 rounded-lg bg-background pr-11"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Security */}
                  <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                    <p className="text-xs leading-5 text-muted-foreground">
                      {t("secureMessage")}
                    </p>
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full rounded-lg text-sm font-semibold shadow-sm"
                  >
                    {loading ? (
                      t("signingIn")
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        {t("signIn")}
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </form>

                <div className="mt-7 border-t border-border/60 pt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("noAccount")}{" "}
                    <Link
                      href={
                        inviteToken
                          ? `/signup?invite=${encodeURIComponent(inviteToken)}`
                          : "/signup"
                      }
                      className="font-semibold text-primary hover:text-primary/80"
                    >
                      {t("createAccount")}
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              © {new Date().getFullYear()} ZIVEXO. All rights reserved.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
