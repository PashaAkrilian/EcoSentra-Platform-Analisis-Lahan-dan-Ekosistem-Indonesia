// app/api/healthcheck/route.ts
import { NextResponse } from 'next/server';
import { firestore } from '@/config/firebaseAdmin';

export async function GET() {
  try {
    const collections = await firestore.listCollections();
    const collectionIds = collections.map((col) => col.id);
    return NextResponse.json({ status: 'ok', collections: collectionIds });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}
