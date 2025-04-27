'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { StarIcon } from '@heroicons/react/24/outline'
import { getComedians } from '@/lib/firebase'
import type { ComedianData } from '@/lib/firebase'

export default function HallOfFamePage() {
  const [hallOfFameMembers, setHallOfFameMembers] = useState<ComedianData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allComedians = await getComedians()
        setHallOfFameMembers(allComedians.filter(c => c.hallOfFame))
      } catch (err) {
        console.error('Error fetching hall of fame members:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
          Kill Tony Hall of Fame
          <span className="text-purple-600">🏆</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Celebrating the most memorable and successful comedians who have graced the Kill Tony stage.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : hallOfFameMembers.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-2xl text-gray-500">No Hall of Fame members found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {hallOfFameMembers.map((comedian) => (
            <Link
              key={comedian.id}
              href={`/comedians/${comedian.id}`}
              className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="aspect-[4/5] relative">
                <Image
                  src={comedian.image || '/default-comedian.jpg'}
                  alt={comedian.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-2xl font-bold text-white mb-2">{comedian.name}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-gray-200">
                        <span className="text-lg">{comedian.totalAppearances || 0} appearances</span>
                        {comedian.averageRating > 0 && (
                          <>
                            <span>•</span>
                            <div className="flex items-center">
                              <StarIcon className="h-5 w-5 text-yellow-400" />
                              <span className="ml-1 text-lg">{comedian.averageRating.toFixed(1)}</span>
                            </div>
                          </>
                        )}
                      </div>
                      {comedian.instagram && (
                        <p className="text-gray-300">{comedian.instagram}</p>
                      )}
                      {comedian.bio && (
                        <p className="text-gray-300 line-clamp-3">{comedian.bio}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {comedian.goldenTicket && (
                          <span className="bg-yellow-500/80 text-white px-2 py-1 rounded-full text-sm">
                            🎫 Golden Ticket
                          </span>
                        )}
                        {comedian.regularGuest && (
                          <span className="bg-blue-500/80 text-white px-2 py-1 rounded-full text-sm">
                            🎭 Regular
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute top-4 right-4">
                <span className="bg-purple-500 text-white px-3 py-1.5 rounded-full text-sm font-medium shadow-lg">
                  🏆 Hall of Fame
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
} 