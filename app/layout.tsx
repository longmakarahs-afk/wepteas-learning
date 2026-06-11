import type {Metadata} from 'next';
import { Kantumruy_Pro } from 'next/font/google';
import Script from 'next/script';
import './globals.css'; // Global styles

const kantumruy = Kantumruy_Pro({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['khmer', 'latin'],
  variable: '--font-kantumruy',
});

export const metadata: Metadata = {
  title: 'SecureAttend',
  description: 'SecureAttend Multi-tenant Attendance, HR & Payroll System with AI Face verification',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="km" className={`${kantumruy.variable}`}>
      <body className="bg-slate-900 text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white" suppressHydrationWarning>
        <Script src="/face-api.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
