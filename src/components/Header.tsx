'use client'

import Link from 'next/link';
import { useState } from 'react';
import { UserButton } from '@/components/UserButton';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="bg-black text-white">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold">
            Kill Tony Universe
          </Link>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-6">
            <div className="space-x-4">
              <Link href="/episodes" className="hover:text-gray-300">Episodes</Link>
              <Link href="/comedians" className="hover:text-gray-300">Comedians</Link>
              <Link href="/hall-of-fame" className="hover:text-gray-300">Hall of Fame</Link>
              <Link href="/golden-tickets" className="hover:text-gray-300">Golden Tickets</Link>
              <Link href="/about" className="hover:text-gray-300">About</Link>
            </div>
            <UserButton />
          </div>
          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center">
            <button
              aria-label="Open menu"
              className="focus:outline-none"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        {/* Mobile menu dropdown */}
        {menuOpen && (
          <div className="md:hidden mt-3 bg-black rounded-lg shadow-lg py-4 px-6 flex flex-col space-y-4 z-50 absolute left-0 right-0">
            <Link href="/episodes" className="hover:text-gray-300" onClick={() => setMenuOpen(false)}>Episodes</Link>
            <Link href="/comedians" className="hover:text-gray-300" onClick={() => setMenuOpen(false)}>Comedians</Link>
            <Link href="/hall-of-fame" className="hover:text-gray-300" onClick={() => setMenuOpen(false)}>Hall of Fame</Link>
            <Link href="/golden-tickets" className="hover:text-gray-300" onClick={() => setMenuOpen(false)}>Golden Tickets</Link>
            <Link href="/about" className="hover:text-gray-300" onClick={() => setMenuOpen(false)}>About</Link>
            <div className="pt-2 border-t border-gray-700">
              <UserButton />
            </div>
          </div>
        )}
      </nav>
    </header>
  );
} 