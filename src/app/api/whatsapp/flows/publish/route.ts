import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/whatsapp/encryption'

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

const FLOW_JSON = {
  version: '7.2',
  screens: [
    {
      id: 'APPOINTMENT',
      title: 'Book Appointment',
      terminal: true,
      success: true,
      data: {
        doctor_id: {
          type: 'string',
          __example__: '',
        },
        doctor_name: {
          type: 'string',
          __example__: 'Doctor',
        },
        specialization: {
          type: 'string',
          __example__: 'Medical Specialist',
        },
        services: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
              },
              name: {
                type: 'string',
              },
            },
          },
          __example__: [],
        },
      },
      layout: {
        type: 'SingleColumnLayout',
        children: [
          {
            type: 'TextHeading',
            text: 'Appointment Details',
          },
          {
            type: 'TextBody',
            text: 'Complete your details to request an appointment.',
          },
          {
            type: 'TextBody',
            text: 'Doctor: ${data.doctor_name}',
          },
          {
            type: 'Dropdown',
            name: 'service_id',
            label: 'Service',
            required: true,
            'data-source': '${data.services}',
          },
          {
            type: 'CalendarPicker',
            name: 'appointment_date',
            label: 'Date',
            required: true,
          },
          {
            type: 'TextInput',
            name: 'appointment_time',
            label: 'Time',
            'input-type': 'text',
            required: true,
            'helper-text': 'Example: 10:30',
          },
          {
            type: 'TextInput',
            name: 'patient_name',
            label: 'Patient Name',
            required: true,
          },
          {
            type: 'TextInput',
            name: 'age',
            label: 'Age',
            'input-type': 'number',
            required: true,
          },
          {
            type: 'Dropdown',
            name: 'gender',
            label: 'Gender',
            required: true,
            'data-source': [
              {
                id: 'male',
                title: 'Male',
              },
              {
                id: 'female',
                title: 'Female',
              },
              {
                id: 'other',
                title: 'Other',
              },
            ],
          },
          {
            type: 'Footer',
            label: 'Submit Appointment',
            'on-click-action': {
              name: 'complete',
              payload: {
                doctor_id: '${data.doctor_id}',
                doctor_name: '${data.doctor_name}',
                service_id: '${form.service_id}',
                appointment_date: '${form.appointment_date}',
                appointment_time: '${form.appointment_time}',
                patient_name: '${form.patient_name}',
                age: '${form.age}',
                gender: '${form.gender}',
              },
            },
          },
        ],
      },
    },
  ],
}

export async function POST(request: Request) {
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
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const flowId = String(body?.flow_id || '').trim()

    if (!flowId) {
      return NextResponse.json(
        { error: 'flow_id is required' },
        { status: 400 },
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

    const accessToken = decrypt(config.access_token)

    const assetBody = new URLSearchParams({
      asset_type: 'FLOW_JSON',
      asset: JSON.stringify(FLOW_JSON),
    })

    const uploadResponse = await fetch(
      `https://graph.facebook.com/v21.0/${flowId}/assets`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: assetBody.toString(),
      },
    )

    const uploadResult = await uploadResponse.json()

    if (!uploadResponse.ok) {
      console.error('[Meta Flow Asset Upload]', uploadResult)
      return NextResponse.json(
        {
          error: 'Flow JSON upload failed',
          details: uploadResult,
        },
        { status: uploadResponse.status },
      )
    }

    const publishResponse = await fetch(
      `https://graph.facebook.com/v21.0/${flowId}/publish`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    const publishResult = await publishResponse.json()

    if (!publishResponse.ok) {
      console.error('[Meta Flow Publish]', publishResult)
      return NextResponse.json(
        {
          error: 'Flow publish failed',
          upload: uploadResult,
          details: publishResult,
        },
        { status: publishResponse.status },
      )
    }

    return NextResponse.json({
      success: true,
      flow_id: flowId,
      upload: uploadResult,
      publish: publishResult,
    })
  } catch (error) {
    console.error('[Meta Flow Publish]', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
