'use client'

import { usePathname } from 'next/navigation'

interface StructuredDataProps {
  data?: any
}

export default function StructuredData({ data }: StructuredDataProps) {
  const pathname = usePathname()
  
  // Default organization data
  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "bbairtools",
    "description": "Award flight route planning tools. Plan routes and optimize your flying experience.",
    "url": "https://bbairtools.com",
    "logo": "https://bbairtools.com/rblogo.png",
    "sameAs": []
  }

  // Website data
  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "bbairtools",
    "description": "Award flight route planning tools. Plan routes and optimize your flying experience.",
    "url": "https://bbairtools.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://bbairtools.com/find-airport?search={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  }

  // Software application data
  const softwareData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "bbairtools",
    "applicationCategory": "Business",
    "description": "Award flight route planning tools. Plan routes and optimize your flying experience.",
    "url": "https://bbairtools.com",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Flight route planning",
      "Airport search and database",
      "Delay analysis",
      "Award finder",
      "Shortest route calculation"
    ]
  }

  // Combine all structured data
  const allData = [organizationData, websiteData, softwareData]
  
  // Add custom data if provided
  if (data) {
    allData.push(data)
  }

  return (
    <>
      {allData.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item)
          }}
        />
      ))}
    </>
  )
}