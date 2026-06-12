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




/* Experiencia previa con Next.js:
He trabajado con Next.js en varios proyectos, 
desarrollando aplicaciones web escalables y optimizadas para SEO. 
He implementado características como renderizado del lado del servidor 
(SSR), generación de sitios estáticos (SSG) y manejo de rutas dinámicas. 
Además, he integrado Next.js con diversas APIs y servicios externos para 
mejorar la funcionalidad de las aplicaciones. Mi experiencia me ha 
permitido comprender profundamente el ciclo de vida de las páginas en 
Next.js y cómo optimizar el rendimiento y la experiencia del usuario. */

/* Fabricado por Arturo Abril */