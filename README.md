# KillTonyFanReviews.com

An unofficial fan site for the Kill Tony Comedy Podcast, built with Next.js and Firebase.

## Features

- Review and rate Kill Tony episodes
- Discover top-rated moments and comics
- Explore comedian profiles and their episode history
- Celebrate Hall of Fame and Golden Ticket performers
- Search and filter functionality

## Tech Stack

- **Frontend:** Next.js + TypeScript + TailwindCSS
- **Backend:** Firebase (Auth, Firestore, Storage)
- **Hosting:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase account and project

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/killtonyreviews.git
   cd killtonyreviews
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a Firebase project and get your configuration:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication, Firestore, and Storage
   - Get your project configuration

4. Create a `.env.local` file in the root directory and add your Firebase configuration:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
   ```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── episodes/          # Episode pages
│   ├── comedians/         # Comedian pages
│   ├── hall-of-fame/      # Hall of Fame page
│   └── golden-tickets/    # Golden Ticket winners page
├── components/            # Reusable components
├── lib/                   # Utility functions and Firebase config
└── types/                 # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This site is a fan-created project and is not affiliated with, endorsed by, or sponsored by the Kill Tony podcast or its creators. All content (videos, images, names) remains property of their respective owners.
