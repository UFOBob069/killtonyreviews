// File: src/app/dashboard/page.tsx (updated AdminPage)
'use client'

import { useState } from 'react'
import { useAuth, useAdmin } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline'

// Helper to convert seconds to mm:ss or hh:mm:ss
function secondsToTimestamp(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const parts = [] as string[]
  if (h) parts.push(h.toString().padStart(2, '0'))
  parts.push(m.toString().padStart(2, '0'))
  parts.push(s.toString().padStart(2, '0'))
  return parts.join(':')
}

// Helper to validate and normalize timestamp
function validateAndNormalizeTimestamp(timestamp: string): { valid: boolean; normalized?: string; error?: string } {
  // Remove any whitespace
  timestamp = timestamp.trim()
  
  // Match different formats
  const formatHMS = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/  // HH:MM:SS
  const formatMS = /^(\d{1,2}):(\d{1,2})$/             // MM:SS
  
  let hours = 0, minutes = 0, seconds = 0
  
  if (formatHMS.test(timestamp)) {
    const [h, m, s] = timestamp.split(':').map(Number)
    hours = h
    minutes = m
    seconds = s
  } else if (formatMS.test(timestamp)) {
    const [m, s] = timestamp.split(':').map(Number)
    minutes = m
    seconds = s
  } else {
    return { 
      valid: false, 
      error: 'Invalid format. Use MM:SS or HH:MM:SS' 
    }
  }
  
  // Validate ranges
  if (hours > 23) return { valid: false, error: 'Hours cannot exceed 23' }
  if (minutes > 59) return { valid: false, error: 'Minutes cannot exceed 59' }
  if (seconds > 59) return { valid: false, error: 'Seconds cannot exceed 59' }
  
  // Normalize to HH:MM:SS if hours exist, otherwise MM:SS
  const normalized = hours > 0 
    ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  
  return { valid: true, normalized }
}

// Types
interface TranscriptEntry { text: string; start: number }
interface ComicInfo { name: string; startTime: string; tags: string[] }
interface NameCandidate { name: string; startTime: string }

interface EpisodeData {
  videoId: string
  title: string
  description: string
  publishedAt: string
  thumbnail: string
  transcript: TranscriptEntry[]
  episodeSummary: string
  highlights: string[]
  comics: ComicInfo[]
  tags: string[]
  nameCandidates: string[]
}

