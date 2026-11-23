"use client";

import { useEffect } from "react";
import axios from "axios";

export function DynamicFavicon() {
  useEffect(() => {
    let isMounted = true;
    const fetchFavicon = async () => {
      try {
        const backendUrl =
          process.env.NEXT_PUBLIC_API_URL ||
          process.env.NEXT_PUBLIC_DELIVERY_BACKEND_URL ||
          "http://localhost:8004";

        const res = await axios.get(`${backendUrl}/api/delivery/settings/public`);
        const faviconUrl = res.data?.settings?.brandFaviconUrl;
        const brandName = res.data?.settings?.brandName;

        if (isMounted && faviconUrl) {
          let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
          if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
          }
          link.href = faviconUrl;

          let appleLink = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
          if (!appleLink) {
            appleLink = document.createElement("link");
            appleLink.rel = "apple-touch-icon";
            document.head.appendChild(appleLink);
          }
          appleLink.href = faviconUrl;
        }

        if (isMounted && brandName && !document.title.includes(brandName)) {
          document.title = `${brandName} — Partner Network`;
        }
      } catch {
        // Fallback silently if offline or initial load
      }
    };

    fetchFavicon();
    return () => {
      isMounted = false;
    };
  }, []);

  return null;
}
