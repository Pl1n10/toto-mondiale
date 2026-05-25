import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Toto Mondiale',
  description: 'World Cup prediction game',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
