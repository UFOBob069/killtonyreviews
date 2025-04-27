import { NextResponse } from 'next/server'
import { doc, setDoc, collection, addDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function POST(request: Request) {
  try {
    const {
      episodeId,
      comedianId,
      userId,
      userName,
      rating,
      comment,
      parentId,
    } = await request.json()

    // Create review document
    const reviewRef = await addDoc(collection(db, 'reviews'), {
      episodeId,
      comedianId,
      userId,
      userName,
      rating,
      comment,
      parentId,
      createdAt: new Date().toISOString(),
      upvotes: 0,
      replies: [],
    })

    // If this is a reply, update the parent review
    if (parentId) {
      const parentRef = doc(db, 'reviews', parentId)
      const parentDoc = await getDoc(parentRef)
      const parentData = parentDoc.data()
      
      if (parentData) {
        await setDoc(parentRef, {
          ...parentData,
          replies: [...(parentData.replies || []), reviewRef.id],
        }, { merge: true })
      }
    }

    return NextResponse.json({
      success: true,
      reviewId: reviewRef.id,
    })
  } catch (error) {
    console.error('Error submitting review:', error)
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    )
  }
} 