import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { LocationProvider } from "@/components/location/LocationContext";
import { LocationSelectorModal } from "@/components/location/LocationSelectorModal";
import { LocationRequestModal } from "@/components/location/LocationRequestModal";
import { DynamicFavicon } from "@/components/layout/DynamicFavicon";

export async function generateMetadata(): Promise<Metadata> {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_DELIVERY_BACKEND_URL ||
    process.env.API_URL ||
    "http://localhost:8004";

  let brandName = "AtlasBasket Delivery";
  let brandFaviconUrl: string | null = null;

  try {
    const res = await fetch(`${backendUrl}/api/delivery/settings/public`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.settings?.brandName) {
        brandName = data.settings.brandName;
      }
      if (data?.settings?.brandFaviconUrl) {
        brandFaviconUrl = data.settings.brandFaviconUrl;
      }
    }
  } catch {
    // Graceful fallback to default
  }

  return {
    title: `${brandName} — Partner Network`,
    description:
      "Deliver with AtlasBasket. Flexible hours, fair payouts, and real-time navigation.",
    icons: brandFaviconUrl
      ? {
          icon: brandFaviconUrl,
          shortcut: brandFaviconUrl,
          apple: brandFaviconUrl,
        }
      : {
          icon: "/favicon.ico",
        },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#07070a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#07070a] text-zinc-100 min-h-screen antialiased flex flex-col selection:bg-white/20 selection:text-white">
        <AuthProvider>
          <LocationProvider>
            <DynamicFavicon />
            {children}
            <LocationSelectorModal />
            <LocationRequestModal />
          </LocationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
