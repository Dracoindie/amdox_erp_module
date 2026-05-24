import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { MSWProvider } from "../components/MSWProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "AMX-ERP-2026",
  description: "Amdox ERP Suite",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-gray-50 text-gray-900`}>
        <MSWProvider>
          {children}
        </MSWProvider>
      </body>
    </html>
  );
}
