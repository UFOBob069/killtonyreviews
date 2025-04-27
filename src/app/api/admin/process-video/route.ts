// File: src/app/api/admin/process-video/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { YoutubeTranscript } from 'youtube-transcript';
import OpenAI from 'openai';

// Initialize clients
const youtube = google.youtube({ version: 'v3', auth: process.env.YOUTUBE_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = 'gpt-3.5-turbo';

// Types
export type TranscriptEntry = { text: string; start: number };
export type ComicInfo = { name: string; startTime: string; tags: string[] };

// Helpers
function chunkText(text: string, parts = 4): string[] {
  const size = Math.ceil(text.length / parts);
  const results: string[] = [];
  for (let i = 0; i < parts; i++) {
    const segment = text.slice(i * size, (i + 1) * size);
    if (segment) results.push(segment);
  }
  return results;
}

function secondsToTimestamp(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return [h, m, s].filter((v, i) => v > 0 || i > 0).map(v => v.toString().padStart(2, '0')).join(':');
}

function extractEpisodeNumber(title: string): number | null {
  const patterns = [/#(\d+)/, /Episode\s+(\d+)/i, /KILL TONY\s+(\d+)/i];
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) return parseInt(match[1]);
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const { videoId } = (await request.json()) as { videoId: string };

    // 1) Fetch video metadata
    const videoResp = await youtube.videos.list({ part: ['snippet'], id: [videoId] });
    const video = videoResp.data.items?.[0];
    if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    const { title, description, publishedAt, thumbnails } = video.snippet!;

    if (!title) return NextResponse.json({ error: 'Video title is missing' }, { status: 400 });
    const episodeNumber = extractEpisodeNumber(title);
    if (!episodeNumber) return NextResponse.json({ error: 'Could not determine episode number from title' }, { status: 400 });

    // 2) Fetch transcript
    const raw = await YoutubeTranscript.fetchTranscript(videoId);
    const transcript: TranscriptEntry[] = raw.map(t => ({ text: t.text, start: t.offset ?? 0 }));
    const fullText = transcript.map(t => t.text).join(' ');

    // 3) Summarize transcript
    const summaryChunks = chunkText(fullText, 4);
    const summaryResults = await Promise.all(summaryChunks.map(chunk =>
      openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: 'Summarize this transcript section focusing on comedy highlights.' },
          { role: 'user', content: chunk }
        ],
        max_tokens: 300
      })
    ));
    const combinedSummary = summaryResults.map(r => r.choices![0].message!.content!.trim()).join(' ');

    // 4) Episode recap
    const recapRes = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Write a 2-3 sentence Kill Tony episode recap in Tony and Redban\'s voice.' },
        { role: 'user', content: combinedSummary }
      ],
      max_tokens: 150
    });
    const episodeSummary = recapRes.choices![0].message!.content!.trim();

    // 5) Highlights
    const highlightsRes = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'List 5 standout comedic moments as bullet points, excluding ads.' },
        { role: 'user', content: combinedSummary }
      ],
      max_tokens: 200
    });
    const highlights = highlightsRes.choices![0].message!.content!
      .split(/\r?\n/)
      .map(l => l.replace(/^[\-\*\d\.]+/, '').trim())
      .filter(Boolean);

    // 6) Extract broad name candidates
    const nameRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;
    const candidates = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = nameRegex.exec(fullText))) {
      candidates.add(match[0]);
    }

    // 7) Match names with first timestamp
    const comicsRaw = Array.from(candidates).map(name => {
      const seg = transcript.find(t => t.text.includes(name));
      return { name, startTime: seg ? secondsToTimestamp(seg.start) : '' };
    }).filter(c => c.startTime);

    // 8) Validate comedians through OpenAI
    const validatedNames: ComicInfo[] = [];
    for (let i = 0; i < comicsRaw.length; i += 10) {
      const chunk = comicsRaw.slice(i, i + 10);
      const validationRes = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: `From this list of potential comedian names and timestamps from a Kill Tony transcript, return ONLY actual comedians that went on stage. Exclude locations, brands, shoutouts, or random words. Famous guests are okay if they performed.\n\nImportant: Timestamps may be MM:SS or HH:MM:SS.\n\nReturn JSON like:\n{\n  "comedians": [\n    {"name": "Comedian Name", "timestamp": "HH:MM:SS"}\n  ]\n}\n\nNames with timestamps:\n${chunk.map(c => `${c.name} — ${c.startTime}`).join('\n')}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 500
      });

      try {
        const content = validationRes.choices[0].message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.comedians)) {
            parsed.comedians.forEach((c: { name: string; timestamp: string }) => {
              validatedNames.push({ name: c.name, startTime: c.timestamp, tags: [] });
            });
          }
        }
      } catch (error) {
        console.error('Validation chunk error:', error);
      }
    }

    // 9) Sort comics by timestamp
    const comics = validatedNames.sort((a, b) => {
      const at = a.startTime.split(':').reduce((sum, x) => sum * 60 + +x, 0);
      const bt = b.startTime.split(':').reduce((sum, x) => sum * 60 + +x, 0);
      return at - bt;
    });

    // 10) Prepare response
    const thumbnailUrl = thumbnails?.maxres?.url || thumbnails?.high?.url || thumbnails?.default?.url;
    if (!thumbnailUrl) throw new Error('No thumbnail URL found');

    return NextResponse.json({
      videoId,
      title,
      description,
      publishedAt,
      number: episodeNumber,
      thumbnail: thumbnailUrl,
      transcript,
      episodeSummary,
      highlights,
      comics,
      nameCandidates: comics.map(c => c.name),
      tags: []
    });
  } catch (error: unknown) {
    console.error('Process-video error:', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
