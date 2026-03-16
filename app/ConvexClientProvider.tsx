"use client";

import { ConvexReactClient, ConvexProvider } from "convex/react";
import React from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  console.warn(
    "NEXT_PUBLIC_CONVEX_URL is not set. Convex hooks like useQuery will fail until this is configured."
  );
}

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!convex) {
    // Render children without Convex when URL is missing, so the app doesn't crash
    // but Convex hooks will still throw if used.
    return <>{children}</>;
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

