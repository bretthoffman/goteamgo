import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/keap",
        destination: "/call-calendar",
        permanent: true,
      },
      {
        source: "/studio-booking",
        destination: "/production-staffing-portal",
        permanent: true,
      },
      {
        source: "/team-tasks",
        destination: "/studio-rental-checklist",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;