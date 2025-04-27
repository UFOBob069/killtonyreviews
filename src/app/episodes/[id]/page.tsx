'use client'

import { useState, useEffect, use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getEpisode, submitReview, upvoteReview, submitBit, upvoteBit } from '@/lib/firebase'
import { useAuth } from '@/lib/auth'
import type { EpisodeData, ReviewData, Bit } from '@/lib/firebase'

interface ExtendedReviewData extends ReviewData {
  user?: {
    name: string;
    image: string;
  };
}

const calculateAverageRating = (reviews: ReviewData[] = []): { average: number, total: number } => {
  const validReviews = reviews.filter(review => !review.parentId && typeof review.rating === 'number');
  if (validReviews.length === 0) return { average: 0, total: 0 };
  
  const sum = validReviews.reduce((acc, review) => acc + review.rating, 0);
  return {
    average: Math.round((sum / validReviews.length) * 10) / 10, // Round to 1 decimal place
    total: validReviews.length
  };
};

const convertTimestampToSeconds = (timestamp: string): number => {
  console.log('Converting timestamp:', timestamp);
  const parts = timestamp.split(':').map(Number);
  
  let seconds = 0;
  if (parts.length === 3) {
    // HH:MM:SS format
    seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS format
    seconds = parts[0] * 60 + parts[1];
  } else {
    console.error('Invalid timestamp format:', timestamp);
    return 0;
  }
  
  console.log('Converted to seconds:', seconds);
  return seconds;
};

const getYouTubeEmbedUrl = (videoId: string, timestamp?: string | null): string => {
  const baseUrl = `https://www.youtube.com/embed/${videoId}`;
  if (!timestamp) return `${baseUrl}?enablejsapi=1`;
  
  const seconds = convertTimestampToSeconds(timestamp);
  const url = `${baseUrl}?enablejsapi=1&start=${seconds}&autoplay=1&rel=0`;
  console.log('Generated YouTube URL:', url);
  return url;
};

