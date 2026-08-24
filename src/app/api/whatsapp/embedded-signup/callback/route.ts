import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/whatsapp/encryption'

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

async function metaJson(
  url: string,
  options?: RequestInit,
) {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `Meta API error: ${response.status}`

    throw new Error(message)
  }

  return data
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)

    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error,
          error_description: errorDescription,
        },
        { status: 400 },
      )
    }

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing Meta authorization code',
        },
        { status: 400 },
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
    // 1. Authenticate the CRM user
    // ------------------------------------------------------------

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
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
    // 2. Exchange Embedded Signup authorization code
    //    for a Meta access token.
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
    // 3. Inspect the token so we can identify the Meta user/app.
    // ------------------------------------------------------------

    const debugParams = new URLSearchParams({
      input_token: accessToken,
      access_token: `${appId}|${appSecret}`,
    })

    const debugData = await metaJson(
      `${META_API_BASE}/debug_token?${debugParams.toString()}`,
    )

    const tokenInfo = debugData?.data

    if (!tokenInfo?.is_valid) {
      throw new Error('Meta returned an invalid Embedded Signup token.')
    }

    // ------------------------------------------------------------
    // 4. Find businesses available to this Meta user.
    // ------------------------------------------------------------

    const businessesData = await metaJson(
      `${META_API_BASE}/me/businesses?fields=id,name`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    const businesses = Array.isArray(businessesData?.data)
      ? businessesData.data
      : []

    if (businesses.length === 0) {
      throw new Error(
        'Meta did not return a Business/WABA for this Embedded Signup.',
      )
    }

    // ------------------------------------------------------------
    // 5. Find WhatsApp Business Accounts under the businesses.
    // ------------------------------------------------------------

    let selectedWabaId: string | null = null
    let selectedWabaName: string | null = null

    for (const business of businesses) {
      if (!business?.id) continue

      try {
        const wabaData = await metaJson(
          `${META_API_BASE}/${business.id}/owned_whatsapp_business_accounts?fields=id,name`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        )

        const wabas = Array.isArray(wabaData?.data)
          ? wabaData.data
          : []

        if (wabas.length > 0) {
          selectedWabaId = wabas[0].id
          selectedWabaName = wabas[0].name || null
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

    // ------------------------------------------------------------
    // 6. Find the phone number belonging to the WABA.
    // ------------------------------------------------------------

    const phoneData = await metaJson(
      `${META_API_BASE}/${selectedWabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    const phones = Array.isArray(phoneData?.data)
      ? phoneData.data
      : []

    if (phones.length === 0) {
      throw new Error(
        'The WhatsApp Business Account has no phone number available.',
      )
    }

    if (phones.length > 1) {
      console.warn(
        `[embedded-signup] Multiple phone numbers returned for WABA ${selectedWabaId}; selecting the first one.`,
      )
    }

    const phone = phones[0]

    const phoneNumberId = phone?.id as string | undefined

    if (!phoneNumberId) {
      throw new Error(
        'Meta did not return a phone_number_id.',
      )
    }

    // ------------------------------------------------------------
    // 7. Prevent another account from claiming the same number.
    // ------------------------------------------------------------

    const { data: claimed, error: claimedError } =
      await supabase
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
          error:
            'This WhatsApp phone number is already linked to another account.',
        },
        { status: 409 },
      )
    }

    // ------------------------------------------------------------
    // 8. Encrypt the Meta access token.
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
          error:
            'Failed to encrypt the WhatsApp access token. Check ENCRYPTION_KEY.',
        },
        { status: 500 },
      )
    }

    // ------------------------------------------------------------
    // 9. Save/update the existing whatsapp_config row.
    // ------------------------------------------------------------

    const { data: existing } = await supabase
      .from('whatsapp_config')
      .select('id')
      .eq('account_id', accountId)
      .maybeSingle()

    const configPayload = {
      account_id: accountId,
      user_id: user.id,
      phone_number_id: phoneNumberId,
      waba_id: selectedWabaId,
      access_token: encryptedAccessToken,
      status: 'connected',
      connected_at: new Date().toISOString(),
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
          {
            success: false,
            error: 'Failed to save WhatsApp configuration.',
          },
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
          {
            success: false,
            error: 'Failed to save WhatsApp configuration.',
          },
          { status: 500 },
        )
      }

      savedConfig = data
    }

    // ------------------------------------------------------------
    // 10. Return only safe information to the browser.
    //     NEVER return accessToken/appSecret.
    // ------------------------------------------------------------

    return NextResponse.json({
      success: true,
      connected: true,
      whatsapp: {
        phone_number_id: savedConfig.phone_number_id,
        waba_id: savedConfig.waba_id,
        display_phone_number:
          phone.display_phone_number || null,
        verified_name:
          phone.verified_name || null,
        quality_rating:
          phone.quality_rating || null,
        waba_name: selectedWabaName,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown Embedded Signup error'

    console.error(
      '[embedded-signup] Callback failed:',
      message,
    )

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 },
    )
  }
}
