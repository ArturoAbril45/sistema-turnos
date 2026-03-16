import Link from 'next/link';
import Image from 'next/image';
import Clock from '@/components/Clock';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sistema de Turnos' };

const MODULES = [
  {
    href: '/mostrador',
    label: 'Mostrador',
    description: 'Generación y control de turnos',
    accent: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    tag: 'Recepción',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24"
        fill="none" stroke="#2563eb" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
        <path d="M7 8h4M7 11h2"/>
      </svg>
    ),
  },
  {
    href: '/consultorio',
    label: 'Consultorio',
    description: 'Vista del médico — atender pacientes',
    accent: '#0891b2',
    bg: '#ecfeff',
    border: '#a5f3fc',
    tag: 'Médico',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24"
        fill="none" stroke="#0891b2" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
        <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
        <circle cx="20" cy="10" r="2"/>
      </svg>
    ),
  },
  {
    href: '/sala',
    label: 'Sala de Espera',
    description: 'Pantalla de turnos y contenido',
    accent: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    tag: 'Pantalla',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24"
        fill="none" stroke="#7c3aed" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="1"/>
        <path d="M8 21h8M12 17v4"/>
      </svg>
    ),
  },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col relative">

      {/* ── Imagen de fondo ── */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/doctor-bg.jpg"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Capa azulada semitransparente */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(15,30,80,0.82) 0%, rgba(29,78,216,0.72) 50%, rgba(7,89,133,0.80) 100%)' }} />
      </div>

      {/* ── Top bar ── */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/15 shrink-0">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-[11px] text-white/60 font-medium">Sistema activo</span>
          </div>
          <Clock />
        </div>
      </header>

      {/* ── Cuerpo — layout dos columnas en desktop ── */}
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

          {/* ── Ilustración ── */}
          <div className="w-full lg:w-1/2 flex items-center justify-center shrink-0">
            <div className="relative w-full max-w-sm lg:max-w-none">
              <Image
                src="/medical-reception.jpg"
                alt="Atención médica"
                width={520}
                height={520}
                priority
                className="w-full h-auto drop-shadow-sm"
              />
            </div>
          </div>

          {/* ── Panel de módulos ── */}
          <div className="w-full lg:w-1/2">

            {/* Título */}
            <div className="mb-6">
              <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-1">
                Bienvenido
              </p>
              <h1 className="text-2xl font-extrabold text-white leading-tight">
                Seleccione su<br className="hidden sm:block" /> módulo de acceso
              </h1>
              <p className="text-white/50 text-sm mt-2">
                Sistema integrado de gestión de atención médica.
              </p>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2.5">
              {MODULES.map(({ href, label, description, accent, bg, border, tag, icon }) => (
                <Link key={href} href={href}
                  className="group flex items-center gap-4 rounded-xl px-4 py-3.5 transition-all hover:shadow-lg active:scale-[.99] border border-white/15 hover:border-white/30"
                  style={{ background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(12px)' }}
                >
                  {/* Icon */}
                  <div className="shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center"
                    style={{ background: bg, borderColor: border }}>
                    {icon}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white text-sm leading-tight">{label}</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                        style={{ background: `${accent}25`, borderColor: `${accent}55`, color: '#fff' }}>
                        {tag}
                      </span>
                    </div>
                    <p className="text-white/50 text-xs mt-0.5 truncate">{description}</p>
                  </div>

                  {/* Arrow */}
                  <svg className="shrink-0 text-white/25 group-hover:text-white/70 transition"
                    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={2.5} width={15} height={15}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ))}
            </div>

            {/* Footer */}
            <p className="text-[11px] text-white/30 font-medium mt-6">
              OpenKode · Arturo Abril
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
