// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { firestore, FieldValue } from '@/config/firebaseAdmin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      const userDoc = await firestore.collection('users').doc(id).get();
      if (!userDoc.exists) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }
      return NextResponse.json(userDoc.data());
    }

    const usersSnapshot = await firestore.collection('users').get();
    const users = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(users);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newUser = {
      ...body,
      createdAt: FieldValue.serverTimestamp(),
    };
    const docRef = await firestore.collection('users').add(newUser);
    return NextResponse.json({ id: docRef.id, ...newUser }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
