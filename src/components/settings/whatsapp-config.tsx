'use client';

import Script from 'next/script';
import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Zap,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SettingsPanelHead } from './settings-panel-head';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import type { WhatsAppConfig as WhatsAppConfigType } from '@/types';

const MASKED_TOKEN = '••••••••••••••••';

type ConnectionStatus = 'connected' | 'disconnected' | 'unknown';
type ResetReason = 'token_corrupted' | 'meta_api_error' | null;

export function WhatsAppConfig() {
  const t = useTranslations('Settings.whatsapp');
  const supabase = createClient();
  const { user, accountId, loading: authLoading, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [config, setConfig] = useState<WhatsAppConfigType | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('unknown');
  const [resetReason, setResetReason] = useState<ResetReason>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const loadedAccountIdRef = useRef<string | null>(null);

  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [pin, setPin] = useState('');
  const [tokenEdited, setTokenEdited] = useState(false);
  const [isEmbeddedSignupLoading, setIsEmbeddedSignupLoading] = useState(false);

  const isRegistered = Boolean(config?.registered_at);
  const lastRegistrationError = config?.last_registration_error ?? null;

  const [verifyingRegistration, setVerifyingRegistration] = useState(false);
  type RegistrationProbe = {
    live: boolean;
    checks: Record<string, boolean | null>;
    errors?: string[];
    last_registration_error?: string | null;
    registered_at?: string | null;
    subscribed_apps_at?: string | null;
  };
  const [registrationProbe, setRegistrationProbe] = useState<RegistrationProbe | null>(null);

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/whatsapp/webhook`
      : '';

  // Meta configuration
  const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID;
  const metaConfigId = process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID;

  // ============================================================
  // Fetch Configuration
  // ============================================================

  const fetchConfig = useCallback(async (acctId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('account_id', acctId)
        .maybeSingle();

      if (error) {
        console.error('Failed to load config row:', error);
      }

      if (data) {
        setConfig(data);
        setPhoneNumberId(data.phone_number_id || '');
        setWabaId(data.waba_id || '');
        setAccessToken(MASKED_TOKEN);
        setVerifyToken('');
        setPin('');
        setTokenEdited(false);
      } else {
        setConfig(null);
        setPhoneNumberId('');
        setWabaId('');
        setAccessToken('');
        setVerifyToken('');
        setPin('');
        setTokenEdited(false);
      }

      setRegistrationProbe(null);

      if (data) {
        try {
          const res = await fetch('/api/whatsapp/config', { method: 'GET' });
          const payload = await res.json();

          if (payload.connected) {
            setConnectionStatus('connected');
            setResetReason(null);
            setStatusMessage('');
          } else {
            setConnectionStatus('disconnected');
            setResetReason(
              payload.needs_reset
                ? 'token_corrupted'
                : payload.reason === 'meta_api_error'
                ? 'meta_api_error'
                : null
            );
            setStatusMessage(payload.message || '');
          }
        } catch (err) {
          console.error('Health check failed:', err);
          setConnectionStatus('disconnected');
        }
      } else {
        setConnectionStatus('disconnected');
        setResetReason(null);
        setStatusMessage('');
      }
    } catch (err) {
      console.error('fetchConfig error:', err);
      toast.error('Failed to load WhatsApp configuration');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // ============================================================
  // Effects
  // ============================================================

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user || !accountId) {
      loadedAccountIdRef.current = null;
      setLoading(false);
      return;
    }
    if (loadedAccountIdRef.current === accountId) return;
    loadedAccountIdRef.current = accountId;
    fetchConfig(accountId);
  }, [authLoading, profileLoading, user?.id, accountId, fetchConfig]);

  // ============================================================
  // Embedded Signup Handler
  // ============================================================

  const handleEmbeddedSignup = () => {
    if (!metaAppId || !metaConfigId) {
      toast.error(
        `Meta configuration missing. Please check your environment variables.`
      );
      return;
    }

    const FB = (window as any).FB;
    if (!FB) {
      toast.error('Meta SDK is still loading. Please try again.');
      return;
    }

    setIsEmbeddedSignupLoading(true);

    FB.login(
      (response: any) => {
        setIsEmbeddedSignupLoading(false);
console.log('[META FULL RESPONSE]', JSON.stringify(response, null, 2));
alert('[META FULL RESPONSE]\n\n' + JSON.stringify(response, null, 2));
        if (response?.authResponse?.code) {
          const code = response.authResponse.code;
          window.location.href = `/api/whatsapp/embedded-signup/callback?code=${encodeURIComponent(code)}`;
        } else {
          let errorMsg = 'Meta Embedded Signup was cancelled or failed.';
          if (response?.error) {
            errorMsg += ` Error: ${response.error}`;
          }
          if (response?.errorReason) {
            errorMsg += ` Reason: ${response.errorReason}`;
          }
          toast.error(errorMsg);
        }
      },
      {
        config_id: metaConfigId,
        response_type: 'code',
        override_default_response_type: true,
      }
    );
  };

  // ============================================================
  // Save Configuration
  // ============================================================

  async function handleSave() {
    if (!phoneNumberId.trim()) {
      toast.error('Phone Number ID is required');
      return;
    }

    if (!config && (!accessToken.trim() || !tokenEdited)) {
      toast.error('Access Token is required for initial setup');
      return;
    }

    if (tokenEdited && accessToken !== MASKED_TOKEN && !accessToken.trim()) {
      toast.error('Please enter a valid Access Token');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        phone_number_id: phoneNumberId.trim(),
        waba_id: wabaId.trim() || null,
        verify_token: verifyToken.trim() || null,
        pin: pin.trim() || null,
      };

      if (tokenEdited && accessToken !== MASKED_TOKEN && accessToken.trim()) {
        payload.access_token = accessToken.trim();
      } else if (!config) {
        toast.error('Please enter the Access Token');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to save configuration');
        setSaving(false);
        return;
      }

      if (data.registered === false && data.registration_error) {
        toast.error(
          `Saved, but Meta couldn't register the number: ${data.registration_error}`,
          { duration: 12000 }
        );
      } else if (data.registration_skipped) {
        toast.success(
          'Credentials saved and verified. Registration skipped (no PIN) — check Registration status below.',
          { duration: 10000 }
        );
        setPin('');
      } else {
        toast.success(
          data.phone_info?.verified_name
            ? `Live — ${data.phone_info.verified_name} can now receive events.`
            : 'WhatsApp connected. Events will start flowing within a minute.'
        );
        setPin('');
      }

      if (accountId) await fetchConfig(accountId);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // Test Connection
  // ============================================================

  async function handleTestConnection() {
    setTesting(true);
    try {
      const res = await fetch('/api/whatsapp/config', { method: 'GET' });
      const payload = await res.json();

      if (payload.connected) {
        setConnectionStatus('connected');
        setResetReason(null);
        setStatusMessage('');
        toast.success(
          payload.phone_info?.verified_name
            ? `Connected to ${payload.phone_info.verified_name}`
            : 'API connection successful'
        );
      } else {
        setConnectionStatus('disconnected');
        setResetReason(
          payload.needs_reset
            ? 'token_corrupted'
            : payload.reason === 'meta_api_error'
            ? 'meta_api_error'
            : null
        );
        setStatusMessage(payload.message || '');
        toast.error(payload.message || 'API connection failed');
      }
    } catch (err) {
      console.error('Test connection error:', err);
      setConnectionStatus('disconnected');
      toast.error('Connection test failed. Check network and try again.');
    } finally {
      setTesting(false);
    }
  }

  // ============================================================
  // Verify Registration
  // ============================================================

  async function handleVerifyRegistration() {
    setVerifyingRegistration(true);
    setRegistrationProbe(null);
    try {
      const res = await fetch('/api/whatsapp/config/verify-registration', {
        method: 'GET',
      });
      const data = (await res.json()) as RegistrationProbe;
      setRegistrationProbe(data);
      if (data.live) {
        toast.success('Number is fully wired — Meta is delivering events.');
      } else {
        toast.error(
          'Number is not fully registered. See the checks below for which step failed.',
          { duration: 8000 }
        );
      }
      if (accountId) await fetchConfig(accountId);
    } catch (err) {
      console.error('verify-registration failed:', err);
      toast.error('Could not reach the verification endpoint.');
    } finally {
      setVerifyingRegistration(false);
    }
  }

  // ============================================================
  // Reset Configuration
  // ============================================================

  async function handleReset() {
    if (!confirm('This will delete the current WhatsApp config so you can re-enter it. Continue?')) {
      return;
    }

    setResetting(true);
    try {
      const res = await fetch('/api/whatsapp/config', { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to reset configuration');
        return;
      }

      toast.success('Configuration cleared. You can now re-enter your credentials.');
      setConfig(null);
      setPhoneNumberId('');
      setWabaId('');
      setAccessToken('');
      setVerifyToken('');
      setTokenEdited(false);
      setConnectionStatus('disconnected');
      setResetReason(null);
      setStatusMessage('');
    } catch (err) {
      console.error('Reset error:', err);
      toast.error('Failed to reset configuration');
    } finally {
      setResetting(false);
    }
  }

  // ============================================================
  // Copy Webhook URL
  // ============================================================

  function handleCopyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied to clipboard');
  }

  // ============================================================
  // Loading State
  // ============================================================

  if (loading) {
    return (
      <section className="animate-in fade-in-50 duration-200">
        <SettingsPanelHead title={t('title')} description={t('description')} />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  const showResetBanner = resetReason === 'token_corrupted';

  // ============================================================
  // Render
  // ============================================================

  return (
    <>
      {/* Meta SDK Script */}
      <Script
        id="facebook-jssdk"
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="afterInteractive"
        onLoad={() => {
          const FB = (window as any).FB;
          if (FB && metaAppId) {
            FB.init({
              appId: metaAppId,
              cookie: true,
              xfbml: true,
              version: 'v18.0',
            });
          }
        }}
      />

      <section className="animate-in fade-in-50 duration-200">
        <SettingsPanelHead title={t('title')} description={t('description')} />

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Main config form */}
          <div className="space-y-6">
            {/* Corrupted-token reset banner */}
            {showResetBanner && (
              <Alert className="bg-amber-950/40 border-amber-600/40">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="size-5 text-amber-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <AlertTitle className="text-amber-200 mb-1">
                      Stored token cannot be decrypted
                    </AlertTitle>
                    <AlertDescription className="text-amber-100/80 text-sm">
                      {statusMessage}
                    </AlertDescription>
                    <Button
                      onClick={handleReset}
                      disabled={resetting}
                      size="sm"
                      className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {resetting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="size-4" />
                          Reset Configuration
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Alert>
            )}

            {/* Connection Status */}
            <Alert className="bg-card border-border">
              <div className="flex items-center gap-2">
                {connectionStatus === 'connected' ? (
                  <CheckCircle2 className="size-4 text-primary" />
                ) : (
                  <XCircle className="size-4 text-red-500" />
                )}
                <AlertTitle className="text-foreground mb-0">
                  {connectionStatus === 'connected'
                    ? 'Connected to WhatsApp API'
                    : 'Not Connected'}
                </AlertTitle>
              </div>
              <AlertDescription className="text-muted-foreground">
                {connectionStatus === 'connected'
                  ? 'Your WhatsApp API credentials are valid and connected.'
                  : statusMessage || 'Configure your API credentials below to connect.'}
              </AlertDescription>
            </Alert>

            {/* Registration Status */}
            {config && (
              <Alert
                className={
                  isRegistered
                    ? 'bg-emerald-950/30 border-emerald-700/50'
                    : 'bg-amber-950/30 border-amber-700/50'
                }
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {isRegistered ? (
                      <CheckCircle2 className="size-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="size-4 text-amber-400" />
                    )}
                    <AlertTitle
                      className={
                        'mb-0 ' + (isRegistered ? 'text-emerald-200' : 'text-amber-200')
                      }
                    >
                      {isRegistered ? 'Registered with Meta' : 'Not Registered'}
                    </AlertTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleVerifyRegistration}
                    disabled={verifyingRegistration}
                    className="border-border bg-transparent text-foreground hover:bg-muted h-7"
                  >
                    {verifyingRegistration ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Zap className="size-3.5" />
                    )}
                    Verify with Meta
                  </Button>
                </div>
                <AlertDescription className="text-muted-foreground mt-2 text-xs leading-relaxed">
                  {isRegistered ? (
                    <span>
                      Subscribed since:{' '}
                      {config.registered_at
                        ? new Date(config.registered_at).toLocaleString()
                        : 'Unknown'}
                    </span>
                  ) : lastRegistrationError ? (
                    <>
                      Last attempt failed: <span className="text-red-300">
                        &quot;{lastRegistrationError}&quot;
                      </span>
                      . Try saving again with a valid PIN.
                    </>
                  ) : (
                    'Complete the setup below to register your number with Meta.'
                  )}
                </AlertDescription>

                {registrationProbe && (
                  <div className="mt-3 rounded border border-border bg-card/60 px-3 py-2 space-y-1.5 text-[11px]">
                    <p className="font-medium text-foreground">
                      Diagnostic: {registrationProbe.live ? '✅ Live' : '❌ Not Live'}
                    </p>
                    <ul className="space-y-0.5 text-muted-foreground">
                      {Object.entries(registrationProbe.checks).map(([k, v]) => (
                        <li key={k} className="flex items-center gap-1.5">
                          {v === true ? (
                            <CheckCircle2 className="size-3 text-emerald-400 shrink-0" />
                          ) : v === false ? (
                            <XCircle className="size-3 text-red-400 shrink-0" />
                          ) : (
                            <span className="size-3 rounded-full border border-border shrink-0" />
                          )}
                          <code className="text-muted-foreground">{k}</code>
                        </li>
                      ))}
                    </ul>
                    {(registrationProbe.errors ?? []).length > 0 && (
                      <ul className="pt-1 space-y-0.5 text-red-300">
                        {registrationProbe.errors?.map((e, i) => (
                          <li key={i}>• {e}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Alert>
            )}

            {/* API Credentials */}
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">API Credentials</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Enter your WhatsApp Business API credentials below.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Phone Number ID</Label>
                  <Input
                    placeholder="e.g. 100234567890123"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">WhatsApp Business Account ID</Label>
                  <Input
                    placeholder="e.g. 100234567890456"
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Access Token</Label>
                  <div className="relative">
                    <Input
                      type={showToken ? 'text' : 'password'}
                      placeholder="Enter your permanent access token"
                      value={accessToken}
                      onChange={(e) => {
                        setAccessToken(e.target.value);
                        setTokenEdited(true);
                      }}
                      onFocus={() => {
                        if (accessToken === MASKED_TOKEN) {
                          setAccessToken('');
                          setTokenEdited(true);
                        }
                      }}
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {config && !tokenEdited && (
                    <p className="text-xs text-muted-foreground">
                      Token is hidden for security. Enter a new one to update.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Webhook Verify Token</Label>
                  <Input
                    placeholder="Create a custom verify token"
                    value={verifyToken}
                    onChange={(e) => setVerifyToken(e.target.value)}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must match the token you set in Meta webhook settings.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    Two-step Verification PIN <span className="ml-1 text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6-digit PIN from Meta Business Manager"
                    value={pin}
                    onChange={(e) =>
                      setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground tracking-widest"
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Needed to register a production number. Get it from Meta Business Manager →
                    WhatsApp Accounts → Phone Numbers → Two-step verification.
                    Leave blank for test numbers.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Webhook URL */}
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Webhook Configuration</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Use this URL as your webhook callback in the Meta App Dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Webhook Callback URL</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={webhookUrl}
                      className="bg-muted border-border text-muted-foreground font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyWebhookUrl}
                      className="shrink-0 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connect WhatsApp Button */}
            <Button
              onClick={handleEmbeddedSignup}
              disabled={isEmbeddedSignupLoading}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all"
            >
              {isEmbeddedSignupLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <Zap className="size-4 mr-2" />
                  Connect WhatsApp with Meta
                </>
              )}
            </Button>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing || !config}
                className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                {testing ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Zap className="size-4 mr-2" />
                    Test API Connection
                  </>
                )}
              </Button>
              {config && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={resetting}
                  className="border-red-900 text-red-400 hover:text-red-300 hover:bg-red-950/40"
                >
                  {resetting ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="size-4 mr-2" />
                      Reset Configuration
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Setup Instructions Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground text-base">Setup Instructions</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Follow these steps to connect your WhatsApp Business API.
                </CardDescription>
              </CardHeader>
              <CardContent>
<div className="space-y-4">
  <div className="border-border">
    <h4 className="font-medium text-foreground">1. Create a Meta App</h4>
    <div className="text-muted-foreground text-sm space-y-1 mt-2">
      <p>• Go to developers.facebook.com</p>
      <p>• Click "My Apps" → "Create App"</p>
      <p>• Select "Business" as the app type</p>
      <p>• Enter your app name and contact email</p>
    </div>
  </div>
  <div className="border-border pt-4">
    <h4 className="font-medium text-foreground">2. Add WhatsApp Product</h4>
    <div className="text-muted-foreground text-sm space-y-1 mt-2">
      <p>• In your app dashboard, click "Add Product"</p>
      <p>• Select "WhatsApp" from the list</p>
      <p>• Click "Set Up" to configure WhatsApp</p>
      <p>• Get your API credentials from the API Setup tab</p>
    </div>
  </div>
  <div className="border-border pt-4">
    <h4 className="font-medium text-foreground">3. Configure Webhook</h4>
    <div className="text-muted-foreground text-sm space-y-1 mt-2">
      <p>• Copy the Webhook URL from above</p>
      <p>• In Meta Dashboard → WhatsApp → API Setup</p>
      <p>• Paste the URL in the Callback URL field</p>
      <p>• Enter the Verify Token you set in the form</p>
      <p>• Click "Save" and "Verify"</p>
    </div>
  </div>
  <div className="border-border pt-4">
    <h4 className="font-medium text-foreground">4. Get Credentials</h4>
    <div className="text-muted-foreground text-sm space-y-1 mt-2">
      <p>• In Meta Dashboard → WhatsApp → API Setup</p>
      <p>• Find your Permanent Access Token</p>
      <p>• Find your Phone Number ID</p>
      <p>• Find your WhatsApp Business Account ID</p>
      <p>• Enter them in the form above and click "Save Configuration"</p>
    </div>
  </div>
</div>

                <div className="mt-4 pt-4 border-t border-border">
                  <a
                    href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    <ExternalLink className="size-3.5" />
                    Meta WhatsApp API Documentation
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