export default function AdminPage() {
  const { user } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const router = useRouter()

  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [episodeData, setEpisodeData] = useState<EpisodeData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newComicName, setNewComicName] = useState('')
  const [newComicTime, setNewComicTime] = useState('')

  // Derived candidates with timestamp
  const nameCandidatesWithTime: NameCandidate[] = []
  if (episodeData) {
    const seen = new Set<string>()
    for (const name of episodeData.nameCandidates) {
      if (seen.has(name)) continue
      seen.add(name)
      // find first transcript entry containing name
      const entry = episodeData.transcript.find(t => t.text.includes(name))
      nameCandidatesWithTime.push({
        name,
        startTime: entry ? secondsToTimestamp(entry.start) : '00:00'
      })
    }
    // sort by parsed seconds
    nameCandidatesWithTime.sort((a, b) => {
      const [ah, am, as_] = a.startTime.split(':').map(Number)
      const [bh, bm, bs] = b.startTime.split(':').map(Number)
      const at = ah * 3600 + am * 60 + as_
      const bt = bh * 3600 + bm * 60 + bs
      return at - bt
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (!user) throw new Error('Authentication required')

      const match = youtubeUrl.match(/[?&]v=([^&]+)/)
      const videoId = match?.[1]
      if (!videoId) throw new Error('Invalid YouTube URL')

      const resp = await fetch('/api/admin/process-video', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      })
      if (!resp.ok) throw new Error('Failed to process video')

      const data: EpisodeData = await resp.json()
      setEpisodeData(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleCandidate = (name: string) => {
    if (!episodeData) return
    const exists = episodeData.comics.some(c => c.name === name)
    const newComics = exists
      ? episodeData.comics.filter(c => c.name !== name)
      : [...episodeData.comics, { name, startTime: '', tags: [] }]
    setEpisodeData({ ...episodeData, comics: newComics })
  }

  const handleCreate = async () => {
    if (!episodeData || !user) return
    setIsLoading(true)
    setError(null)
    try {
      const token = await user.getIdToken()
      const resp = await fetch('/api/admin/create-episode', {
        method: 'POST', headers: {
          'Content-Type': 'application/json', Authorization: `Bearer ${token}`
        }, body: JSON.stringify(episodeData)
      })
      if (!resp.ok) {
        const e = await resp.json()
        throw new Error(e.error || 'Failed to create episode')
      }
      router.push('/episodes')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddManualComic = (e: React.FormEvent) => {
    e.preventDefault()
    if (!episodeData || !newComicName.trim() || !newComicTime.trim()) return

    const { valid, normalized, error } = validateAndNormalizeTimestamp(newComicTime)
    if (!valid) {
      setError(error || 'Invalid timestamp format')
      return
    }

    const newComics = [
      ...episodeData.comics,
      { 
        name: newComicName.trim(), 
        startTime: normalized!, 
        tags: [] 
      }
    ]
    setEpisodeData({ ...episodeData, comics: newComics })
    setNewComicName('')
    setNewComicTime('')
    setError(null)
  }

  const handleRemoveComic = (nameToRemove: string) => {
    if (!episodeData) return
    const newComics = episodeData.comics.filter(c => c.name !== nameToRemove)
    setEpisodeData({ ...episodeData, comics: newComics })
  }

  if (adminLoading) return <p>Loading...</p>
  if (!isAdmin) return <p>Access Denied</p>

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl mb-4">Import New Episode</h1>
      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <input
          type="text" value={youtubeUrl}
          onChange={e => setYoutubeUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full border px-4 py-2" required
        />
        <button
          type="submit" disabled={isLoading}
          className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : 'Process Episode'}
        </button>
      </form>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      {episodeData && (
        <div className="bg-white p-6 rounded shadow mb-8">
          <h2 className="text-xl font-bold mb-2">Preview: {episodeData.title}</h2>
          <p className="italic mb-4">{episodeData.description}</p>
          <img src={episodeData.thumbnail} alt="thumbnail" className="mb-4 max-w-xs" />

          <h3 className="font-semibold">Episode Summary</h3>
          <p className="mb-4">{episodeData.episodeSummary}</p>

          <h3 className="font-semibold">Highlights</h3>
          <ul className="list-disc ml-5 mb-4">
            {episodeData.highlights.map((h, i) => <li key={i}>{h}</li>)}
          </ul>

          <h3 className="font-semibold">Comedians</h3>
          <div className="mb-8">
            <div className="space-y-2">
              {episodeData.comics.map((c, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span>{c.name} — {c.startTime}</span>
                  <button
                    onClick={() => handleRemoveComic(c.name)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold mb-4">Add Comedian Manually</h3>
            <form onSubmit={handleAddManualComic} className="space-y-4">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={newComicName}
                  onChange={(e) => setNewComicName(e.target.value)}
                  placeholder="Comedian Name"
                  className="flex-1 px-4 py-2 border rounded"
                />
                <input
                  type="text"
                  value={newComicTime}
                  onChange={(e) => setNewComicTime(e.target.value)}
                  placeholder="MM:SS or HH:MM:SS"
                  className="w-40 px-4 py-2 border rounded"
                />
                <button
                  type="submit"
                  disabled={!newComicName || !newComicTime}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-green-300"
                >
                  Add
                </button>
              </div>
            </form>
          </div>

          <h3 className="font-semibold">Detected Names</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
            {episodeData.nameCandidates.map((name) => {
              const included = episodeData.comics.some(c => c.name === name)
              return (
                <button
                  key={name}
                  className={`px-3 py-1 border rounded ${included ? 'bg-red-100' : 'bg-green-100'}`}
                  onClick={() => handleToggleCandidate(name)}
                >
                  {included ? `Remove ${name}` : `Add ${name}`}
                </button>
              )
            })}
          </div>

          <h3 className="font-semibold">Tags</h3>
          <p className="mb-4">{episodeData.tags.join(', ')}</p>

          <button
            onClick={handleCreate}
            disabled={isLoading}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <><CheckIcon className="h-5 w-5" /> Create Episode</>}
          </button>
        </div>
      )}
    </div>
  )
}
