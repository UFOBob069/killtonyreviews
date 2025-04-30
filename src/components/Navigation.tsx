import Link from 'next/link'

export default function Navigation() {
  return (
    <nav className="bg-black text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          Kill Tony Universe
        </Link>
        <div className="space-x-4">
          <Link href="/episodes" className="hover:text-gray-300">
            Episodes
          </Link>
          <Link href="/reviews" className="hover:text-gray-300">
            Reviews
          </Link>
          <Link href="/about" className="hover:text-gray-300">
            About
          </Link>
        </div>
      </div>
    </nav>
  )
} 