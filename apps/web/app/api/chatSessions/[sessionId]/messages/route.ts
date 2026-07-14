// app/api/chatSessions/[sessionId]/messages/route.ts
import { NextResponse } from 'next/server';
import { firestore, FieldValue } from '@/server/firebaseAdmin';
import { parseJsonBody } from '@/lib/validation';

export async function GET(request: Request, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params;

  try {
    const messagesSnapshot = await firestore.collection('chatSessions').doc(sessionId).collection('messages').orderBy('createdAt').get();
    const messages = messagesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(messages);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params;

  if (!sessionId || sessionId.length > 200) {
    return NextResponse.json({ message: 'sessionId tidak valid' }, { status: 400 });
  }

  const parsed = await parseJsonBody(request);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.message }, { status: parsed.status });
  }

  try {
    const newMessage = {
      ...parsed.data,
      createdAt: FieldValue.serverTimestamp(),
    };
    const docRef = await firestore.collection('chatSessions').doc(sessionId).collection('messages').add(newMessage);
    return NextResponse.json({ id: docRef.id, ...newMessage }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
