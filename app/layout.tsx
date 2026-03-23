import type { Metadata } from 'next';
import { Fraunces, Outfit } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'vio – Deine Werbung. Überall in der Schweiz.',
  description: 'Erstelle in wenigen Minuten eine professionelle Werbekampagne für die Schweiz.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={`${fraunces.variable} ${outfit.variable}`}>
        {/* ── Watercolour background — fixed, behind all pages ─────────── */}
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: '700px', height: '700px', borderRadius: '50%', filter: 'blur(88px)', background: 'radial-gradient(circle, rgba(184,169,232,0.28), rgba(184,169,232,0.05) 65%, transparent)', top: '-200px', left: '-130px', animation: 'drift 27s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', width: '480px', height: '480px', borderRadius: '50%', filter: 'blur(88px)', background: 'radial-gradient(circle, rgba(200,223,248,0.3), rgba(200,223,248,0.05) 65%, transparent)', top: '280px', right: '-110px', animation: 'drift 20s ease-in-out -9s infinite alternate' }} />
          <div style={{ position: 'absolute', width: '380px', height: '380px', borderRadius: '50%', filter: 'blur(88px)', background: 'radial-gradient(circle, rgba(242,196,206,0.22), transparent 65%)', bottom: '180px', left: '12%', animation: 'drift 25s ease-in-out -6s infinite alternate' }} />
          <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', filter: 'blur(88px)', background: 'radial-gradient(circle, rgba(212,168,67,0.16), transparent 65%)', bottom: '0', right: '22%', animation: 'drift 31s ease-in-out -14s infinite alternate' }} />
          <div style={{ position: 'absolute', width: '250px', height: '250px', borderRadius: '50%', filter: 'blur(88px)', background: 'radial-gradient(circle, rgba(184,221,214,0.26), transparent 70%)', top: '55%', left: '48%', animation: 'drift 21s ease-in-out -4s infinite alternate' }} />
        </div>
        {/* ── Content sits above blobs ──────────────────────────────────── */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
