import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/Providers";
import { PremiumDialogContainer } from "@/components/ui/PremiumDialogContainer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Marketplace",
    template: "%s | Marketplace",
  },
  description: "Enterprise administration dashboard for the marketplace platform.",
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="min-h-full antialiased font-sans bg-background text-foreground">
        <Providers>
          {children}
          <PremiumDialogContainer />
        </Providers>
      </body>
    </html>
  );
}
