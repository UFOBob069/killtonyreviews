'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getComedians } from '@/lib/firebase'
import type { ComedianData } from '@/lib/firebase'

export default function ComediansPage() {
  const [comedians, setComedians] = useState<ComedianData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('appearances')

  useEffect(() => {
    const fetchComedians = async () => {
      try {
        const data = await getComedians()
        setComedians(data)
      } catch (err) {
        setError('Failed to load comedians')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchComedians()
  }, [])

  const filteredComedians = comedians
    .filter(comedian => {
      // Search filter
      const matchesSearch = comedian.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comedian.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comedian.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        false

      // Category filter
      switch (filter) {
        case 'goldenTicket':
          return matchesSearch && comedian.goldenTicket
        case 'regulars':
          return matchesSearch && comedian.regularGuest
        default:
          return matchesSearch
      }
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          const ratingA = a.reviews?.length ? a.reviews.reduce((acc, review) => acc + review.rating, 0) / a.reviews.length : 0
          const ratingB = b.reviews?.length ? b.reviews.reduce((acc, review) => acc + review.rating, 0) / b.reviews.length : 0
          return ratingB - ratingA
        case 'reviews':
          return (b.reviews?.length || 0) - (a.reviews?.length || 0)
        case 'appearances':
        default:
          return (b.totalAppearances || 0) - (a.totalAppearances || 0)
      }
    })

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  )

  if (error) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-red-500 text-xl">{error}</div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Comedians</h1>
          <p className="text-gray-600 mt-2">
            {filteredComedians.length} comedian{filteredComedians.length !== 1 ? 's' : ''} found
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search comedians..."
            className="px-4 py-2 border rounded-md min-w-[250px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          <div className="flex gap-2">
            <select
              className="px-4 py-2 border rounded-md"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All Comedians</option>
              <option value="goldenTicket">Golden Ticket Winners</option>
              <option value="regulars">Regular Guests</option>
            </select>

            <select
              className="px-4 py-2 border rounded-md"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="appearances">Most Appearances</option>
              <option value="rating">Highest Rated</option>
              <option value="reviews">Most Reviews</option>
            </select>
          </div>
        </div>
      </div>

      {filteredComedians.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No comedians found matching your criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredComedians.map((comedian) => (
            <Link
              key={comedian.id}
              href={`/comedians/${comedian.id}`}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="relative aspect-square">
                <Image
                  src={comedian.image || '/default-comedian.jpg'}
                  alt={comedian.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h2 className="text-xl font-semibold text-white mb-1">{comedian.name}</h2>
                    {comedian.instagram && (
                      <p className="text-gray-200 text-sm mb-2">{comedian.instagram}</p>
                    )}
                  </div>
                </div>
                <div className="absolute top-2 right-2 flex gap-2">
                  {comedian.goldenTicket && (
                    <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-sm font-medium shadow-sm">
                      🎫 Golden Ticket
                    </span>
                  )}
                  {comedian.regularGuest && (
                    <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-sm font-medium shadow-sm">
                      🎭 Regular
                    </span>
                  )}
                  {comedian.hallOfFame && (
                    <span className="bg-purple-500 text-white px-2 py-1 rounded-full text-sm font-medium shadow-sm">
                      🏆 Hall of Fame
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">
                    {comedian.totalAppearances || 0} appearance{comedian.totalAppearances !== 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">
                      {comedian.reviews?.length || 0} review{comedian.reviews?.length !== 1 ? 's' : ''}
                    </span>
                    {comedian.reviews && comedian.reviews.length > 0 && (
                      <>
                        <span className="text-gray-400">•</span>
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-400">★</span>
                          <span>{(comedian.reviews.reduce((acc, review) => acc + review.rating, 0) / comedian.reviews.length).toFixed(1)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {comedian.tags && comedian.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {comedian.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    {comedian.tags.length > 3 && (
                      <span className="text-gray-400 text-xs">+{comedian.tags.length - 3} more</span>
                    )}
                  </div>
                )}
                <div className="mt-2 text-xs text-gray-500 flex justify-between">
                  {comedian.firstAppearance && (
                    <span>First: {new Date(comedian.firstAppearance).toLocaleDateString()}</span>
                  )}
                  {comedian.lastAppearance && (
                    <span>Last: {new Date(comedian.lastAppearance).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
} 