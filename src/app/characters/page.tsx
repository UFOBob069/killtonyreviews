'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

// Placeholder data - will be replaced with Firebase data
const characters = [
  {
    id: '1',
    name: 'Hans Kim',
    image: '/images/hans-kim.jpg',
    instagram: '@hanskimcomedy',
    description: 'Regular guest and fan favorite known for his deadpan delivery and quick wit.',
    firstAppearance: '2020-01-01',
    lastAppearance: '2024-01-01',
    totalAppearances: 100,
    notableBits: [
      {
        episodeNumber: 1234,
        timestamp: '42:11',
        description: 'Gets roasted by Tony'
      }
    ],
    catchphrases: [
      'I\'m just here to have fun',
      'That\'s crazy'
    ],
    fanRating: 4.8,
    status: 'active'
  },
  {
    id: '2',
    name: 'David Lucas',
    image: '/images/david-lucas.jpg',
    instagram: '@davidlucascomedy',
    description: 'Regular guest known for his high-energy performances and crowd work.',
    firstAppearance: '2019-01-01',
    lastAppearance: '2024-01-01',
    totalAppearances: 95,
    notableBits: [
      {
        episodeNumber: 1234,
        timestamp: '15:30',
        description: 'Epic crowd work moment'
      }
    ],
    catchphrases: [
      'Let\'s go!',
      'That\'s what I\'m talking about'
    ],
    fanRating: 4.7,
    status: 'active'
  }
]

export default function CharactersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const statuses = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'occasional', label: 'Occasional' }
  ]

  const filteredCharacters = characters.filter(character => {
    const matchesStatus = selectedStatus === 'all' || character.status === selectedStatus
    const matchesSearch = character.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         character.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold">Recurring Characters</h1>
        <div className="flex gap-4 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search characters..."
            className="flex-1 p-2 border rounded"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="p-2 border rounded"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            {statuses.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCharacters.map(character => (
          <div key={character.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="relative h-48">
              <Image
                src={character.image}
                alt={character.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-semibold">{character.name}</h2>
                <span className={`px-2 py-1 rounded-full text-sm ${
                  character.status === 'active' ? 'bg-green-100 text-green-800' :
                  character.status === 'inactive' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {character.status.charAt(0).toUpperCase() + character.status.slice(1)}
                </span>
              </div>
              <p className="text-gray-600 mb-4">{character.description}</p>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Stats</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Appearances:</span>
                      <span className="ml-2">{character.totalAppearances}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Rating:</span>
                      <span className="ml-2">{character.fanRating}/5</span>
                    </div>
                    <div>
                      <span className="text-gray-500">First:</span>
                      <span className="ml-2">{character.firstAppearance}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Last:</span>
                      <span className="ml-2">{character.lastAppearance}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Catchphrases</h3>
                  <div className="flex flex-wrap gap-2">
                    {character.catchphrases.map((phrase, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm"
                      >
                        {phrase}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Notable Bits</h3>
                  <div className="space-y-2">
                    {character.notableBits.map((bit, index) => (
                      <div key={index} className="text-sm">
                        <Link
                          href={`/episodes/${bit.episodeNumber}?t=${bit.timestamp}`}
                          className="text-blue-600 hover:underline"
                        >
                          Episode #{bit.episodeNumber} ({bit.timestamp})
                        </Link>
                        <p className="text-gray-600">{bit.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <a
                    href={`https://instagram.com/${character.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {character.instagram}
                  </a>
                  <Link
                    href={`/characters/${character.id}`}
                    className="text-black hover:text-gray-600"
                  >
                    View Profile →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 