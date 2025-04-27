// File: src/app/api/admin/create-episode/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import type { ComicInfo, TranscriptEntry } from '../process-video/route';

// Initialize Firebase Admin SDK
const adminApp =
  getApps().length === 0
    ? initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      })
    : getApps()[0];
const db = getFirestore(adminApp);
const auth = getAuth(adminApp);

async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const decoded = await auth.verifyIdToken(token);
    
    // First check custom claims
    if (decoded.admin === true) {
      return true;
    }

    // Fallback to checking Firestore admins collection
    const adminDoc = await db.collection('admins').doc(decoded.uid).get();
    if (adminDoc.exists) {
      // Set the admin custom claim for future use
      await auth.setCustomUserClaims(decoded.uid, { admin: true });
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error verifying admin token:', error);
    return false;
  }
}

export async function POST(request: Request) {
  // Expect Authorization: Bearer <idToken>
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const idToken = authHeader.split('Bearer ')[1];
  if (!(await verifyAdminToken(idToken))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const data = (await request.json()) as {
    videoId: string;
    title: string;
    description: string;
    publishedAt: string;
    thumbnail: string;
    transcript: TranscriptEntry[];
    episodeSummary: string;
    highlights: string[];
    comics: ComicInfo[];
    tags: string[];
    number: number;
  };

  try {
    // Create episode document
    const epRef = await db.collection('episodes').add({
      videoId: data.videoId,
      title: data.title,
      description: data.description,
      publishedAt: data.publishedAt,
      thumbnail: data.thumbnail,
      summary: data.episodeSummary,
      highlights: data.highlights,
      tags: data.tags,
      transcript: data.transcript,
      number: data.number,
      createdAt: new Date().toISOString(),
    });

    // For each comic, update or create profile and add to performances subcollection
    for (const comic of data.comics) {
      const key = comic.name.toLowerCase().replace(/\s+/g, '-');
      const comicRef = db.collection('comedians').doc(key);
      const snap = await comicRef.get();
      const comicData = snap.data();
      
      if (snap.exists) {
        await comicRef.update({
          totalAppearances: (comicData?.totalAppearances || 0) + 1,
          lastAppearance: data.publishedAt,
        });
      } else {
        await comicRef.set({
          name: comic.name,
          instagram: '',
          website: '',
          totalAppearances: 1,
          lastAppearance: data.publishedAt,
          createdAt: new Date().toISOString(),
        });
      }
      // add performance record
      await comicRef.collection('performances').add({
        episodeId: epRef.id,
        startTime: comic.startTime,
        tags: comic.tags,
      });
    }

    return NextResponse.json({ success: true, episodeId: epRef.id });
  } catch (error: unknown) {
    console.error('Error creating episode:', error);
    const message = error instanceof Error ? error.message : 'Failed to create episode';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
