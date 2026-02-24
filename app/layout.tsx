import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AuraMesh — Emergency Command Center',
  description: 'Offline-first emergency command center with mesh networking, acoustic ML, and local SOS storage.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
