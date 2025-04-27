'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getEpisodes } from '@/lib/firebase'
import type { EpisodeData } from '@/lib/firebase'

export default function EpisodesPage() {
  const [sortBy, setSortBy] = useState('number')
  const [filterRating, setFilterRating] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [episodes, setEpisodes] = useState<EpisodeData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEpisodes = async () => {
      try {
        const data = await getEpisodes(50)
        console.log('Raw episodes data:', data)
        if (!data || data.length === 0) {
          setError('No episodes found')
        } else {
          setEpisodes(data)
        }
        setLoading(false)
      } catch (err) {
        console.error('Error fetching episodes:', err)
        setError('Failed to load episodes')
        setLoading(false)
      }
    }

    fetchEpisodes()
  }, [])

  // Filter and sort episodes
  const filteredEpisodes = episodes
    .filter(episode => {
      if (!episode) return false

      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = !searchQuery || 
        (episode.title || '').toLowerCase().includes(searchLower) ||
        (episode.description || '').toLowerCase().includes(searchLower) ||
        episode.number.toString().includes(searchQuery)

      // Rating filter - more permissive
      const matchesRating = filterRating === 'all' ||
        (episode.rating !== undefined && episode.rating >= Number(filterRating))

      return matchesSearch && matchesRating
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.publishedAt || b.date).getTime() - new Date(a.publishedAt || a.date).getTime()
        case 'rating':
          return (b.rating || 0) - (a.rating || 0)
        case 'number':
          return b.number - a.number
        default:
          return 0
      }
    })

  console.log('Filtered episodes:', filteredEpisodes)

  if (loading) return (
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="text-xl text-gray-600">Loading episodes...</div>
    </div>
  )

  if (error) return (
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="text-xl text-red-600">{error}</div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">All Episodes</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search episodes..."
            className="px-4 py-2 border rounded-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          <div className="flex gap-4">
            <select
              className="px-4 py-2 border rounded-md bg-white"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date">Sort by Date</option>
              <option value="rating">Sort by Rating</option>
              <option value="number">Sort by Episode Number</option>
            </select>

            <select
              className="px-4 py-2 border rounded-md bg-white"
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4+ Stars</option>
              <option value="3">3+ Stars</option>
            </select>
          </div>
        </div>
      </div>

      {filteredEpisodes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No episodes found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEpisodes.map((episode) => (
            <Link
              key={episode.id}
              href={`/episodes/${episode.id}`}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="relative aspect-video">
                {episode.videoId ? (
                  <Image
                    src={`https://img.youtube.com/vi/${episode.videoId}/maxresdefault.jpg`}
                    alt={`Kill Tony #${episode.number}`}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No thumbnail</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">#{episode.number}</h2>
                      <h3 className="text-gray-600 mt-1">
                        {episode.title || 'Kid Rock, Mark Normand'}
                      </h3>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(episode.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <span 
                          key={i} 
                          className={`text-lg ${i < Math.round(episode.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {episode.rating ? (
                        <>
                          {episode.rating.toFixed(1)}
                          {episode.totalReviews && (
                            <span className="text-gray-400 ml-1">
                              ({episode.totalReviews} {episode.totalReviews === 1 ? 'review' : 'reviews'})
                            </span>
                          )}
                        </>
                      ) : (
                        'No reviews yet'
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
} 