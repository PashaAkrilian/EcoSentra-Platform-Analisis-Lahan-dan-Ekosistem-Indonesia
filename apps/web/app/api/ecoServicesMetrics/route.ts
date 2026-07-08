// app/api/ecoServicesMetrics/route.ts
import { NextResponse } from 'next/server';
import { firestore, FieldValue } from '@/config/firebaseAdmin';

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
  try {
    const body = await request.json();
    const newMetric = {
      ...body,
      createdAt: FieldValue.serverTimestamp(),
    };
    const docRef = await firestore.collection('ecoServicesMetrics').add(newMetric);
    return NextResponse.json({ id: docRef.id, ...newMetric }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
