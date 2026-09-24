import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "@/app/providers";
import { uiScaleCss } from "@/lib/ui-scale";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "JeiChat",
  description: "Team chat for workspaces, channels, and tickets.",
  applicationName: "JeiChat",
  appleWebApp: {
    capable: true,
    title: "JeiChat",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

/** Stops iOS Safari from zooming the page when a text field is focused. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" className={cn("font-sans", inter.variable)} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: uiScaleCss() }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
