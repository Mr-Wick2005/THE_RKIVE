import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | Athenaeum — College Digital Archive',
    default: 'Athenaeum — College Digital Magazine Platform',
  },
  description:
    'A college-wide digital magazine publishing platform and academic archive for department publications, research papers, and student capstones.',
  keywords: [
    'Digital Magazine',
    'College Publications',
    'Academic Archive',
    'Engineering Journal',
    'Athenaeum',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-[#F8F6F1]">
      <body className="min-h-screen flex flex-col bg-[#F8F6F1] text-[#171717]">
        {children}
      </body>
    </html>
  );
}
