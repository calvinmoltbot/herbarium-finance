import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'HDW Finance',
    uptime: process.uptime()
  });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
