'use client'

import { useState } from 'react'

// Placeholder data - will be replaced with Firebase data
const bits = [
  {
    id: '1',
    episodeId: '1234',
    episodeNumber: 1234,
    timestamp: '42:11',
    title: 'Hans Gets Annihilated',
    description: 'Tony drops a legendary one-liner that leaves Hans speechless',
    category: 'roast',
    upvotes: 156,
    userId: 'user1',
    userName: 'Fan123',
    date: '2024-01-02',
    tags: ['hans-kim', 'tony-hinchcliffe', 'roast']
  },
  {
    id: '2',
    episodeId: '1234',
    episodeNumber: 1234,
    timestamp: '15:30',
    description: 'Redban drops the perfect sound effect at the perfect moment',
    category: 'sound-effect',
    upvotes: 89,
    userId: 'user2',
    userName: 'ComedyLover',
    date: '2024-01-02',
    tags: ['redban', 'sound-effect']
  }
]

export default function BitsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [newBit, setNewBit] = useState({
    episodeNumber: '',
    timestamp: '',
    title: '',
    description: '',
    category: 'other',
    tags: ''
  })

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'bomb', label: 'Bombs' },
    { value: 'roast', label: 'Roasts' },
    { value: 'comeback', label: 'Comebacks' },
    { value: 'sound-effect', label: 'Sound Effects' },
    { value: 'musical-burn', label: 'Musical Burns' },
    { value: 'other', label: 'Other' }
  ]

  const handleSubmitBit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement bit submission to Firebase
    console.log('Submitting bit:', newBit)
  }

  const handleUpvote = async (bitId: string) => {
    // TODO: Implement upvote functionality
    console.log('Upvoting bit:', bitId)
  }

  const filteredBits = bits.filter(bit => {
    const matchesCategory = selectedCategory === 'all' || bit.category === selectedCategory
    const matchesSearch = (bit.title?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
                         bit.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         bit.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold">Bit Tracker</h1>
        <div className="flex gap-4 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search bits..."
            className="flex-1 p-2 border rounded"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="p-2 border rounded"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Submit New Bit Form */}
      <form onSubmit={handleSubmitBit} className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Submit a New Bit</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2">Episode Number</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={newBit.episodeNumber}
              onChange={(e) => setNewBit({ ...newBit, episodeNumber: e.target.value })}
              placeholder="e.g., 1234"
            />
          </div>
          <div>
            <label className="block mb-2">Timestamp</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={newBit.timestamp}
              onChange={(e) => setNewBit({ ...newBit, timestamp: e.target.value })}
              placeholder="e.g., 42:11"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block mb-2">Title</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={newBit.title}
              onChange={(e) => setNewBit({ ...newBit, title: e.target.value })}
              placeholder="Brief title for the bit"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block mb-2">Description</label>
            <textarea
              className="w-full p-2 border rounded"
              rows={3}
              value={newBit.description}
              onChange={(e) => setNewBit({ ...newBit, description: e.target.value })}
              placeholder="Describe what happens in this bit..."
            />
          </div>
          <div>
            <label className="block mb-2">Category</label>
            <select
              className="w-full p-2 border rounded"
              value={newBit.category}
              onChange={(e) => setNewBit({ ...newBit, category: e.target.value })}
            >
              {categories.filter(c => c.value !== 'all').map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2">Tags</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={newBit.tags}
              onChange={(e) => setNewBit({ ...newBit, tags: e.target.value })}
              placeholder="e.g., hans-kim, tony-hinchcliffe"
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          Submit Bit
        </button>
      </form>

      {/* Bits List */}
      <div className="space-y-4">
        {filteredBits.map(bit => (
          <div key={bit.id} className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold">{bit.title}</h3>
                <p className="text-gray-600">
                  Episode #{bit.episodeNumber} • {bit.timestamp}
                </p>
              </div>
              <button
                onClick={() => handleUpvote(bit.id)}
                className="flex items-center gap-2 text-gray-600 hover:text-black"
              >
                <span>▲</span>
                <span>{bit.upvotes}</span>
              </button>
            </div>
            <p className="text-gray-700 mb-4">{bit.description}</p>
            <div className="flex flex-wrap gap-2">
              {bit.tags.map(tag => (
                <span
                  key={tag}
                  className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
              <span>Submitted by {bit.userName}</span>
              <span>{bit.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 