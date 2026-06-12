Este es un proyecto de [Next.js](https://nextjs.org) creado con [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Estructura del proyecto

```
sistema-turnos/
├── app/                  # Rutas y páginas (Next.js App Router)
│   ├── mostrador/        # Pantalla de recepción: genera y controla los turnos
│   ├── consultorio/      # Pantalla del consultorio médico
│   ├── sala/             # Pantalla de la sala de espera
│   ├── stream/           # Página de streaming/video para la sala de espera
│   ├── api/              # Endpoints de la API (turnos, historial, config, etc.)
│   ├── components/       # Componentes propios de la app (splash, controles de ventana)
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/           # Componentes compartidos (reloj, modal de PIN, íconos)
├── data/                 # Datos persistentes en JSON (turnos, historial)
├── lib/                  # Lógica de negocio (cola de turnos, almacenamiento)
├── public/               # Imágenes y recursos estáticos
├── scripts/              # Scripts de build (empaquetado standalone)
├── electron/             # App de escritorio con Electron
├── src-tauri/            # App de escritorio con Tauri (Rust)
├── next.config.ts
├── package.json
└── README.md
```

## Primeros pasos

Primero, ejecuta el servidor de desarrollo:

```bash
npm run dev
# o
yarn dev
# o
pnpm dev
# o
bun dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver el resultado.

Puedes empezar a editar la página modificando `app/page.tsx`. La página se actualiza automáticamente mientras editas el archivo.

Este proyecto usa [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) para optimizar y cargar automáticamente [Geist](https://vercel.com/font), una nueva familia de fuentes de Vercel.

## Aprender más

Para aprender más sobre Next.js, revisa los siguientes recursos:

- [Documentación de Next.js](https://nextjs.org/docs) - aprende sobre las funciones y la API de Next.js.
- [Aprende Next.js](https://nextjs.org/learn) - un tutorial interactivo de Next.js.

Puedes revisar [el repositorio de Next.js en GitHub](https://github.com/vercel/next.js) - ¡tus comentarios y contribuciones son bienvenidos!

## Despliegue en Vercel

La forma más fácil de desplegar tu aplicación Next.js es usando la [plataforma de Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme), de los creadores de Next.js.

Revisa nuestra [documentación de despliegue de Next.js](https://nextjs.org/docs/app/building-your-application/deploying) para más detalles.
