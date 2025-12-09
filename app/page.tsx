'use client';

import MagicInterface from '@/components/MagicInterface';
import CanvasSnow from '@/components/CanvasSnow';

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <CanvasSnow />
      <MagicInterface />
    </main>
  );
}
