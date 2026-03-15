import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Permite iframes de cualquier origen para el reproductor de la sala de espera
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
