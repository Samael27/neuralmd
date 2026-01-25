import { NextResponse } from 'next/server'

export async function GET() {
  // Simple health check - just confirm the app is running
  // DB health can be checked separately via /api/health/db
  return NextResponse.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
}
