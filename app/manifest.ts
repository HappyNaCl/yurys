import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YuRyS PWA",
    short_name: "YuRyS",
    description: "A personalized app for Yuyu",
    start_url: "/",
    display: "standalone",
    background_color: "#f4eef0",
    theme_color: "#f4eef0",
    icons: [
      // Chrome's install check needs at least one plain ("any") icon;
      // maskable-only manifests aren't considered installable.
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
