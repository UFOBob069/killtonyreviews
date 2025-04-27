import { NextResponse } from 'next/server'
import { doc, getDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function POST(request: Request) {
  try {
    const { reviewId, userId } = await request.json()

    const reviewRef = doc(db, 'reviews', reviewId)
    const reviewDoc = await getDoc(reviewRef)
    const reviewData = reviewDoc.data()

    if (!reviewData) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    const hasUpvoted = reviewData.upvotedBy?.includes(userId)
    const upvotes = hasUpvoted ? reviewData.upvotes - 1 : reviewData.upvotes + 1
    const upvotedBy = hasUpvoted
      ? arrayRemove(userId)
      : arrayUnion(userId)

    await setDoc(reviewRef, {
      upvotes,
      upvotedBy,
    }, { merge: true })

    return NextResponse.json({
      success: true,
      upvotes,
      hasUpvoted: !hasUpvoted,
    })
  } catch (error) {
    console.error('Error upvoting review:', error)
    return NextResponse.json(
      { error: 'Failed to upvote review' },
      { status: 500 }
    )
  }
} 