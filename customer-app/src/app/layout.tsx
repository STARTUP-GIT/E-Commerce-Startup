import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ReactQueryProvider from "@/lib/providers/ReactQueryProvider";
import SessionProvider from "@/lib/providers/SessionProvider";
import { BrandingProvider } from "@/lib/providers/BrandingProvider";
import { CartDrawer } from "@/features/cart/ui/CartDrawer";
import { ComingSoonDialog } from "@/components/ui/ComingSoonDialog";
import { PremiumDialogContainer } from "@/components/ui/PremiumDialogContainer";
import { AddressSelectorDialog } from "@/components/ui/AddressSelectorDialog";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const BACKEND_URL = process.env.BACKEND_API_URL?.replace(/\/$/, "");

const FALLBACK_METADATA: Metadata = {
  title: {
    default: "Marketplace",
    template: "%s",
  },
  description: "Discover local artisans, handcrafted items, and custom products.",
};

export async function generateMetadata(): Promise<Metadata> {
  if (!BACKEND_URL) return FALLBACK_METADATA;
  try {
    const res = await fetch(`${BACKEND_URL}/api/platform/branding/public`, {
      cache: "no-store",
    });
    if (!res.ok) return FALLBACK_METADATA;
    const b = await res.json();
    const seoTitle = typeof b?.seoTitle === "string" && b.seoTitle.trim() !== ""
      ? b.seoTitle.trim()
      : "Marketplace";
    const seoDescription = typeof b?.seoDescription === "string" && b.seoDescription.trim() !== ""
      ? b.seoDescription.trim()
      : "Discover local artisans, handcrafted items, and custom products.";
    const browserTitle = typeof b?.browserTitle === "string" && b.browserTitle.trim() !== ""
      ? b.browserTitle.trim()
      : seoTitle;
    return {
      title: {
        default: browserTitle || seoTitle,
        template: "%s",
      },
      description: seoDescription,
    };
  } catch {
    return FALLBACK_METADATA;
  }
}

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
            <BrandingProvider>
              {children}
              <CartDrawer />
              <ComingSoonDialog />
              <AddressSelectorDialog />
              <PremiumDialogContainer />
            </BrandingProvider>
          </ReactQueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
