import '@/app/ui/global.css';
import { Metadata } from 'next';
import { inter } from '@/app/ui/fonts';

export const metadata: Metadata = {
  title: {
    template: '%s | Acme Default',
    default: 'Acme Dashboard',
  },
  description: 'The official Next.js Course Dashboard, buildt with App Router',
  metadataBase: new URL('https://web-dashboard-silk.vercel.app/'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
