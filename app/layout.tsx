import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  weight: ["300", "400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-fredoka",
});

export const metadata: Metadata = {
  title: "HHM Christmas Magic",
  description: "A magical holiday experience for HHM staff and kids",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${fredoka.variable} antialiased font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
