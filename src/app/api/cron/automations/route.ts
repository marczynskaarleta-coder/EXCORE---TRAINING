import { NextResponse } from 'next/server'
import { processPendingExecutions } from '@/modules/training/automations/engine'

/**
 * Cron endpoint: process pending automation executions.
 * Call every 1-5 minutes from Vercel Cron or external scheduler.
 *
 * Authorization: CRON_SECRET header.
 */
export async function POST(request: Request) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await processPendingExecutions()
  return NextResponse.json(result)
}

// Also allow GET for simpler cron setups
export async function GET(request: Request) {
  return POST(request)
}
