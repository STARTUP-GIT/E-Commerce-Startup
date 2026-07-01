import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ReactQueryProvider from "@/lib/providers/ReactQueryProvider";
import SessionProvider from "@/lib/providers/SessionProvider";
import { CartDrawer } from "@/features/cart/ui/CartDrawer";
import { ComingSoonDialog } from "@/components/ui/ComingSoonDialog";
import { PremiumDialogContainer } from "@/components/ui/PremiumDialogContainer";
import { AddressSelectorDialog } from "@/components/ui/AddressSelectorDialog";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aura Marketplace - Customer Portal",
  description: "Experience premium marketplace shopping with Aura — discover local artisans and custom 3D prints.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
      >
        <SessionProvider>
          <ReactQueryProvider>
            {children}
            <CartDrawer />
            <ComingSoonDialog />
            <AddressSelectorDialog />
            <PremiumDialogContainer />
          </ReactQueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
