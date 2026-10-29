import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { AppProviders } from '@/shared/ui/providers'
import { getSiteUrl } from '@/shared/lib/env'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'TeamHub',
    template: '%s · TeamHub'
  },
  description:
    'TeamHub is an internal social network for companies and distributed teams. Share updates, comment, and stay connected.',
  applicationName: 'TeamHub',
  keywords: ['TeamHub', 'internal social network', 'company feed', 'intranet'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'TeamHub',
    title: 'TeamHub',
    description:
      'Internal social network for companies and distributed teams.'
  },
  twitter: {
    card: 'summary',
    title: 'TeamHub',
    description:
      'Internal social network for companies and distributed teams.'
  },
  robots: {
    index: true,
    follow: true
  }
}

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'TeamHub',
    applicationCategory: 'BusinessApplication',
    url: siteUrl,
    description:
      'Internal social network for companies and distributed teams.'
  }

  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
