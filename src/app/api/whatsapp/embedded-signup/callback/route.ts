import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/whatsapp/encryption'
import { subscribeWabaToApp } from '@/lib/whatsapp/meta-api'

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

async function resolveAccountId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data?.account_id) return null
  return data.account_id as string
}

async function metaJson(url: string, options?: RequestInit) {
  console.log('[META API REQUEST]', {
    url: url.replace(/(client_secret|input_token|access_token|code)=[^&]+/g, '$1=***'),
    method: options?.method || 'GET',
  })

  const response = await fetch(url, options)
  const data = await response.json().catch(() => null)

  console.log('[META API RESPONSE]', {
    status: response.status,
    ok: response.ok,
    error: data?.error || null,
  })

  if (!response.ok) {
    const message =
      data?.error?.message || `Meta API error: ${response.status}`
    const code = data?.error?.code
    const subcode = data?.error?.error_subcode
    throw new Error(
      `Meta API error${code ? ` (#${code})` : ''}${
        subcode ? ` subcode ${subcode}` : ''
      }: ${message}`,
    )
  }

  return data
}

// ============================================================
// Parse Embedded Signup session from the URL
// ============================================================
type SessionPayload = {
  data?: {
    waba_id?: string
    phone_number_id?: string
    business_id?: string
    page_ids?: string[]
    catalog_ids?: string[]
    dataset_ids?: string[]
    instagram_account_ids?: string[]
  }
  type?: string
  event?: string
}

function parseSession(raw: string | null): SessionPayload | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as SessionPayload
  } catch (err) {
    console.error('[embedded-signup] Failed to parse session JSON:', err)
    return null
  }
}

export async function GET(request: Request) {
  console.log('[Embedded Signup Callback] REQUEST RECEIVED')
  console.log(
    '[Embedded Signup Callback] URL:',
    request.url.replace(/code=[^&]+/, 'code=REDACTED'),
  )

  try {
    const url = new URL(request.url)

    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')
    const sessionRaw = url.searchParams.get('session')

    if (error) {
      console.error('[embedded-signup] Meta authorization error:', error, errorDescription)

      const appUrl =
        process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
        new URL(request.url).origin

      const settingsUrl = new URL('/settings', appUrl)
      settingsUrl.searchParams.set('tab', 'whatsapp')
      settingsUrl.searchParams.set('whatsapp', 'error')
      settingsUrl.searchParams.set(
        'message',
        'WhatsApp connection was cancelled or could not be completed.',
      )

      return NextResponse.redirect(settingsUrl)
    }

    if (!code) {
      const appUrl =
        process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
        new URL(request.url).origin

      const settingsUrl = new URL('/settings', appUrl)
      settingsUrl.searchParams.set('tab', 'whatsapp')
      settingsUrl.searchParams.set('whatsapp', 'error')
      settingsUrl.searchParams.set(
        'message',
        'Meta authorization code is missing. Please connect WhatsApp again.',
      )

      return NextResponse.redirect(settingsUrl)
    }

    // ------------------------------------------------------------
    // Parse the Embedded Signup session — it already contains the
    // WABA ID and phone_number_id we need. This means we DO NOT
    // need to call /me/businesses, so we don't need the
    // business_management permission at all.
    // ------------------------------------------------------------
    const session = parseSession(sessionRaw)

    console.log('[Embedded Signup] Session received:', !!session)
    console.log('[Embedded Signup] Session data:', session?.data || null)

    const sessionWabaId = session?.data?.waba_id
    const sessionPhoneNumberId = session?.data?.phone_number_id

    if (sessionWabaId) {
      console.log('[embedded-signup] WABA from session:', sessionWabaId)
    }
    if (sessionPhoneNumberId) {
      console.log(
        '[embedded-signup] Phone from session:',
        sessionPhoneNumberId,
      )
    }

    const appId = process.env.META_APP_ID
    const appSecret = process.env.META_APP_SECRET

    if (!appId || !appSecret) {
      console.error(
        '[embedded-signup] META_APP_ID or META_APP_SECRET is missing',
      )
      return NextResponse.json(
        {
          success: false,
          error: 'Meta App credentials are not configured on the server.',
        },
        { status: 500 },
      )
    }

    // ------------------------------------------------------------
    // 1. Authenticate CRM user
    // ------------------------------------------------------------
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      )
    }

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Your profile is not linked to an account.',
        },
        { status: 403 },
      )
    }

    // ------------------------------------------------------------
    // 2. Exchange code for access token (only ONCE per code)
    // ------------------------------------------------------------
    const tokenParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      code,
    })

    const tokenData = await metaJson(
      `${META_API_BASE}/oauth/access_token?${tokenParams.toString()}`,
    )

    const accessToken = tokenData?.access_token as string | undefined

    if (!accessToken) {
      throw new Error(
        'Meta did not return an access token during Embedded Signup.',
      )
    }

    // ------------------------------------------------------------
    // 3. Debug token (for logging only, non-fatal)
    // ------------------------------------------------------------
    try {
      const debugParams = new URLSearchParams({
        input_token: accessToken,
        access_token: `${appId}|${appSecret}`,
      })

      const debugData = await metaJson(
        `${META_API_BASE}/debug_token?${debugParams.toString()}`,
      )

      const tokenInfo = debugData?.data
      console.log('[META TOKEN INFO]', {
        is_valid: tokenInfo?.is_valid,
        app_id: tokenInfo?.app_id,
        user_id: tokenInfo?.user_id,
        scopes: tokenInfo?.scopes || [],
        granular_scopes: tokenInfo?.granular_scopes || [],
      })
    } catch (debugErr) {
      console.warn('[embedded-signup] Token debug failed (non-fatal):', debugErr)
    }

    // ------------------------------------------------------------
    // 4. Resolve WABA ID + Phone Number ID
    //    Priority 1: from Embedded Signup session (no extra permission)
    //    Priority 2: fallback to /me/businesses (needs business_management)
    // ------------------------------------------------------------
    let selectedWabaId: string | null = sessionWabaId || null
    let selectedPhoneNumberId: string | null = sessionPhoneNumberId || null

    if (!selectedWabaId || !selectedPhoneNumberId) {
      console.warn(
        '[embedded-signup] Session missing WABA/phone — falling back to /me/businesses',
      )

      // Fallback path — may fail if business_management is missing.
      const businessesData = await metaJson(
        `${META_API_BASE}/me/businesses?fields=id,name`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )

      const businesses = Array.isArray(businessesData?.data)
        ? businessesData.data
        : []

      if (businesses.length === 0) {
        throw new Error(
          'Meta did not return a Business/WABA for this Embedded Signup.',
        )
      }

      for (const business of businesses) {
        if (!business?.id) continue
        try {
          const wabaData = await metaJson(
            `${META_API_BASE}/${business.id}/owned_whatsapp_business_accounts?fields=id,name`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          )
          const wabas = Array.isArray(wabaData?.data) ? wabaData.data : []
          if (wabas.length > 0) {
            selectedWabaId = wabas[0].id
            break
          }
        } catch (err) {
          console.warn(
            `[embedded-signup] Failed to inspect business ${business.id}:`,
            err,
          )
        }
      }

      if (!selectedWabaId) {
        throw new Error(
          'Could not find a WhatsApp Business Account from the Embedded Signup.',
        )
      }
    }

    // ------------------------------------------------------------
    // 5. Fetch phone number details from the WABA
    //    (works with whatsapp_business_management permission)
    // ------------------------------------------------------------
    const phoneData = await metaJson(
      `${META_API_BASE}/${selectedWabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    const phones = Array.isArray(phoneData?.data) ? phoneData.data : []

    if (phones.length === 0) {
      throw new Error(
        'The WhatsApp Business Account has no phone number available.',
      )
    }

    // Prefer the phone that came from the session, if present.
    let phone = phones[0]
    if (selectedPhoneNumberId) {
      const match = phones.find(
        (p: { id: string }) => p.id === selectedPhoneNumberId,
      )
      if (match) phone = match
    }

    const phoneNumberId = phone?.id as string | undefined
    if (!phoneNumberId) {
      throw new Error('Meta did not return a phone_number_id.')
    }

    // ------------------------------------------------------------
    // 6. Prevent another account from claiming the same number
    // ------------------------------------------------------------
    const { data: claimed, error: claimedError } = await supabase
      .from('whatsapp_config')
      .select('account_id')
      .eq('phone_number_id', phoneNumberId)
      .neq('account_id', accountId)
      .maybeSingle()

    if (claimedError) {
      console.error(
        '[embedded-signup] Ownership check failed:',
        claimedError,
      )
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to validate WhatsApp number ownership.',
        },
        { status: 500 },
      )
    }

    if (claimed) {
      return NextResponse.json(
        {
          success: false,
          error: 'This WhatsApp phone number is already linked to another account.',
        },
        { status: 409 },
      )
    }

    // ------------------------------------------------------------
    // 7. Encrypt access token
    // ------------------------------------------------------------
    let encryptedAccessToken: string
    try {
      encryptedAccessToken = encrypt(accessToken)
    } catch (err) {
      console.error(
        '[embedded-signup] Access token encryption failed:',
        err,
      )
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to encrypt the WhatsApp access token. Check ENCRYPTION_KEY.',
        },
        { status: 500 },
      )
    }

    // ------------------------------------------------------------
    // 8. Subscribe the WABA to this app
    //    Embedded Signup previously skipped this step, which left
    //    the number connected in CRM but not subscribed for webhooks.
    // ------------------------------------------------------------
    let subscribedAppsAt: string | null = null

    try {
      await subscribeWabaToApp({
        wabaId: selectedWabaId,
        accessToken,
      })

      subscribedAppsAt = new Date().toISOString()

      console.log('[embedded-signup] WABA subscribed to app:', {
        waba_id: selectedWabaId,
        subscribed_apps_at: subscribedAppsAt,
      })
    } catch (subscriptionError) {
      console.warn(
        '[embedded-signup] WABA subscription failed:',
        subscriptionError,
      )
    }

    // ------------------------------------------------------------
    // 9. Save/update the whatsapp_config row
    // ------------------------------------------------------------
    const { data: existing } = await supabase
      .from('whatsapp_config')
      .select('id, phone_number_id, registered_at, subscribed_apps_at, last_registration_error')
      .eq('account_id', accountId)
      .maybeSingle()

    const existingSameNumber =
      existing?.phone_number_id === phoneNumberId

    const configPayload = {
      account_id: accountId,
      user_id: user.id,
      phone_number_id: phoneNumberId,
      waba_id: selectedWabaId,
      access_token: encryptedAccessToken,
      status: 'connected',
      connected_at: new Date().toISOString(),
      registered_at: existingSameNumber
        ? existing?.registered_at ?? null
        : null,
      subscribed_apps_at: subscribedAppsAt
        ?? (existingSameNumber ? existing?.subscribed_apps_at ?? null : null),
      last_registration_error: existingSameNumber
        ? existing?.last_registration_error ?? null
        : null,
    }

    let savedConfig

    if (existing?.id) {
      const { data, error } = await supabase
        .from('whatsapp_config')
        .update(configPayload)
        .eq('id', existing.id)
        .select('id, phone_number_id, waba_id, status')
        .single()

      if (error) {
        console.error(
          '[embedded-signup] Config update failed:',
          error,
        )
        return NextResponse.json(
          { success: false, error: 'Failed to save WhatsApp configuration.' },
          { status: 500 },
        )
      }

      savedConfig = data
    } else {
      const { data, error } = await supabase
        .from('whatsapp_config')
        .insert(configPayload)
        .select('id, phone_number_id, waba_id, status')
        .single()

      if (error) {
        console.error(
          '[embedded-signup] Config insert failed:',
          error,
        )
        return NextResponse.json(
          { success: false, error: 'Failed to save WhatsApp configuration.' },
          { status: 500 },
        )
      }

      savedConfig = data
    }

    // ------------------------------------------------------------
    // 10. Return the customer to WhatsApp settings
    // ------------------------------------------------------------
    // Do NOT put access tokens, phone IDs, WABA IDs, or other
    // sensitive Meta data in the redirect URL.
    const appUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      new URL(request.url).origin

    const settingsUrl = new URL('/settings', appUrl)
    settingsUrl.searchParams.set('tab', 'whatsapp')
    settingsUrl.searchParams.set('whatsapp', 'connected')

    return NextResponse.redirect(settingsUrl)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown Embedded Signup error'

    console.error('[embedded-signup] Callback failed:', message)

    const appUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      new URL(request.url).origin

    const settingsUrl = new URL('/settings', appUrl)
    settingsUrl.searchParams.set('tab', 'whatsapp')
    settingsUrl.searchParams.set('whatsapp', 'error')

    // Special handling for "code already used"
    if (message.includes('This authorization code has been used')) {
      settingsUrl.searchParams.set(
        'message',
        'This signup session was already used. Please click Connect WhatsApp again to start a fresh signup.',
      )
      return NextResponse.redirect(settingsUrl)
    }

    // Never expose raw Meta/API/database errors in the browser.
    settingsUrl.searchParams.set(
      'message',
      'WhatsApp connection could not be completed. Please try connecting again.',
    )

    return NextResponse.redirect(settingsUrl)
  }
}