export default function EpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth()
  const resolvedParams = use(params)
  const episodeId = resolvedParams.id

  const [episodeData, setEpisodeData] = useState<EpisodeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newEpisodeReview, setNewEpisodeReview] = useState({
    rating: 5,
    text: ''
  })
  const [newBit, setNewBit] = useState<{
    title: string;
    description: string;
    category: Bit['category'];
    tags: string[];
    timestamp: string;
  }>({
    title: '',
    description: '',
    category: 'other',
    tags: [],
    timestamp: ''
  })
  const [upvotedReviews, setUpvotedReviews] = useState<Set<string>>(new Set())
  const [upvotedBits, setUpvotedBits] = useState<Set<string>>(new Set())
  const [reviewStats, setReviewStats] = useState<{ average: number, total: number }>({ average: 0, total: 0 })
  const [currentTimestamp, setCurrentTimestamp] = useState<string | null>(null)

  useEffect(() => {
    const fetchEpisode = async () => {
      try {
        // Directly use the ID to fetch the episode
        const data = await getEpisode(episodeId);
        console.log('Episode Data:', data);
        console.log('Comedians:', data?.comedians);
        console.log('Highlights:', data?.highlights);
        setEpisodeData(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load episode');
        console.error(err);
        setLoading(false);
      }
    }

    fetchEpisode();
  }, [episodeId]);

  useEffect(() => {
    if (episodeData?.reviews) {
      setReviewStats(calculateAverageRating(episodeData.reviews));
    }
  }, [episodeData?.reviews]);

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!episodeData) return <div>Episode not found</div>

  const handleUpvote = async (reviewId: string) => {
    try {
      if (!user) {
        throw new Error('You must be logged in to upvote');
      }

      await upvoteReview(reviewId, user.uid);
      
      // Update local state
      setUpvotedReviews(prev => {
        const newSet = new Set(prev);
        if (newSet.has(reviewId)) {
          newSet.delete(reviewId);
        } else {
          newSet.add(reviewId);
        }
        return newSet;
      });

      // Refresh the episode data to show updated upvotes
      const updatedEpisode = await getEpisode(episodeId);
      setEpisodeData(updatedEpisode);
    } catch (error) {
      console.error('Error upvoting review:', error);
    }
  };

  const handleSubmitEpisodeReview = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!user) {
        throw new Error('You must be logged in to submit a review')
      }

      const review = {
        rating: newEpisodeReview.rating,
        text: newEpisodeReview.text,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        episodeId: episodeData?.id,
        upvotedBy: [],
        replies: []
      }
      
      await submitReview(review)

      // Clear the form
      setNewEpisodeReview({ rating: 5, text: '' })
      
      // Refresh the episode data to show the new review
      const updatedEpisode = await getEpisode(episodeId)
      setEpisodeData(updatedEpisode)
    } catch (error) {
      console.error('Error submitting review:', error)
    }
  }

  const handleUpvoteBit = async (bitId: string) => {
    try {
      if (!user) {
        throw new Error('You must be logged in to upvote')
      }

      await upvoteBit(bitId, user.uid)
      
      // Update local state
      setUpvotedBits(prev => {
        const newSet = new Set(prev)
        if (newSet.has(bitId)) {
          newSet.delete(bitId)
        } else {
          newSet.add(bitId)
        }
        return newSet
      })

      // Refresh episode data to show updated upvotes
      const updatedEpisode = await getEpisode(episodeId)
      setEpisodeData(updatedEpisode)
    } catch (error) {
      console.error('Error upvoting bit:', error)
    }
  }

  const handleSubmitBit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!user) {
        throw new Error('You must be logged in to submit a bit')
      }

      if (!episodeData?.id) {
        throw new Error('Episode ID is required')
      }

      if (!newBit.timestamp) {
        throw new Error('Timestamp is required')
      }

      const bitData: Omit<Bit, 'id' | 'upvotes' | 'upvotedBy'> = {
        title: newBit.title,
        description: newBit.description,
        category: newBit.category,
        tags: newBit.tags,
        timestamp: newBit.timestamp,
        episodeId: episodeData.id,
        userId: user.uid,
        userName: user.displayName || 'Anonymous'
      }

      await submitBit(bitData)
      
      // Clear the form
      setNewBit({
        title: '',
        description: '',
        category: 'other',
        tags: [],
        timestamp: ''
      })
      
      // Refresh episode data to show new bit
      const updatedEpisode = await getEpisode(episodeId)
      setEpisodeData(updatedEpisode)
    } catch (error) {
      console.error('Error submitting bit:', error)
    }
  }

  const jumpToTimestamp = (timestamp: string) => {
    console.log('Jumping to timestamp:', timestamp);
    setCurrentTimestamp(timestamp);
    const iframe = document.querySelector('iframe');
    if (iframe) {
      const newUrl = getYouTubeEmbedUrl(episodeData?.videoId || '', timestamp);
      console.log('Setting iframe src to:', newUrl);
      iframe.src = newUrl;
      
      // Force reload the iframe
      setTimeout(() => {
        iframe.src = iframe.src;
      }, 100);
    }
  };

  const renderReview = (review: ExtendedReviewData, isReply = false) => (
    <div key={review.id} className={`${isReply ? 'ml-8 border-l border-gray-100 pl-4' : ''}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-gray-100 rounded-full overflow-hidden">
            {review.userAvatar ? (
              <Image
                src={review.userAvatar}
                alt={review.userName}
                width={32}
                height={32}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                {(review.userName?.[0] || '?').toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div>
              <span className="font-medium text-gray-900">{review.userName}</span>
              <span className="mx-2 text-gray-300">•</span>
              <span className="text-sm text-gray-500">{review.date}</span>
            </div>
            {!isReply && (
              <div className="flex text-yellow-400 text-sm">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={i < review.rating ? 'text-yellow-400' : 'text-gray-200'}>
                    ★
                  </span>
                ))}
              </div>
            )}
          </div>
          <p className="text-gray-700 text-sm whitespace-pre-wrap">{review.text}</p>
          <div className="flex items-center gap-4 mt-2">
            <button 
              onClick={() => handleUpvote(review.id)}
              className={`flex items-center gap-1 text-sm ${
                upvotedReviews.has(review.id) 
                  ? 'text-blue-600 hover:text-blue-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              disabled={!user}
            >
              <span className="text-xs">{upvotedReviews.has(review.id) ? '▲' : '△'}</span>
              <span className="font-medium">{review.upvotes || 0}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content - Center */}
        <main className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-3xl font-bold mb-4">{episodeData.title || 'Untitled Episode'}</h1>
            <div className="flex items-center text-sm text-gray-600 mb-6">
              <span>{episodeData.publishedAt ? new Date(episodeData.publishedAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'No date'}</span>
              {episodeData.location && (
                <>
                  <span className="mx-2">•</span>
                  <span>{episodeData.location}</span>
                </>
              )}
            </div>

            {/* Summary */}
            {episodeData.summary && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Episode Summary</h2>
                <p className="text-gray-700 leading-relaxed">{episodeData.summary}</p>
              </div>
            )}

            {/* Highlights */}
            {episodeData.highlights && episodeData.highlights.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Episode Highlights</h2>
                <div className="space-y-3">
                  {episodeData.highlights.map((highlight, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-semibold text-sm">
                        {index + 1}
                      </div>
                      <p className="text-gray-700">{typeof highlight === 'string' ? highlight : highlight.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Featured Comedians */}
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Featured Comedians</h2>
              <div className="grid grid-cols-1 gap-4">
                {episodeData.comedians?.map((comedian) => {
                  // Get the performance data for this episode
                  const performance = comedian.performances?.[0];
                  
                  return (
                    <div 
                      key={comedian.id} 
                      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 relative flex-shrink-0">
                          {comedian.image ? (
                            <Image
                              src={comedian.image}
                              alt={comedian.name}
                              fill
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-lg font-medium">
                              {comedian.name[0]}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <Link 
                                href={`/comedians/${comedian.id}`}
                                className="text-lg font-medium hover:text-blue-600 transition-colors"
                              >
                                {comedian.name}
                              </Link>
                              {performance?.startTime && (
                                <button
                                  onClick={() => jumpToTimestamp(performance.startTime)}
                                  className="ml-3 text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                                >
                                  <span>{performance.startTime}</span>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {comedian.goldenTicket && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  🎫 Golden Ticket
                                </span>
                              )}
                              {comedian.regularGuest && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  🎭 Regular
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {performance?.tags && performance.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {performance.tags.map((tag, index) => (
                                <span 
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bit Tracker */}
          <div id="bits" className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Bit Tracker</h2>
              {user && (
                <button
                  onClick={() => document.getElementById('add-bit-form')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Bit
                </button>
              )}
            </div>
            
            {episodeData?.bits && episodeData.bits.length > 0 ? (
              <div className="space-y-4 mb-8">
                {episodeData.bits.map((bit: Bit) => (
                  <div key={bit.id} className="group hover:bg-gray-50 p-3 -mx-3 rounded-lg transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <button
                            onClick={() => jumpToTimestamp(bit.timestamp)}
                            className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                          >
                            <span>{bit.timestamp}</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-600 capitalize text-sm">{bit.category}</span>
                        </div>
                        <h4 className="font-medium text-gray-900 truncate">{bit.title}</h4>
                        <p className="text-gray-600 text-sm mt-1 line-clamp-2">{bit.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => handleUpvoteBit(bit.id)}
                          className={`flex items-center gap-1 px-2 py-1 rounded ${
                            upvotedBits.has(bit.id)
                              ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                          disabled={!user}
                        >
                          <span className="text-xs">▲</span>
                          <span className="text-sm font-medium">{bit.upvotes}</span>
                        </button>
                      </div>
                    </div>
                    {bit.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {bit.tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No bits tracked yet.</p>
            )}

            {/* Submit New Bit Form */}
            {user && (
              <form id="add-bit-form" onSubmit={handleSubmitBit} className="border-t pt-6 mt-6 space-y-4">
                <h3 className="text-lg font-semibold">Add a Bit</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium">Timestamp</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded"
                      value={newBit.timestamp}
                      onChange={(e) => setNewBit({ ...newBit, timestamp: e.target.value })}
                      placeholder="HH:MM:SS or MM:SS"
                      pattern="([0-9]{1,2}:)?[0-9]{1,2}:[0-9]{2}"
                      title="Enter time in HH:MM:SS or MM:SS format"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium">Category</label>
                    <select
                      className="w-full p-2 border rounded bg-white"
                      value={newBit.category}
                      onChange={(e) => setNewBit({ ...newBit, category: e.target.value as Bit['category'] })}
                    >
                      <option value="bomb">Bomb</option>
                      <option value="roast">Roast</option>
                      <option value="comeback">Comeback</option>
                      <option value="sound-effect">Sound Effect</option>
                      <option value="musical-burn">Musical Burn</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium">Title</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={newBit.title}
                    onChange={(e) => setNewBit({ ...newBit, title: e.target.value })}
                    placeholder="Brief title for the bit"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium">Description</label>
                  <textarea
                    className="w-full p-2 border rounded"
                    rows={3}
                    value={newBit.description}
                    onChange={(e) => setNewBit({ ...newBit, description: e.target.value })}
                    placeholder="Describe what happens in this bit..."
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium">Tags</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={newBit.tags.join(', ')}
                    onChange={(e) => setNewBit({ ...newBit, tags: e.target.value.split(',').map(t => t.trim()) })}
                    placeholder="e.g., hans-kim, tony-hinchcliffe"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  Submit Bit
                </button>
              </form>
            )}
          </div>

          {/* Reviews */}
          <div id="reviews" className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Reviews</h2>
              {user && (
                <button
                  onClick={() => document.getElementById('write-review-form')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Write Review
                </button>
              )}
            </div>

            {user && (
              <form onSubmit={handleSubmitEpisodeReview} className="mb-8 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Write a Review</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex text-yellow-400 text-2xl mb-2">
                      {[...Array(5)].map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setNewEpisodeReview({ ...newEpisodeReview, rating: i + 1 })}
                          className={`focus:outline-none ${i < newEpisodeReview.rating ? 'text-yellow-400' : 'text-gray-200'}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="w-full p-2 border rounded text-sm"
                      rows={4}
                      value={newEpisodeReview.text}
                      onChange={(e) => setNewEpisodeReview({ ...newEpisodeReview, text: e.target.value })}
                      placeholder="Share your thoughts about this episode..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Submit Review
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-6">
              {episodeData?.reviews && episodeData.reviews.length > 0 ? (
                episodeData.reviews
                  .filter(review => !review.parentId)
                  .sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0))  // Sort by upvotes in descending order
                  .map(review => renderReview(review))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No reviews yet. Be the first to review this episode!
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="lg:col-span-4">
          <div className="sticky top-8 space-y-6">
            {/* Video Embed */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="aspect-video mb-4">
                {episodeData?.videoId ? (
                  <iframe
                    width="100%"
                    height="100%"
                    src={getYouTubeEmbedUrl(episodeData.videoId, currentTimestamp)}
                    title={episodeData.title || 'YouTube video player'}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="rounded-lg w-full h-full"
                  />
                ) : (
                  <div className="h-full w-full bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400">No video available</span>
                  </div>
                )}
              </div>

              {/* Stats and Navigation */}
              <div className="border-t border-gray-100 pt-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500">Episode Stats</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex text-yellow-400 text-sm">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < Math.round(reviewStats.average) ? 'text-yellow-400' : 'text-gray-200'}>
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-sm">
                      <span className="font-medium">{reviewStats.average.toFixed(1)}</span>
                      <span className="text-gray-500 ml-1">({reviewStats.total})</span>
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href="#bits"
                    className="flex-1 text-center px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Bit Tracker
                  </a>
                  <a
                    href="#reviews"
                    className="flex-1 text-center px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Reviews
                  </a>
                </div>
              </div>
              
              {/* Description */}
              {episodeData.description && (
                <div className="prose max-w-none text-gray-600 border-t border-gray-100 pt-4">
                  <p className="whitespace-pre-wrap text-sm">{episodeData.description}</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
} 