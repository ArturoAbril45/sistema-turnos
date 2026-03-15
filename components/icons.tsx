import React, { ReactNode } from 'react';

interface IconProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

function Icon({ className = '', size = 24, style, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={className}
      style={style}
    >
      {children}
    </svg>
  );
}

// ─── Navegación ──────────────────────────────────────────────────────────────

export function ArrowLeftIcon(p: IconProps) {
  return <Icon {...p}><path d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></Icon>;
}

export function ArrowRightIcon(p: IconProps) {
  return <Icon {...p}><path d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></Icon>;
}

export function PlayIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
    </Icon>
  );
}

export function ChevronUpIcon(p: IconProps) {
  return <Icon {...p}><path d="m4.5 15.75 7.5-7.5 7.5 7.5" /></Icon>;
}

export function ChevronDownIcon(p: IconProps) {
  return <Icon {...p}><path d="m19.5 8.25-7.5 7.5-7.5-7.5" /></Icon>;
}

// ─── Acciones ────────────────────────────────────────────────────────────────

export function PencilIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
    </Icon>
  );
}

export function XMarkIcon(p: IconProps) {
  return <Icon {...p}><path d="M6 18 18 6M6 6l12 12" /></Icon>;
}

export function CheckIcon(p: IconProps) {
  return <Icon {...p}><path d="m4.5 12.75 6 6 9-13.5" /></Icon>;
}

export function TrashIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </Icon>
  );
}

export function Cog6ToothIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </Icon>
  );
}

// ─── Usuarios / Estado ───────────────────────────────────────────────────────

export function UsersIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </Icon>
  );
}

export function QueueListIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
    </Icon>
  );
}

export function BuildingOfficeIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
    </Icon>
  );
}

export function ComputerDesktopIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" />
    </Icon>
  );
}

export function TvIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125Z" />
    </Icon>
  );
}

// ─── Tipos de atención médica ─────────────────────────────────────────────────

/** Consulta médica — estetoscopio */
export function StethoscopeIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4.5 3v7a7.5 7.5 0 0 0 15 0V3" />
      <circle cx="4.5" cy="2.5" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="19.5" cy="2.5" r="1.25" fill="currentColor" stroke="none" />
      <path d="M12 17.5v2" />
      <circle cx="12" cy="21" r="2" />
    </Icon>
  );
}

/** Aplicación / Toma de Presión — jeringa */
export function SyringeIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="m18 2 4 4" />
      <path d="m17 7 3-3" />
      <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
      <path d="m9 11 4 4" />
      <path d="m5 19-3 3" />
      <path d="m14 4 6 6" />
    </Icon>
  );
}

/** Certificado médico — documento con check */
export function FileCheckIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="m9 15 2 2 4-4" />
    </Icon>
  );
}

/** Procedimiento — tijeras */
export function ScissorsIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.12 15.88" />
      <path d="M14.47 14.48 20 20" />
      <path d="M8.12 8.12 12 12" />
    </Icon>
  );
}

/** Nebulización — nube / viento */
export function WindIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
    </Icon>
  );
}

/** Glucosa — gota de sangre */
export function DropletIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </Icon>
  );
}

/** Pantalla en espera — monitor con señal */
export function MonitorIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="M9 8l2 2 4-4" />
    </Icon>
  );
}
