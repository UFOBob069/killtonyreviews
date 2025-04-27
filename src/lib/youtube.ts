// File: src/lib/youtube-utils.ts
import { YoutubeTranscript } from 'youtube-transcript';

const YT_API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = 'UCwzCMiicL-hBUzyjWiJaseg';

export interface YouTubeVideo { 
  id: string; 
  title: string; 
  description: string; 
  publishedAt: string; 
  thumbnails: {
    default?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    high?: { url: string; width: number; height: number };
  }; 
  channelTitle: string; 
}

export interface TranscriptSegment { 
  start: number; 
  duration: number; 
  text: string; 
}

export interface TranscriptAnalysis { 
  summary: string; 
  highlights: string[]; 
  topics: string[]; 
  sentiment: 'positive'|'negative'|'neutral'; 
}

interface YouTubeSnippet {
  title: string;
  description: string;
  publishedAt: string;
  thumbnails: {
    default?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    high?: { url: string; width: number; height: number };
  };
  channelTitle: string;
}

// Search videos on Kill Tony channel
export async function searchKillTonyVideos(query: string, maxResults = 10): Promise<YouTubeVideo[]> {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&q=${encodeURIComponent(query)}&maxResults=${maxResults}&type=video&key=${YT_API_KEY}`
  );
  if (!res.ok) throw new Error('YouTube search failed');
  const data = await res.json();
  return data.items.map((it: { id: { videoId: string }; snippet: YouTubeSnippet }) => ({
    id: it.id.videoId,
    title: it.snippet.title,
    description: it.snippet.description,
    publishedAt: it.snippet.publishedAt,
    thumbnails: it.snippet.thumbnails,
    channelTitle: it.snippet.channelTitle,
  }));
}

// Fetch video details
export async function getVideoDetails(videoId: string): Promise<YouTubeVideo> {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YT_API_KEY}`
  );
  if (!res.ok) throw new Error('Video details fetch failed');
  const { items } = await res.json();
  const sn = items[0].snippet;
  return { 
    id: videoId, 
    title: sn.title, 
    description: sn.description, 
    publishedAt: sn.publishedAt, 
    thumbnails: sn.thumbnails, 
    channelTitle: sn.channelTitle 
  };
}

// Get latest episodes
export const getLatestEpisodes = (maxResults = 10) => searchKillTonyVideos('', maxResults);

// Extract episode number
export function extractEpisodeNumber(title: string): number|null {
  const m = title.match(/#(\d+)/);
  return m ? parseInt(m[1]) : null;
}

// Timestamp formatting
export function getYouTubeEmbedUrl(videoId: string, start?: number): string {
  return `https://www.youtube.com/embed/${videoId}${start ? `?start=${start}` : ''}`;
}

// Fetch transcript segments
export async function getVideoTranscript(videoId: string): Promise<TranscriptSegment[]> {
  const raw = await YoutubeTranscript.fetchTranscript(videoId);
  return raw.map(item => ({ start: item.offset ?? 0, duration: item.duration ?? 0, text: item.text }));
}

// Analyze transcript
export async function analyzeTranscript(transcript: TranscriptSegment[], authToken: string): Promise<TranscriptAnalysis> {
  if (!authToken) {
    throw new Error('Authentication required');
  }

  const res = await fetch('/api/admin/analyze-transcript', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ transcript })
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to analyze transcript');
  }

  const { analysis } = await res.json();
  return analysis;
}
