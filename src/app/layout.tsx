import { Metadata } from 'next'
import './globals.css'

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
          <div className="relative z-10 min-h-screen">{children}</div>
        </div>
      </body>
    </html>
  )
}





