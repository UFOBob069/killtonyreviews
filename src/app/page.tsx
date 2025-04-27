'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { StarIcon, UserGroupIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { getTopComedians, getBits } from '@/lib/firebase'
import type { ComedianData, Bit } from '@/lib/firebase'
import { getEpisodes } from '@/lib/firebase'

// Placeholder data - will be replaced with Firebase data
const featuredEpisode = {
  id: '1',
  number: 619,
  title: 'Tony Casillas Returns!',
  date: '2024-01-01',
  thumbnail: '/placeholder.jpg',
  rating: 4.8,
  guest: 'Tony Casillas',
  summary: 'Tony Casillas makes his triumphant return to the show, bringing his signature energy and hilarious takes on current events.',
  comedians: [
    { name: 'Hans Kim', status: 'killed', goldenTicket: true },
    { name: 'David Lucas', status: 'mixed', goldenTicket: false },
    { name: 'Jane Smith', status: 'bombed', goldenTicket: false }
  ]
}

const topMoments = [
  {
    id: '1',
    title: 'Hans Kim Gets Roasted',
    episodeNumber: 619,
    timestamp: '12:34',
    comedian: 'Hans Kim',
    category: 'Roast',
    upvotes: 156,
    description: 'Tony drops a legendary one-liner that leaves Hans speechless'
  },
  {
    id: '2',
    title: 'David Lucas Crowd Work',
    episodeNumber: 618,
    timestamp: '20:15',
    comedian: 'David Lucas',
    category: 'Crowd Work',
    upvotes: 89,
    description: 'Epic crowd work moment that had everyone in stitches'
  }
]

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [topComedians, setTopComedians] = useState<ComedianData[]>([])
  const [topBits, setTopBits] = useState<Bit[]>([])
  const [loading, setLoading] = useState(true)
  const [bitsLoading, setBitsLoading] = useState(true)
  const [topRatedEpisode, setTopRatedEpisode] = useState<any>(null)
  const [recentEpisodes, setRecentEpisodes] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [comedianData, bitsData, episodes] = await Promise.all([
          getTopComedians(5),
          getBits({}, 6),
          getEpisodes(100)
        ])
        setTopComedians(comedianData)
        setTopBits(bitsData)
        const ratedEpisodes = episodes.filter((ep: any) => typeof ep.rating === 'number' && ep.totalReviews > 0)
        if (ratedEpisodes.length > 0) {
          ratedEpisodes.sort((a: any, b: any) => b.rating - a.rating)
          setTopRatedEpisode(ratedEpisodes[0])
        }
        const sortedByNumber = [...episodes].sort((a, b) => (b.number || 0) - (a.number || 0))
        setRecentEpisodes(sortedByNumber.slice(0, 3))
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
        setBitsLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Site Introduction & CTAs */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Kill Tony Reviews</h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Track your favorite comedians, discover unforgettable moments, and join the Kill Tony community.
        </p>
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="bg-red-100 p-3 rounded-lg inline-block mb-4">
              <UserGroupIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Follow Comedians</h3>
            <p className="text-gray-600 mb-4">Track your favorite comedians' journeys and performances</p>
            <Link
              href="/comedians"
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Meet the Comedians →
            </Link>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="bg-red-100 p-3 rounded-lg inline-block mb-4">
              <ChartBarIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Track Moments</h3>
            <p className="text-gray-600 mb-4">Discover and upvote the best moments from each episode</p>
            <Link
              href="/episodes"
              className="text-red-600 hover:text-red-700 font-medium"
            >
              View Top Moments →
            </Link>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="bg-red-100 p-3 rounded-lg inline-block mb-4">
              <StarIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Rate & Review</h3>
            <p className="text-gray-600 mb-4">Share your thoughts on episodes and performances</p>
            <Link
              href="/episodes"
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Browse Episodes →
            </Link>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Search episodes, comedians, or moments..."
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Featured Episode */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Top Rated Episode</h2>
        {topRatedEpisode ? (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="relative aspect-video">
              <Image
                src={topRatedEpisode.thumbnail || '/placeholder.jpg'}
                alt={topRatedEpisode.title}
                fill
                className="rounded-lg object-cover"
              />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Episode #{topRatedEpisode.number}: {topRatedEpisode.title}
              </h3>
              <p className="text-gray-600 mb-2">{topRatedEpisode.publishedAt ? new Date(topRatedEpisode.publishedAt).toLocaleDateString() : ''}</p>
              <div className="flex items-center mb-4">
                <StarIcon className="h-5 w-5 text-yellow-400" />
                <span className="ml-1">{topRatedEpisode.rating.toFixed(1)}</span>
                <span className="ml-2 text-gray-500 text-sm">({topRatedEpisode.totalReviews} review{topRatedEpisode.totalReviews !== 1 ? 's' : ''})</span>
              </div>
              <p className="text-gray-700 mb-4">{topRatedEpisode.summary || topRatedEpisode.description}</p>
              <Link
                href={`/episodes/${topRatedEpisode.id}`}
                className="mt-4 inline-block bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Watch Episode
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No rated episodes found.</p>
        )}
      </div>

      {/* Recent Episodes */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Recent Episodes</h2>
        {recentEpisodes.length === 0 ? (
          <p className="text-gray-500">No recent episodes found.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentEpisodes.map((episode) => (
              <Link
                key={episode.id}
                href={`/episodes/${episode.id}`}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative aspect-video">
                  {episode.thumbnail || episode.videoId ? (
                    <Image
                      src={episode.thumbnail || (episode.videoId ? `https://img.youtube.com/vi/${episode.videoId}/maxresdefault.jpg` : '/placeholder.jpg')}
                      alt={episode.title}
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
                  <h3 className="font-semibold mb-1">
                    Episode #{episode.number}: {episode.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-2">
                    {episode.publishedAt ? new Date(episode.publishedAt).toLocaleDateString() : ''}
                  </p>
                  {episode.guest && (
                    <p className="text-gray-600 text-sm mb-2">Guest: {episode.guest}</p>
                  )}
                  <div className="flex items-center">
                    <StarIcon className="h-4 w-4 text-yellow-400" />
                    <span className="ml-1 text-sm">{typeof episode.rating === 'number' ? episode.rating.toFixed(1) : 'N/A'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Top Moments */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Top Moments</h2>
        {bitsLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : topBits.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No moments found</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {topBits.map((bit) => (
              <Link
                key={bit.id}
                href={`/episodes/${bit.episodeId}?t=${bit.timestamp}`}
                className="block p-4 rounded-lg hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{bit.title}</h3>
                    <p className="text-sm text-gray-600">
                      By {bit.userName} • {bit.timestamp}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    bit.category === 'roast' ? 'bg-red-100 text-red-800' :
                    bit.category === 'comeback' ? 'bg-green-100 text-green-800' :
                    bit.category === 'sound-effect' ? 'bg-blue-100 text-blue-800' :
                    bit.category === 'musical-burn' ? 'bg-purple-100 text-purple-800' :
                    bit.category === 'bomb' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {bit.category.split('-').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </span>
                </div>
                <p className="text-gray-700 mt-2">{bit.description}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-sm text-gray-600">▲ {bit.upvotes} upvotes</span>
                  {bit.tags && bit.tags.length > 0 && (
                    <>
                      <span className="text-sm text-gray-400">•</span>
                      <div className="flex flex-wrap gap-1">
                        {bit.tags.map(tag => (
                          <span
                            key={tag}
                            className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Top Comedians */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Top Comedians</h2>
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : topComedians.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No comedians found</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {topComedians.map((comedian) => (
              <Link
                key={comedian.id}
                href={`/comedians/${comedian.id}`}
                className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50"
              >
                <div className="relative w-16 h-16">
                  <Image
                    src={comedian.image || '/default-comedian.jpg'}
                    alt={comedian.name}
                    fill
                    className="rounded-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{comedian.name}</h3>
                  {comedian.instagram && (
                    <p className="text-gray-600 text-sm">{comedian.instagram}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-600">
                      {comedian.totalAppearances || 0} appearance{comedian.totalAppearances !== 1 ? 's' : ''}
                    </span>
                    <span className="text-sm text-gray-600">•</span>
                    <span className="text-sm text-gray-600">
                      {comedian.reviews?.length || 0} review{comedian.reviews?.length !== 1 ? 's' : ''}
                    </span>
                    {comedian.averageRating > 0 && (
                      <>
                        <span className="text-sm text-gray-600">•</span>
                        <div className="flex items-center">
                          <StarIcon className="h-4 w-4 text-yellow-400" />
                          <span className="ml-1 text-sm">{comedian.averageRating.toFixed(1)}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {comedian.goldenTicket && (
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs">
                        🎫 Golden Ticket
                      </span>
                    )}
                    {comedian.regularGuest && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                        🎭 Regular
                      </span>
                    )}
                    {comedian.hallOfFame && (
                      <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs">
                        🏆 Hall of Fame
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
