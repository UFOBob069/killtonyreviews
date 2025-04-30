export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">About Kill Tony Universe</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3">Our Mission</h2>
          <p className="text-gray-700">
            Kill Tony Universe is a fan-created platform dedicated to celebrating and documenting the world of Kill Tony. 
            Our goal is to create a comprehensive resource for fans to explore episodes, share reviews, and connect with 
            the Kill Tony community.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Get Involved</h2>
          <p className="text-gray-700">
            We&apos;re looking for passionate Kill Tony fans to help build and improve this site! This is a volunteer-only 
            project - we&apos;re not looking to create profit, just to build something great for the community.
          </p>
          <p className="text-gray-700 mt-2">
            If you&apos;re interested in contributing your skills (development, design, content creation, etc.), we&apos;d love to 
            hear from you!
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
          <p className="text-gray-700">
            Have questions or want to get involved? Reach out to us at:
          </p>
          <a 
            href="mailto:contact@killtonyuniverse.com" 
            className="text-blue-600 hover:text-blue-800 mt-2 block"
          >
            contact@killtonyuniverse.com
          </a>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Disclaimer</h2>
          <p className="text-gray-700">
            This is an unofficial fan site and is not affiliated with, endorsed by, or sponsored by the Kill Tony podcast 
            or its creators. All content (videos, images, names) remains property of their respective owners.
          </p>
        </section>
      </div>
    </div>
  )
} 