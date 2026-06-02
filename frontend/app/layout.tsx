import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Providers from '../components/Providers';
import { ReactNode } from 'react';

export const metadata = {
  title: 'FoodBridge AI - Surplus Food Redistribution System',
  description: 'Enterprise AI-based surfeit food redistribution system connecting surplus food donors to local NGOs dynamically.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark bg-dark-900">
      <body
        className="flex flex-col min-h-screen bg-dark-900 text-slate-100 antialiased overflow-x-hidden"
        style={{
          backgroundImage:
            'radial-gradient(circle at 10% 20%, rgba(16,185,129,0.05) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(5,150,105,0.03) 0%, transparent 40%)',
          backgroundAttachment: 'fixed',
        }}
      >
        <Providers>
          <Navbar />
          <main className="flex-grow flex flex-col">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
