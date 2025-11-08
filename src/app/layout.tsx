import { Metadata } from 'next'

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
      <body>{children}</body>
    </html>
  )
}





