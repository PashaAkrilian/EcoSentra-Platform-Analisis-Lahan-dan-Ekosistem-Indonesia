// app/api/alerts/route.ts
import { NextResponse } from 'next/server';
import { firestore, FieldValue } from '@/server/firebaseAdmin';
import { parseJsonBody } from '@/lib/validation';

export async function GET() {
  try {
    const alertsSnapshot = await firestore.collection('alerts').get();
    const alerts = alertsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(alerts);
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
    const newAlert = {
      ...parsed.data,
      createdAt: FieldValue.serverTimestamp(),
    };
    const docRef = await firestore.collection('alerts').add(newAlert);
    return NextResponse.json({ id: docRef.id, ...newAlert }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
