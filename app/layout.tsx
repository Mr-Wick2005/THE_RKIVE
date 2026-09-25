import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | THE RKIVE',
    default: 'THE RKIVE — Independent Digital Publication & Magazine Archive',
  },
  description:
    'A contemporary digital magazine archive and publishing platform preserving collegiate scholarship, research proceedings, and creative capstones.',
  keywords: [
    'THE RKIVE',
    'Digital Magazine',
    'Editorial Archive',
    'College Publications',
    'Research Periodicals',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-[#EAE3D7]">
      <body className="min-h-screen flex flex-col bg-[#EAE3D7] paper-texture text-[#121210] selection:bg-[#1B44B8] selection:text-[#FAF7F2] relative">
        <div className="noise-overlay" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
