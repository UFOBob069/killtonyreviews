'use client'

import { useState, useEffect, use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getComedian, submitReview, upvoteReview } from '@/lib/firebase'
import { StarIcon } from '@heroicons/react/24/solid'
import { useAuth } from '@/lib/auth'
import { YoutubeIcon } from 'lucide-react'
import { ReviewData, ComedianData, EpisodeData } from '@/lib/firebase'

// Import social media icons
const InstagramIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

const WebsiteIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
  </svg>
)

// Extend the base types with additional fields we need
interface ExtendedEpisodeData extends EpisodeData {
  status?: 'killed' | 'mixed' | 'bombed';
  notableMoment?: string;
  startTimeSeconds?: number;
  goldenTicket?: boolean;
  episodeId?: string;
}

interface ExtendedComedianData extends ComedianData {
  episodes: ExtendedEpisodeData[];
  youtube?: string;
}

// Update the sort options type
type SortOption = 'date' | 'rating' | 'views' | 'upvotes';

// Client component for reviews
const ReviewsSection = ({ reviews, onReviewSubmit }: { 
  reviews: ReviewData[], 
  onReviewSubmit: (review: Omit<ReviewData, 'id' | 'date' | 'upvotes' | 'upvotedBy' | 'replies'>) => void 
}) => {
  const { user } = useAuth()
  const [newReview, setNewReview] = useState({ rating: 5, text: '' })
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [upvotedReviews, setUpvotedReviews] = useState<Set<string>>(new Set())

  const handleUpvote = async (reviewId: string) => {
    try {
      if (!user) {
        throw new Error('You must be logged in to upvote')
      }

      await upvoteReview(reviewId, user.uid)
      
      // Update local state
      setUpvotedReviews(prev => {
        const newSet = new Set(prev)
        if (newSet.has(reviewId)) {
          newSet.delete(reviewId)
        } else {
          newSet.add(reviewId)
        }
        return newSet
      })
    } catch (error) {
      console.error('Error upvoting review:', error)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (replyingTo) {
      onReviewSubmit({
        ...newReview,
        parentId: replyingTo,
        text: replyText,
        userId: user?.uid || '',
        userName: user?.displayName || 'Anonymous',
      })
      setReplyingTo(null)
      setReplyText('')
    } else {
      onReviewSubmit({
        ...newReview,
        userId: user?.uid || '',
        userName: user?.displayName || 'Anonymous',
      })
      setNewReview({ rating: 5, text: '' })
    }
  }

  const renderReview = (review: ReviewData, level = 0) => (
    <div key={review.id} className={`space-y-4 ${level > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <img
            src={review.userAvatar || '/default-avatar.png'}
            alt={review.userName}
            className="h-10 w-10 rounded-full"
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">{review.userName}</h4>
              <p className="text-sm text-gray-500">{review.date}</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <StarIcon
                    key={i}
                    className={`h-5 w-5 ${
                      i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => setReplyingTo(review.id)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Reply
              </button>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-700">{review.text}</p>
          <div className="mt-2 flex items-center">
            <button 
              onClick={() => handleUpvote(review.id)}
              className={`flex items-center space-x-1 ${
                upvotedReviews.has(review.id)
                  ? 'text-blue-600 hover:text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              disabled={!user}
            >
              <span className="text-xs">{upvotedReviews.has(review.id) ? '▲' : '△'}</span>
              <span>{review.upvotes || 0}</span>
            </button>
          </div>
          {replyingTo === review.id && (
            <form onSubmit={handleSubmit} className="mt-4">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                placeholder="Write your reply..."
                rows={3}
              />
              <div className="mt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Post Reply
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Reviews</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Rating:</label>
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setNewReview({ ...newReview, rating: i + 1 })}
                className="focus:outline-none"
              >
                <StarIcon
                  className={`h-5 w-5 ${
                    i < newReview.rating ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={newReview.text}
          onChange={(e) => setNewReview({ ...newReview, text: e.target.value })}
          className="w-full rounded-md border border-gray-300 p-2"
          placeholder="Write your review..."
          rows={4}
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Submit Review
        </button>
      </form>
      <div className="space-y-6">
        {reviews.map((review) => renderReview(review))}
      </div>
    </div>
  )
}

// Server component for the main page
export default function ComedianPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth()
  const [comedian, setComedian] = useState<ExtendedComedianData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('date')
  const { id: comedianId } = use(params)

  useEffect(() => {
    const fetchComedian = async () => {
      try {
        const data = await getComedian(comedianId);
        if (data) {
          setComedian({
            ...data,
            episodes: data.episodes || []
          } as ExtendedComedianData);
        }
      } catch (err) {
        console.error('Error fetching comedian:', err);
        setError('Failed to load comedian');
      } finally {
        setLoading(false);
      }
    };

    fetchComedian();
  }, [comedianId]);

  const handleSubmitReview = async (review: Omit<ReviewData, 'id' | 'date' | 'upvotes' | 'upvotedBy' | 'replies'>) => {
    try {
      if (!user) {
        throw new Error('You must be logged in to submit a review')
      }

      const reviewData = {
        ...review,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userAvatar: user.photoURL || undefined,
        comedianId,
        rating: review.rating,
        text: review.text,
        date: new Date().toISOString(),
        upvotes: 0,
        upvotedBy: []
      }

      await submitReview(reviewData)
      // Refresh comedian data to show new review
      const updatedComedian = await getComedian(comedianId)
      if (updatedComedian) {
        setComedian({
          ...updatedComedian,
          episodes: updatedComedian.episodes || []
        } as ExtendedComedianData)
      }
    } catch (error) {
      console.error('Error submitting review:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit review')
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  )
  if (error) {
    console.error('Rendering error state:', error);
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    )
  }
  if (!comedian) {
    console.log('No comedian data found');
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500 text-xl">Comedian not found</div>
      </div>
    )
  }

  console.log('Rendering comedian:', comedian);
  console.log('Episodes before rendering:', comedian.episodes);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/3 relative">
            <div className="aspect-square relative">
              <Image
                src={comedian.image || '/default-comedian.jpg'}
                alt={comedian.name}
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <div className="flex gap-3 justify-center">
                {comedian.instagram && (
                  <a
                    href={`https://instagram.com/${comedian.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-blue-400 transition-colors p-2 rounded-full bg-black/30 hover:bg-black/50"
                    title="Instagram"
                  >
                    <InstagramIcon />
                  </a>
                )}
                {comedian.youtube && (
                  <a
                    href={`https://youtube.com/${comedian.youtube}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-red-500 transition-colors p-2 rounded-full bg-black/30 hover:bg-black/50"
                    title="YouTube"
                  >
                    <YoutubeIcon />
                  </a>
                )}
                {comedian.website && (
                  <a
                    href={comedian.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-green-400 transition-colors p-2 rounded-full bg-black/30 hover:bg-black/50"
                    title="Website"
                  >
                    <WebsiteIcon />
                  </a>
                )}
              </div>
            </div>
          </div>
          
          <div className="md:w-2/3 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold">{comedian.name}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                  <span>{comedian.reviews?.length || 0} {comedian.reviews?.length === 1 ? 'Review' : 'Reviews'}</span>
                  {comedian.reviews && comedian.reviews.length > 0 && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400">★</span>
                        <span>
                          {(comedian.reviews.reduce((acc, review) => acc + review.rating, 0) / comedian.reviews.length).toFixed(1)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {comedian.goldenTicket && (
                  <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-sm">
                    🎫 Golden Ticket
                  </span>
                )}
                {comedian.regularGuest && (
                  <span className="bg-gradient-to-r from-blue-400 to-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-sm">
                    🎭 Regular Guest
                  </span>
                )}
                {comedian.hallOfFame && (
                  <span className="bg-gradient-to-r from-purple-400 to-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-sm">
                    🏆 Hall of Fame
                  </span>
                )}
              </div>
            </div>

            <p className="text-gray-700 mb-6 leading-relaxed">{comedian.bio}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              {comedian.firstAppearance && (
                <div>
                  <p className="text-sm text-gray-500">First Appearance</p>
                  <p className="font-semibold">{new Date(comedian.firstAppearance).toLocaleDateString()}</p>
                </div>
              )}
              {comedian.totalAppearances !== undefined && (
                <div>
                  <p className="text-sm text-gray-500">Appearances</p>
                  <p className="font-semibold">{comedian.totalAppearances}</p>
                </div>
              )}
              {comedian.averageRating !== undefined && (
                <div>
                  <p className="text-sm text-gray-500">Average Rating</p>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{comedian.averageRating.toFixed(1)}</span>
                    <span className="text-yellow-400">★</span>
                  </div>
                </div>
              )}
              {comedian.lastAppearance && (
                <div>
                  <p className="text-sm text-gray-500">Last Appearance</p>
                  <p className="font-semibold">{new Date(comedian.lastAppearance).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            {comedian.tags && comedian.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {comedian.tags.map(tag => (
                  <span
                    key={tag}
                    className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Episode History */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Episode History</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {comedian.episodes?.map((episode) => (
            <div key={episode.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-semibold">
                    Episode {episode.number}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {episode.title}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  {episode.rating !== undefined ? (
                    <div className="flex items-center space-x-1">
                      <StarIcon className="h-4 w-4 text-yellow-400" />
                      <span>{episode.rating.toFixed(1)}</span>
                    </div>
                  ) : (
                    <span>Not rated</span>
                  )}
                  {episode.status && (
                    <span className={`text-sm px-2 py-1 rounded-full mt-1 ${
                      episode.status === 'killed' ? 'bg-green-100 text-green-800' :
                      episode.status === 'mixed' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {episode.status.charAt(0).toUpperCase() + episode.status.slice(1)}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(episode.publishedAt).toLocaleDateString()}
                </p>
                {episode.goldenTicket && (
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm">
                    Golden Ticket Winner
                  </span>
                )}
              </div>

              {episode.notableMoment && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 italic">
                  &ldquo;{episode.notableMoment}&rdquo;
                </p>
              )}

              <div className="flex items-center justify-between">
                <a 
                  href={`https://youtube.com/watch?v=${episode.videoId}${episode.startTimeSeconds ? `&t=${episode.startTimeSeconds}` : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-red-600 hover:text-red-700 transition-colors"
                >
                  <YoutubeIcon className="h-5 w-5 mr-1" />
                  Watch
                  {episode.startTimeSeconds && (
                    <span className="ml-1 text-sm">
                      ({Math.floor(episode.startTimeSeconds / 60)}:{(episode.startTimeSeconds % 60).toString().padStart(2, '0')})
                    </span>
                  )}
                </a>
                <Link 
                  href={`/episodes/${episode.episodeId || episode.id}`}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Highlights */}
      {comedian.highlights && comedian.highlights.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-6">Performance Highlights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-4">Top Moments</h3>
              <div className="space-y-4">
                {comedian.highlights.map(highlight => (
                  <div key={highlight.id} className="border-l-4 border-gray-200 pl-4">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h4 className="font-semibold">{highlight.title}</h4>
                        <p className="text-gray-600">
                          Episode #{comedian?.episodes?.find((ep: ExtendedEpisodeData) => ep.id === highlight.episodeId)?.number || highlight.episodeId}
                          {highlight.timestamp && ` • ${highlight.timestamp}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <span>▲</span>
                        <span>{highlight.upvotes || 0}</span>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-2">{highlight.description}</p>
                    {highlight.tags && highlight.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {highlight.tags.map(tag => (
                          <span
                            key={tag}
                            className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fan Reviews */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Fan Reviews</h2>
          <select
            className="p-2 border rounded"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="date">Newest First</option>
            <option value="rating">Highest Rated</option>
            <option value="views">Most Popular</option>
            <option value="upvotes">Most Upvoted</option>
          </select>
        </div>
        <ReviewsSection 
          reviews={comedian.reviews
            ? comedian.reviews.sort((a, b) => {
                switch (sortBy) {
                  case 'date':
                    return new Date(b.date).getTime() - new Date(a.date).getTime()
                  case 'rating':
                    return b.rating - a.rating
                  case 'views':
                  case 'upvotes':
                    return (b.upvotes || 0) - (a.upvotes || 0)
                  default:
                    return 0
                }
              })
            : []
          } 
          onReviewSubmit={handleSubmitReview}
        />
      </div>
    </div>
  )
}