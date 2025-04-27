'use client'

import { useAuth } from '@/lib/auth'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { UserCircleIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

export function UserButton() {
  const { user, loading, signIn, signOut } = useAuth()

  const handleSignIn = async () => {
    try {
      await signIn()
    } catch (error: unknown) {
      // Ignore the popup-closed error as it's expected behavior
      if (error instanceof Error && error.code !== 'auth/popup-closed-by-user') {
        console.error('Error signing in:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
    )
  }

  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        Sign In
      </button>
    )
  }

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center space-x-2 text-white hover:text-gray-300">
        {user.photoURL ? (
          <Image
            src={user.photoURL}
            alt={user.displayName || 'User'}
            className="w-8 h-8 rounded-full"
            width={32}
            height={32}
          />
        ) : (
          <UserCircleIcon className="w-8 h-8" />
        )}
        <span className="hidden md:inline">{user.displayName || 'Account'}</span>
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={signOut}
                className={`${
                  active ? 'bg-gray-100' : ''
                } block w-full px-4 py-2 text-left text-sm text-gray-700`}
              >
                Sign Out
              </button>
            )}
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>
  )
} 