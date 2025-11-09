import { Metadata } from 'next'
import './globals.css'
import { BackButtonHeader } from '@/components/BackButtonHeader'
import { FooterNav } from '@/components/FooterNav'

export const metadata: Metadata = {
  title: 'チートデイ発見アプリ',
  description: '代謝停滞を科学的に検知し、最適なタイミングでリフィードを提案するWebサービス',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-background text-foreground font-sans antialiased">
        <div className="relative min-h-screen overflow-x-hidden">
          <div className="pointer-events-none fixed inset-0 z-0 opacity-70">
            <div className="absolute inset-0 bg-grid [background-size:32px_32px]" />
            <div className="absolute inset-0 bg-radial-glow" />
          </div>
          <div className="relative z-10 flex min-h-screen flex-col">
            <BackButtonHeader />
            <main className="flex-1">{children}</main>
            <FooterNav />
          </div>
        </div>
      </body>
    </html>
  )
}





