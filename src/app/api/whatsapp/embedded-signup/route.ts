import { NextResponse } from 'next/server'

export async function GET() {
  const appId = process.env.META_APP_ID

  if (!appId) {
    return NextResponse.json(
      { error: 'META_APP_ID is not configured' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    appId,
  })
}
