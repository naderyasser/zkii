import type { Metadata } from "next";
import { Amiri, IBM_Plex_Sans_Arabic, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import QueryProvider from "@/components/QueryProvider";
import ThemeProvider from "@/components/ThemeProvider";
import AuthSessionProvider from "@/components/SessionProvider";

// Amiri — صوت الهوية (عناوين/اقتباسات)
const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
});

// IBM Plex Sans Arabic — نص الواجهة والجسم
const ibmPlex = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-plex",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600"],
});

// IBM Plex Mono — الكود
const ibmMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "زكي — مساحة عمل",
  description: "زكي — مساحة عمل ذكية بهوية المتحف الكلاسيكي",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${amiri.variable} ${ibmPlex.variable} ${ibmMono.variable} font-[family-name:var(--font-ibm-plex)] antialiased bg-background text-foreground`}
      >
        <AuthSessionProvider>
          <ThemeProvider>
            <QueryProvider>
              {children}
            </QueryProvider>
            <Toaster />
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
