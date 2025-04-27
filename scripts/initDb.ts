import * as admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin
const serviceAccount = require('../service-account.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = getFirestore()

// Sample data for validation
const sampleData = {
  episodes: {
    number: 619,
    title: 'Sample Episode',
    date: new Date().toISOString(),
    youtubeId: 'sample123',
    description: 'Sample description',
    location: 'Vulcan Gas Company, Austin',
    guests: [],
    comedians: [],
    rating: 0,
    viewCount: 0
  },
  comedians: {
    name: 'Sample Comedian',
    bio: 'Sample bio',
    image: 'https://example.com/image.jpg',
    socialLinks: {
      instagram: '@sample',
      youtube: '@sample',
      twitter: '@sample'
    },
    firstAppearance: new Date().toISOString(),
    lastAppearance: new Date().toISOString(),
    totalAppearances: 0,
    averageRating: 0,
    goldenTicket: false,
    regularGuest: false
  },
  reviews: {
    userId: 'sampleUserId',
    userName: 'Sample User',
    targetId: 'sampleTargetId',
    targetType: 'episode',
    rating: 5,
    text: 'Sample review',
    date: new Date().toISOString(),
    upvotes: 0
  },
  moments: {
    episodeId: 'sampleEpisodeId',
    timestamp: '12:34',
    title: 'Sample Moment',
    description: 'Sample description',
    category: 'roast',
    tags: ['sample', 'tag'],
    upvotes: 0,
    userId: 'sampleUserId'
  },
  users: {
    displayName: 'Sample User',
    email: 'sample@example.com',
    photoURL: 'https://example.com/photo.jpg',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  }
}

// Function to create collection with validation rules
async function createCollection(collectionName: string, sampleDoc: any) {
  try {
    // Create a sample document to establish schema
    const docRef = db.collection(collectionName).doc('__schema__')
    await docRef.set({
      __schema__: true,
      fields: Object.keys(sampleDoc),
      sampleData: sampleDoc,
      createdAt: new Date().toISOString()
    })
    
    console.log(`✅ Created ${collectionName} collection with schema`)
  } catch (error) {
    console.error(`❌ Error creating ${collectionName} collection:`, error)
  }
}

// Function to create admins collection
async function createAdminsCollection(adminUid: string) {
  try {
    const docRef = db.collection('admins').doc(adminUid)
    await docRef.set({
      createdAt: new Date().toISOString()
    })
    console.log(`✅ Created admins collection and added admin: ${adminUid}`)
  } catch (error) {
    console.error('❌ Error creating admins collection:', error)
  }
}

// Main function to initialize database
async function initializeDatabase(adminUid: string) {
  console.log('🚀 Starting database initialization...')

  // Create all collections
  await createCollection('episodes', sampleData.episodes)
  await createCollection('comedians', sampleData.comedians)
  await createCollection('reviews', sampleData.reviews)
  await createCollection('moments', sampleData.moments)
  await createCollection('users', sampleData.users)
  
  // Create admins collection and add initial admin
  await createAdminsCollection(adminUid)

  console.log('✨ Database initialization complete!')
}

// Get admin UID from command line argument
const adminUid = process.argv[2]

if (!adminUid) {
  console.error('❌ Please provide an admin UID as a command line argument')
  process.exit(1)
}

// Run the initialization
initializeDatabase(adminUid)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }) 