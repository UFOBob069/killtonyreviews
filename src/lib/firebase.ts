import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Firestore,
  DocumentData,
  setDoc,
} from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase App
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// Authentication functions
export const signInWithGoogle = async (): Promise<FirebaseUser> => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
};

export const signOutUser = async (): Promise<void> => {
  await signOut(auth);
};

// Types for Firestore collections
export interface EpisodeData {
  id?: string;
  number: number;
  date: string;
  publishedAt: string;
  videoId: string;
  youtubeId?: string;
  title: string;
  description: string;
  location?: string;
  summary?: string;
  highlights?: Highlight[];
  topics?: Topic[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  rating?: number;
  totalReviews?: number;
  guests?: Guest[];
  comedians: ComedianData[];
  comedianIds: string[];  // Array of comedian document IDs
  bits?: Bit[];
  reviews?: ReviewData[];
  analysis?: {
    summary: string;
    highlights: string[];
    topics: string[];
    sentiment: string;
  };
}

export interface Highlight {
  text: string;
  timestamp: string;
}

export interface Topic {
  name: string;
  count: number;
}

export interface Guest {
  id: string;
  name: string;
  role: string;
  instagram?: string;
  image?: string;
}

export interface ComedianData {
  id: string;
  name: string;
  instagram?: string;
  website?: string;
  image?: string;
  goldenTicket: boolean;
  bio?: string;
  firstAppearance?: string;
  lastAppearance?: string;
  totalAppearances?: number;
  averageRating?: number;
  regularGuest?: boolean;
  hallOfFame?: boolean;
  firstTimer?: boolean;
  stats?: {
    totalAppearances: number;
    averageRating: number;
    notableAchievements?: string[];
  };
  tags?: string[];
  reviews?: ReviewData[];
  episodes?: EpisodeData[];
  highlights?: Bit[];
  performances?: {
    episodeId: string;
    startTime: string;
    tags: string[];
  }[];
}

export interface ReviewData {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  text: string;
  date: string;
  episodeId?: string;
  comedianId?: string;
  parentId?: string;
  upvotes: number;
  upvotedBy: string[];
  replies?: string[];
}

export interface Bit {
  id: string;
  episodeId: string;
  comedianId?: string;
  timestamp: string;
  title: string;
  description: string;
  category: 'bomb' | 'roast' | 'comeback' | 'sound-effect' | 'musical-burn' | 'other';
  upvotes: number;
  upvotedBy: string[];
  userId: string;
  userName: string;
  tags: string[];
}

// Fetch a single episode by ID
export const getEpisode = async (episodeId: string): Promise<EpisodeData | null> => {
  const docRef = doc(db, 'episodes', episodeId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;

  const episodeData = snap.data() as EpisodeData;

  // Fetch reviews for this episode
  const reviewsQuery = query(
    collection(db, 'reviews'),
    where('episodeId', '==', episodeId),
    orderBy('date', 'desc')
  );
  const reviewsSnap = await getDocs(reviewsQuery);
  const reviews = reviewsSnap.docs.map(d => ({ ...(d.data() as ReviewData), id: d.id }));

  // Fetch bits for this episode
  const bitsQuery = query(
    collection(db, 'moments'),
    where('episodeId', '==', episodeId),
    orderBy('upvotes', 'desc')
  );
  const bitsSnap = await getDocs(bitsQuery);
  const bits = bitsSnap.docs.map(d => ({ ...(d.data() as Bit), id: d.id }));

  // Fetch all comedians
  const comediansSnap = await getDocs(collection(db, 'comedians'));
  const comedians: ComedianData[] = [];

  // For each comedian, check their performances
  for (const comedianDoc of comediansSnap.docs) {
    const comedianData = comedianDoc.data() as ComedianData;
    
    // Get performances subcollection
    const performancesSnap = await getDocs(collection(db, 'comedians', comedianDoc.id, 'performances'));
    
    // Check if any performance matches this episode
    const matchingPerformance = performancesSnap.docs.find(p => p.data().episodeId === episodeId);
    
    if (matchingPerformance) {
      comedians.push({
        ...comedianData,
        id: comedianDoc.id,
        performances: [{
          episodeId,
          startTime: matchingPerformance.data().startTime,
          tags: matchingPerformance.data().tags || []
        }]
      });
    }
  }

  return {
    ...episodeData,
    id: snap.id,
    reviews,
    bits,
    comedians
  };
};

// Fetch latest episodes, ordered by number descending
export const getEpisodes = async (limitCount = 10): Promise<EpisodeData[]> => {
  try {
    const q = query(
      collection(db, 'episodes'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snaps = await getDocs(q);
    
    // Get all episodes first
    const episodes = snaps.docs.map(d => ({
      ...d.data(),
      id: d.id,
    } as EpisodeData));

    // Fetch reviews for all episodes
    const reviewsPromises = episodes.map(async episode => {
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('episodeId', '==', episode.id)
      );
      const reviewsSnap = await getDocs(reviewsQuery);
      const reviews = reviewsSnap.docs.map(d => d.data());
      
      // Calculate average rating
      if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
        const averageRating = totalRating / reviews.length;
        return {
          ...episode,
          rating: averageRating,
          totalReviews: reviews.length
        };
      }
      return episode;
    });

    const episodesWithRatings = await Promise.all(reviewsPromises);
    console.log('Episodes with ratings:', episodesWithRatings);
    
    return episodesWithRatings;
  } catch (error) {
    console.error('Error fetching episodes:', error);
    return [];
  }
};

// Fetch all comedians ordered by name
export const getComedians = async (): Promise<ComedianData[]> => {
  try {
    const q = query(collection(db, 'comedians'), orderBy('name', 'asc'));
    const comedianSnaps = await getDocs(q);
    
    // Get reviews for each comedian
    const comedians = await Promise.all(comedianSnaps.docs.map(async (doc) => {
      const comedianData = doc.data() as ComedianData;
      
      // Fetch reviews for this comedian
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('comedianId', '==', doc.id)
      );
      const reviewsSnap = await getDocs(reviewsQuery);
      const reviews = reviewsSnap.docs.map(d => ({ ...(d.data() as ReviewData), id: d.id }));
      
      // Calculate average rating if there are reviews
      let averageRating;
      if (reviews.length > 0) {
        averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
      }

      return {
        ...comedianData,
        id: doc.id,
        reviews,
        averageRating: averageRating || comedianData.averageRating
      };
    }));

    return comedians;
  } catch (error) {
    console.error('Error fetching comedians:', error);
    return [];
  }
};

// Fetch a single comedian by ID
export const getComedian = async (comedianId: string): Promise<ComedianData | null> => {
  try {
    console.log('Fetching comedian with ID:', comedianId);
    const docRef = doc(db, 'comedians', comedianId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      console.log('Comedian not found');
      return null;
    }

    const comedianData = snap.data() as ComedianData;
    console.log('Raw comedian data:', comedianData);

    // Fetch episodes where this comedian appears
    const episodesQuery = query(
      collection(db, 'episodes'),
      where('comedianIds', 'array-contains', comedianId)
    );
    console.log('Querying episodes with:', { comedianId });
    const episodesSnap = await getDocs(episodesQuery);
    console.log('Episodes query response:', {
      empty: episodesSnap.empty,
      size: episodesSnap.size,
      docs: episodesSnap.docs.map(d => ({
        id: d.id,
        comedianIds: d.data().comedianIds,
        number: d.data().number,
        title: d.data().title
      }))
    });

    const episodes = episodesSnap.docs.map(d => {
      const data = d.data() as EpisodeData;
      return { ...data, id: d.id };
    });

    // Also check the performances subcollection as a fallback
    const performancesRef = collection(docRef, 'performances');
    const performancesSnap = await getDocs(performancesRef);
    console.log('Performances subcollection:', {
      empty: performancesSnap.empty,
      size: performancesSnap.size,
      docs: performancesSnap.docs.map(d => ({
        id: d.id,
        episodeNumber: d.data().episodeNumber,
        date: d.data().date
      }))
    });

    // Combine episodes from both sources, ensuring proper type conversion
    const performances = await Promise.all(performancesSnap.docs.map(async d => {
      const data = d.data();
      console.log('Processing performance:', data);

      // If we have an episodeId, fetch the episode details
      let episodeDetails = null;
      if (data.episodeId) {
        const episodeRef = doc(db, 'episodes', data.episodeId);
        const episodeSnap = await getDoc(episodeRef);
        if (episodeSnap.exists()) {
          episodeDetails = episodeSnap.data();
          console.log('Found episode details:', episodeDetails);
        }
      }

      // Convert startTime to seconds for YouTube URL
      const timeToSeconds = (timeStr: string) => {
        const [minutes, seconds] = timeStr.split(':').map(Number);
        return minutes * 60 + seconds;
      };

      return {
        id: d.id,
        number: episodeDetails?.number,
        date: episodeDetails?.date || data.date,
        publishedAt: episodeDetails?.publishedAt || data.date,
        videoId: episodeDetails?.videoId || '',
        title: episodeDetails?.title || `Kill Tony Performance`,
        description: episodeDetails?.description || '',
        comedians: [],
        comedianIds: [comedianId],
        startTime: data.startTime,
        startTimeSeconds: data.startTime ? timeToSeconds(data.startTime) : undefined,
        episodeId: data.episodeId
      } as EpisodeData;
    }));

    const allEpisodes = [...episodes, ...performances];
    console.log('Combined episodes:', allEpisodes);

    // Fetch reviews for this comedian
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('comedianId', '==', comedianId),
      orderBy('date', 'desc')
    );
    const reviewsSnap = await getDocs(reviewsQuery);
    const reviews = reviewsSnap.docs.map(d => ({ ...(d.data() as ReviewData), id: d.id }));

    // Fetch highlights for this comedian
    const highlightsQuery = query(
      collection(db, 'moments'),
      where('comedianId', '==', comedianId),
      orderBy('upvotes', 'desc')
    );
    const highlightsSnap = await getDocs(highlightsQuery);
    const highlights = highlightsSnap.docs.map(d => ({ ...(d.data() as Bit), id: d.id }));

    const result = {
      ...comedianData,
      id: snap.id,
      reviews,
      episodes: allEpisodes,
      highlights
    };
    console.log('Final comedian data:', result);
    return result;
  } catch (error) {
    console.error('Error in getComedian:', error);
    throw error;
  }
};

