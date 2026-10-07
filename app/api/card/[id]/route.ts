import { NextResponse } from 'next/server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log(`[API] /api/card/${id} requested`);
  await new Promise((r) => setTimeout(r, 400)); // simulate latency
  return NextResponse.json({ id, title: `Card #${id}`, body: `Data loaded for card ${id}` });
}