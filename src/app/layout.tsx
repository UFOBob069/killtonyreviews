import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/lib/auth'
import Header from '@/components/Header';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KillTonyUniverse.com",
  description: "Unofficial fan site for Kill Tony lovers. Explore the universe of Kill Tony, leave reviews, rank episodes, and track your favorite comics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <Header />
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="bg-black text-white py-8">
            <div className="container mx-auto px-4">
              <p className="text-center text-sm">
                This site is a fan-created project and is not affiliated with, endorsed by, or sponsored by the Kill Tony podcast or its creators. All content (videos, images, names) remains property of their respective owners.
              </p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