// Submit a review (episode or comedian)
export const submitReview = async (
  reviewData: Omit<ReviewData, 'id' | 'date' | 'upvotes' | 'upvotedBy' | 'replies'>
): Promise<string> => {
  const data = {
    ...reviewData,
    date: new Date().toISOString(),
    upvotes: 0,
    upvotedBy: [],
    replies: [],
  };
  const ref = await addDoc(collection(db, 'reviews'), data);
  return ref.id;
};

// Submit an episode review
export const submitEpisodeReview = async (
  episodeId: string,
  reviewData: Omit<ReviewData, 'id' | 'date' | 'upvotes' | 'episodeId'>
): Promise<string> => {
  const data = {
    ...reviewData,
    episodeId,
    date: new Date().toISOString(),
    upvotes: 0,
  };
  const ref = await addDoc(collection(db, 'reviews'), data);
  return ref.id;
};

// Submit a comedian review
export const submitComedianReview = async (
  comedianId: string,
  episodeId: string,
  reviewData: Omit<ReviewData, 'id' | 'date' | 'upvotes' | 'comedianId' | 'episodeId'>
): Promise<string> => {
  const data = {
    ...reviewData,
    comedianId,
    episodeId,
    date: new Date().toISOString(),
    upvotes: 0,
  };
  const ref = await addDoc(collection(db, 'reviews'), data);
  return ref.id;
};

