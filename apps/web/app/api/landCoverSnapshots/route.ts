// app/api/landCoverSnapshots/route.ts
import { NextResponse } from 'next/server';
import { firestore, FieldValue } from '@/config/firebaseAdmin';
import { CollectionReference, DocumentData, Query } from 'firebase-admin/firestore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fieldId = searchParams.get('fieldId');

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
  try {
    const body = await request.json();
    const newSnapshot = {
      ...body,
      createdAt: FieldValue.serverTimestamp(),
    };
    const docRef = await firestore.collection('landCoverSnapshots').add(newSnapshot);
    return NextResponse.json({ id: docRef.id, ...newSnapshot }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
