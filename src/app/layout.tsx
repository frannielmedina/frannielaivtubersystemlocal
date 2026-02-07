import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Miko AI VTuber - Juegos Interactivos',
  description: 'AI VTuber avanzado con juegos interactivos, TTS, y integración con Twitch',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-black">{children}</body>
    </html>
  );
}