// Fetch top bits/moments, optionally filtered by episode or comedian
export const getBits = async (
  filter: { episodeId?: string; comedianId?: string } = {},
  limitCount = 10
): Promise<Bit[]> => {
  let q = query(collection(db, 'moments'), orderBy('upvotes', 'desc'), limit(limitCount));
  if (filter.episodeId) {
    q = query(
      collection(db, 'moments'),
      where('episodeId', '==', filter.episodeId),
      orderBy('upvotes', 'desc'),
      limit(limitCount)
    );
  } else if (filter.comedianId) {
    q = query(
      collection(db, 'moments'),
      where('comedianId', '==', filter.comedianId),
      orderBy('upvotes', 'desc'),
      limit(limitCount)
    );
  }
  const snaps = await getDocs(q);
  return snaps.docs.map(d => ({ ...(d.data() as Bit), id: d.id }));
};

// Submit a new bit/moment
export const submitBit = async (
  bitData: Omit<Bit, 'id' | 'upvotes' | 'upvotedBy'>
): Promise<string> => {
  const data = {
    ...bitData,
    upvotes: 0,
    upvotedBy: [],
  };
  const ref = await addDoc(collection(db, 'moments'), data);
  return ref.id;
};

// Upvote or remove upvote for a bit
export const upvoteBit = async (
  bitId: string,
  userId: string
): Promise<void> => {
  const ref = doc(db, 'moments', bitId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Bit not found');

  const data = snap.data() as Bit;
  const hasUpvoted = data.upvotedBy.includes(userId);
  const updated = hasUpvoted
    ? { upvotes: data.upvotes - 1, upvotedBy: data.upvotedBy.filter(u => u !== userId) }
    : { upvotes: data.upvotes + 1, upvotedBy: [...data.upvotedBy, userId] };

  await updateDoc(ref, updated);
};

// Fetch Hall of Fame members (stub)
export const getHallOfFameMembers = async (): Promise<DocumentData[]> => {
  const snaps = await getDocs(collection(db, 'hallOfFame'));
  return snaps.docs.map(d => ({ id: d.id, ...(d.data() as DocumentData) }));
};

// Fetch Golden Ticket winners (stub)
export const getGoldenTicketWinners = async (): Promise<DocumentData[]> => {
  const snaps = await getDocs(collection(db, 'goldenTickets'));
  return snaps.docs.map(d => ({ id: d.id, ...(d.data() as DocumentData) }));
};

// Fetch recurring characters (stub)
export const getRecurringCharacters = async (): Promise<DocumentData[]> => {
  const snaps = await getDocs(collection(db, 'recurringCharacters'));
  return snaps.docs.map(d => ({ id: d.id, ...(d.data() as DocumentData) }));
};

export async function makeUserAdmin(userId: string) {
  try {
    // 1. Add to admins collection
    await setDoc(doc(db, 'admins', userId), {
      createdAt: new Date().toISOString()
    });

    // 2. Make API call to set custom claims
    const response = await fetch('/api/admin/set-admin-claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      throw new Error('Failed to set admin claim');
    }

    return true;
  } catch (error) {
    console.error('Error making user admin:', error);
    return false;
  }
}

// Upvote or remove upvote for a review
export const upvoteReview = async (
  reviewId: string,
  userId: string
): Promise<void> => {
  const ref = doc(db, 'reviews', reviewId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Review not found');

  const data = snap.data();
  const upvotedBy = data.upvotedBy || [];
  const hasUpvoted = upvotedBy.includes(userId);
  
  const updated = hasUpvoted
    ? { 
        upvotes: (data.upvotes || 0) - 1, 
        upvotedBy: upvotedBy.filter((id: string) => id !== userId) 
      }
    : { 
        upvotes: (data.upvotes || 0) + 1, 
        upvotedBy: [...upvotedBy, userId] 
      };

  await updateDoc(ref, updated);
};

// Submit a reply to a review
export const submitReply = async (
  parentReviewId: string,
  replyData: Omit<ReviewData, 'id' | 'date' | 'upvotes' | 'upvotedBy' | 'replies'>
): Promise<string> => {
  // First create the reply as a new review
  const data = {
    ...replyData,
    parentId: parentReviewId,
    date: new Date().toISOString(),
    upvotes: 0,
    upvotedBy: [],
  };
  const replyRef = await addDoc(collection(db, 'reviews'), data);

  // Then update the parent review's replies array
  const parentRef = doc(db, 'reviews', parentReviewId);
  const parentSnap = await getDoc(parentRef);
  
  if (parentSnap.exists()) {
    const parentData = parentSnap.data();
    await updateDoc(parentRef, {
      replies: [...(parentData.replies || []), replyRef.id]
    });
  }

  return replyRef.id;
};

// Validate that comedian IDs exist in the database
export const validateComedianIds = async (comedianIds: string[]): Promise<{
  valid: boolean;
  existingIds: string[];
  invalidIds: string[];
}> => {
  const results = await Promise.all(
    comedianIds.map(async (id) => {
      const comedianDoc = await getDoc(doc(db, 'comedians', id));
      return {
        id,
        exists: comedianDoc.exists()
      };
    })
  );

  const existingIds = results.filter(r => r.exists).map(r => r.id);
  const invalidIds = results.filter(r => !r.exists).map(r => r.id);

  return {
    valid: invalidIds.length === 0,
    existingIds,
    invalidIds
  };
};

// Create or update an episode with comedian relationships
export const submitEpisode = async (
  episodeData: Omit<EpisodeData, 'id' | 'comedians' | 'comedianIds'> & {
    comedianIds?: string[];
  }
): Promise<string> => {
  // Validate comedian IDs first
  const comedianIds = episodeData.comedianIds || [];
  const validation = await validateComedianIds(comedianIds);
  
  if (!validation.valid) {
    throw new Error(`Invalid comedian IDs: ${validation.invalidIds.join(', ')}`);
  }

  // Fetch the full comedian data for each validated ID
  const comedians = await Promise.all(
    validation.existingIds.map(async (id) => {
      const comedianDoc = await getDoc(doc(db, 'comedians', id));
      return { ...(comedianDoc.data() as ComedianData), id: comedianDoc.id };
    })
  );

  // Prepare the episode data with both arrays
  const data = {
    ...episodeData,
    comedianIds: validation.existingIds,
    comedians,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Create or update the episode
  const episodeRef = await addDoc(collection(db, 'episodes'), data);

  // Update each comedian's episode appearances
  await Promise.all(
    validation.existingIds.map(async (comedianId) => {
      const comedianRef = doc(db, 'comedians', comedianId);
      const comedianDoc = await getDoc(comedianRef);
      
      if (comedianDoc.exists()) {
        const comedianData = comedianDoc.data() as ComedianData;
        const totalAppearances = (comedianData.totalAppearances || 0) + 1;
        const lastAppearance = episodeData.date;
        const firstAppearance = comedianData.firstAppearance || episodeData.date;

        await updateDoc(comedianRef, {
          totalAppearances,
          lastAppearance,
          firstAppearance
        });
      }
    })
  );

  return episodeRef.id;
};

// Update comedian relationships for an existing episode
export const updateEpisodeComedians = async (
  episodeId: string,
  comedianIds: string[]
): Promise<void> => {
  // Validate comedian IDs first
  const validation = await validateComedianIds(comedianIds);
  
  if (!validation.valid) {
    throw new Error(`Invalid comedian IDs: ${validation.invalidIds.join(', ')}`);
  }

  const episodeRef = doc(db, 'episodes', episodeId);
  const episodeDoc = await getDoc(episodeRef);

  if (!episodeDoc.exists()) {
    throw new Error('Episode not found');
  }

  // Fetch full comedian data for validated IDs
  const comedians = await Promise.all(
    validation.existingIds.map(async (id) => {
      const comedianDoc = await getDoc(doc(db, 'comedians', id));
      return { ...(comedianDoc.data() as ComedianData), id: comedianDoc.id };
    })
  );

  // Update the episode
  await updateDoc(episodeRef, {
    comedianIds: validation.existingIds,
    comedians,
    updatedAt: new Date().toISOString()
  });

  // Get the old comedian IDs to handle appearance counts
  const oldData = episodeDoc.data() as EpisodeData;
  const oldComedianIds = oldData.comedianIds || [];

  // Remove appearances from comedians no longer in the episode
  const removedComedianIds = oldComedianIds.filter(id => !validation.existingIds.includes(id));
  await Promise.all(
    removedComedianIds.map(async (comedianId) => {
      const comedianRef = doc(db, 'comedians', comedianId);
      const comedianDoc = await getDoc(comedianRef);
      
      if (comedianDoc.exists()) {
        const comedianData = comedianDoc.data() as ComedianData;
        const totalAppearances = Math.max(0, (comedianData.totalAppearances || 1) - 1);
        
        await updateDoc(comedianRef, {
          totalAppearances,
          // Note: We don't update firstAppearance/lastAppearance here as it would require
          // fetching all episodes to recalculate accurately
        });
      }
    })
  );

  // Add appearances for new comedians
  const newComedianIds = validation.existingIds.filter(id => !oldComedianIds.includes(id));
  await Promise.all(
    newComedianIds.map(async (comedianId) => {
      const comedianRef = doc(db, 'comedians', comedianId);
      const comedianDoc = await getDoc(comedianRef);
      
      if (comedianDoc.exists()) {
        const comedianData = comedianDoc.data() as ComedianData;
        const totalAppearances = (comedianData.totalAppearances || 0) + 1;
        const episodeDate = oldData.date;
        const lastAppearance = episodeDate;
        const firstAppearance = comedianData.firstAppearance || episodeDate;

        await updateDoc(comedianRef, {
          totalAppearances,
          lastAppearance,
          firstAppearance
        });
      }
    })
  );
};

// Helper function to extract episode number
const extractEpisodeNumber = (text: string): number | null => {
  // Try to find "#NUMBER" pattern
  const hashMatch = text.match(/#(\d+)/);
  if (hashMatch) return parseInt(hashMatch[1]);

  // Try to find "Episode NUMBER" pattern
  const episodeMatch = text.match(/Episode\s+(\d+)/i);
  if (episodeMatch) return parseInt(episodeMatch[1]);

  // Try to find "KILL TONY NUMBER" pattern
  const killTonyMatch = text.match(/KILL TONY\s+(\d+)/i);
  if (killTonyMatch) return parseInt(killTonyMatch[1]);

  return null;
};

// Update existing episode with proper fields
export const updateExistingEpisode = async (episodeId: string) => {
  const episodeRef = doc(db, 'episodes', episodeId);
  const episodeSnap = await getDoc(episodeRef);
  
  if (!episodeSnap.exists()) {
    throw new Error('Episode not found');
  }

  const existingData = episodeSnap.data();
  const description = existingData.description || '';
  const title = existingData.title || '';

  // Try to extract episode number from title first, then description
  const episodeNumber = extractEpisodeNumber(title) || extractEpisodeNumber(description);
  
  if (!episodeNumber) {
    throw new Error('Could not determine episode number from title or description');
  }

  // Extract date from description
  const dateMatch = description.match(/RECORDED– (\d{2}\/\d{2}\/\d{4})/);
  const publishedDate = dateMatch ? 
    new Date(dateMatch[1]).toISOString() : 
    existingData.createdAt;

  // Extract comedians from description
  const comedianNames: string[] = description.split(',')
    .map((part: string) => part.trim())
    .filter((name: string) => 
      name && 
      !name.includes('RECORDED') && 
      !name.includes('THIS EPISODE') &&
      !name.includes('@') &&
      !name.includes('http')
    );

  // Standardize the episode title format
  const standardizedTitle = `Kill Tony #${episodeNumber}`;

  const updateData = {
    ...existingData,
    number: episodeNumber,
    title: standardizedTitle,
    publishedAt: publishedDate,
    date: publishedDate,
    comedians: comedianNames.map((name: string) => ({
      name,
      id: name.toLowerCase().replace(/\s+/g, '-'),
      goldenTicket: false
    })),
    comedianIds: [], // We'll need to create comedian documents separately
    rating: existingData.rating || 0,
    totalReviews: existingData.totalReviews || 0,
  };

  await updateDoc(episodeRef, updateData);
  return updateData;
};

// Fetch top comedians based on average rating and number of reviews
export const getTopComedians = async (limitCount = 5): Promise<ComedianData[]> => {
  try {
    // First get all comedians
    const comedianSnaps = await getDocs(collection(db, 'comedians'));
    
    // Get reviews for each comedian and calculate their stats
    const comediansWithStats = await Promise.all(
      comedianSnaps.docs.map(async (doc) => {
        const comedianData = doc.data() as ComedianData;
        
        // Fetch reviews for this comedian
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('comedianId', '==', doc.id)
        );
        const reviewsSnap = await getDocs(reviewsQuery);
        const reviews = reviewsSnap.docs.map(d => ({ ...(d.data() as ReviewData), id: d.id }));
        
        // Calculate average rating
        let averageRating = 0;
        if (reviews.length > 0) {
          averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
        }

        return {
          ...comedianData,
          id: doc.id,
          reviews,
          averageRating,
          totalReviews: reviews.length
        };
      })
    );

    // Sort by a combination of average rating and number of reviews
    // This ensures we get comedians who are both highly rated and well-reviewed
    return comediansWithStats
      .sort((a, b) => {
        const scoreA = (a.averageRating || 0) * Math.log(a.totalReviews + 1);
        const scoreB = (b.averageRating || 0) * Math.log(b.totalReviews + 1);
        return scoreB - scoreA;
      })
      .slice(0, limitCount);
  } catch (error) {
    console.error('Error fetching top comedians:', error);
    return [];
  }
};
