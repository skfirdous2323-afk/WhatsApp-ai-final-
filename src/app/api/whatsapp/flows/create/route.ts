import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

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

function supabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = await resolveAccountId(supabase, user.id)

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 },
      )
    }

    const admin = supabaseAdmin()

    const { data: config, error: configError } = await admin
      .from('whatsapp_config')
      .select('waba_id, access_token')
      .eq('account_id', accountId)
      .maybeSingle()

    if (configError || !config?.waba_id || !config?.access_token) {
      return NextResponse.json(
        { error: 'WhatsApp configuration not found' },
        { status: 400 },
      )
    }

    const appId = process.env.META_APP_ID
    const appSecret = process.env.META_APP_SECRET

    if (!appId || !appSecret) {
      return NextResponse.json(
        { error: 'Meta App credentials are not configured on the server' },
        { status: 500 },
      )
    }

    const flowName = `ZIVEXO Appointment Booking ${Date.now()}`

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${config.waba_id}/flows`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.access_token}`,
        },
        body: JSON.stringify({
          name: flowName,
          categories: ['APPOINTMENT_BOOKING'],
        }),
      },
    )

    const result = await response.json()

    if (!response.ok) {
      console.error('[Meta Flow Create]', result)

      return NextResponse.json(
        {
          error: 'Meta Flow creation failed',
          details: result,
        },
        { status: response.status },
      )
    }

    return NextResponse.json({
      success: true,
      flow_id: result.id,
      flow_name: flowName,
      meta_response: result,
    })
  } catch (error) {
    console.error('[Meta Flow Create]', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
