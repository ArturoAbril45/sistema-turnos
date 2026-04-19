import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  output: 'standalone',
  outputFileTracingExcludes: {
    '*': ['src-tauri/**', 'electron/**', 'dist/**'],
  },
  // Permite iframes de cualquier origen para el reproductor de la sala de espera
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
  },
};

export default nextConfig;
