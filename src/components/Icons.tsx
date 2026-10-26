import type { SVGProps } from 'react'

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
})

export const IconArmario = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 6.5a1.75 1.75 0 1 1 1.75-1.75c0 .9-.6 1.3-1.15 1.7-.4.3-.6.6-.6 1.05v.5" />
    <path d="M12 8 3.4 14.6c-.8.6-.4 1.9.6 1.9h16c1 0 1.4-1.3.6-1.9L12 8Z" />
  </svg>
)
export const IconCombinar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="4" y="3.5" width="7" height="7" rx="2" />
    <rect x="13" y="3.5" width="7" height="7" rx="2" />
    <rect x="4" y="13.5" width="16" height="7" rx="2" />
  </svg>
)
export const IconMas = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const IconAtras = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M15 5 8 12l7 7" />
  </svg>
)
export const IconSalir = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 16l-4-4 4-4M5 12h11" />
  </svg>
)
export const IconCamara = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
    <circle cx="12" cy="12.5" r="3.5" />
  </svg>
)
export const IconGaleria = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m20.5 16-4.5-4.5-8.5 8" />
  </svg>
)
export const IconDado = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="16" height="16" rx="3.5" />
    <circle cx="9" cy="9" r=".9" fill="currentColor" />
    <circle cx="15" cy="15" r=".9" fill="currentColor" />
    <circle cx="15" cy="9" r=".9" fill="currentColor" />
    <circle cx="9" cy="15" r=".9" fill="currentColor" />
  </svg>
)
export const IconPapelera = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4.5 7h15M10 11v6M14 11v6M6 7l1 12a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 19l1-12M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" />
  </svg>
)
