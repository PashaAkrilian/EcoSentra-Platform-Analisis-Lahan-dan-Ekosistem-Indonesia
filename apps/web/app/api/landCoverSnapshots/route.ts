// app/api/landCoverSnapshots/route.ts
import { NextResponse } from 'next/server';
import { firestore, FieldValue } from '@/server/firebaseAdmin';
import { CollectionReference, DocumentData, Query } from 'firebase-admin/firestore';
import { parseJsonBody } from '@/lib/validation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fieldId = searchParams.get('fieldId');

  if (fieldId && fieldId.length > 200) {
    return NextResponse.json({ message: 'fieldId must be a reasonable length' }, { status: 400 });
  }

  try {
    let query: CollectionReference<DocumentData> | Query<DocumentData> = firestore.collection('landCoverSnapshots');
    if (fieldId) {
      query = query.where('fieldId', '==', fieldId);
    }
    const snapshotsSnapshot = await query.get();
    const snapshots = snapshotsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(snapshots);
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
    const newSnapshot = {
      ...parsed.data,
      createdAt: FieldValue.serverTimestamp(),
    };
    const docRef = await firestore.collection('landCoverSnapshots').add(newSnapshot);
    return NextResponse.json({ id: docRef.id, ...newSnapshot }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
