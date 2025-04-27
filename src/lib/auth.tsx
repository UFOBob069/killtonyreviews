'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { getAuth, onAuthStateChanged, User } from 'firebase/auth'
import { signInWithGoogle, signOutUser } from './firebase'
import { useRouter } from 'next/navigation'
import { getDoc, doc } from 'firebase/firestore'
import { db } from './firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const auth = getAuth()
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async () => {
    try {
      const user = await signInWithGoogle()
      setUser(user)
    } catch (error) {
      console.error('Error signing in:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      await signOutUser()
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useRequireAuth() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  return { user, loading }
}

export function useAdmin() {
  const { user, loading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminLoading, setAdminLoading] = useState(true)

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false)
        setAdminLoading(false)
        return
      }

      try {
        // First check custom claims
        const idTokenResult = await user.getIdTokenResult()
        if (idTokenResult.claims.admin === true) {
          setIsAdmin(true)
          setAdminLoading(false)
          return
        }

        // Fallback to checking Firestore admins collection
        const adminDoc = await getDoc(doc(db, 'admins', user.uid))
        if (adminDoc.exists()) {
          // Set the admin custom claim for future use
          await user.getIdToken(true) // Force refresh to get updated claims
          setIsAdmin(true)
        } else {
          setIsAdmin(false)
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      }
      
      setAdminLoading(false)
    }

    checkAdminStatus()
  }, [user])

  return { isAdmin, loading: loading || adminLoading }
} 