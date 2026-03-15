import Link from 'next/link';
import Image from 'next/image';
import { ComputerDesktopIcon, StethoscopeIcon, TvIcon } from '@/components/icons';

const modules = [
  {
    href: '/mostrador',
    label: 'Mostrador',
    description: 'Generación y control de turnos',
    Icon: ComputerDesktopIcon,
    gradient: 'from-blue-600 to-blue-800',
  },
  {
    href: '/consultorio',
    label: 'Consultorio',
    description: 'Vista del médico — atender pacientes',
    Icon: StethoscopeIcon,
    gradient: 'from-sky-500 to-cyan-700',
  },
  {
    href: '/sala',
    label: 'Sala de Espera',
    description: 'Pantalla de turnos y contenido',
    Icon: TvIcon,
    gradient: 'from-slate-600 to-slate-900',
  },
] as const;

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden">

      {/* ── Imagen de fondo ── */}
      <Image
        src="/doctor-bg.jpg"
        alt=""
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />

      {/* ── Capas de oscurecimiento ── */}
      {/* Capa base oscura */}
      <div className="absolute inset-0 bg-black/60" />
      {/* Gradiente azul encima para el tono hospitalario */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(160deg, rgba(15,23,42,.75) 0%, rgba(30,58,138,.55) 50%, rgba(3,105,161,.45) 100%)',
        }}
      />
      {/* Viñeta en los bordes */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,.55) 100%)',
        }}
      />

      {/* ── Contenido ── */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">

        {/* Logo / branding */}
        <div className="mb-10 text-center anim-fade-in">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center ring-1 ring-white/25"
            style={{ background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(12px)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
              width={32} height={32}>
              <path d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-lg">
            Sistema de Turnos
          </h1>
          <p className="text-blue-200/90 text-sm mt-1.5 drop-shadow">
            Seleccione el módulo de acceso
          </p>
        </div>

        {/* Cards */}
        <div className="w-full flex flex-col gap-3">
          {modules.map(({ href, label, description, Icon, gradient }, i) => (
            <Link
              key={href}
              href={href}
              className="anim-slide-up group flex items-center gap-4 rounded-2xl px-5 py-4 ring-1 ring-white/10 hover:ring-white/30 transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(16px)',
                animationDelay: `${i * 90}ms`,
              }}
            >
              {/* Icon badge */}
              <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                <Icon size={22} className="text-white" />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-base leading-tight">{label}</p>
                <p className="text-white/50 text-xs mt-0.5 truncate">{description}</p>
              </div>

              {/* Arrow */}
              <svg
                className="shrink-0 text-white/25 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all"
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2.5} width={16} height={16}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
