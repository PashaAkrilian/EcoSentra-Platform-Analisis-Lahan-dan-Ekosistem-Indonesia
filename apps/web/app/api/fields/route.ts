// app/api/fields/route.ts
import { NextResponse } from 'next/server';
import { firestore, FieldValue } from '@/config/firebaseAdmin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ message: 'userId is required' }, { status: 400 });
  }

  try {
    const fieldsSnapshot = await firestore.collection('fields').where('userId', '==', userId).get();
    const fields = fieldsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(fields);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newField = {
      ...body,
      createdAt: FieldValue.serverTimestamp(),
    };
    const docRef = await firestore.collection('fields').add(newField);
    return NextResponse.json({ id: docRef.id, ...newField }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
