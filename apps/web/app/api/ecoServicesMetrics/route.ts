// app/api/ecoServicesMetrics/route.ts
import { NextResponse } from 'next/server';
import { firestore, FieldValue } from '@/server/firebaseAdmin';
import { parseJsonBody } from '@/lib/validation';

export async function GET() {
  try {
    const metricsSnapshot = await firestore.collection('ecoServicesMetrics').get();
    const metrics = metricsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(metrics);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.message }, { status: parsed.status });
  }

  try {
    const newMetric = {
      ...parsed.data,
      createdAt: FieldValue.serverTimestamp(),
    };
    const docRef = await firestore.collection('ecoServicesMetrics').add(newMetric);
    return NextResponse.json({ id: docRef.id, ...newMetric }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
