import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/whatsapp/encryption'

function supabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const flowId = String(body?.flow_id || '').trim()

    if (!flowId) {
      return NextResponse.json({ error: 'flow_id is required' }, { status: 400 })
    }

    const admin = supabaseAdmin()

    const { data: profile } = await admin
      .from('profiles')
      .select('account_id')
      .eq('id', user.id)
      .single()

    if (!profile?.account_id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 400 })
    }

    const { data: config, error: configError } = await admin
      .from('whatsapp_config')
      .select('waba_id, access_token')
      .eq('account_id', profile.account_id)
      .maybeSingle()

    if (configError || !config?.access_token) {
      return NextResponse.json(
        { error: 'WhatsApp configuration not found' },
        { status: 400 },
      )
    }

    const accessToken = decrypt(config.access_token)

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${flowId}?fields=id,name,status,categories,validation_errors`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    const result = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Meta Flow status check failed', details: result },
        { status: response.status },
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Meta Flow Status]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
