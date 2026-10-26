// Genera los iconos PNG de la PWA sin dependencias: una "r" geométrica sobre fondo tinta.
// Uso: npm run icons
import { writeFileSync } from 'node:fs'
import { deflateSync, crc32 } from 'node:zlib'

const FONDO = [0x14, 0x14, 0x14]
const TINTA = [0xfa, 0xfa, 0xf9]

// Geometría en un lienzo de 512 (igual que public/icon.svg)
const GROSOR = 36
const TRAZO = { ax: 176, ay: 180, bx: 176, by: 340 } // asta
const ARCO = { cx: 266, cy: 270, r: 90, desde: 40, hasta: 180 } // hombro (grados, eje y hacia arriba)

function distSegmento(px, py, { ax, ay, bx, by }) {
  const dx = bx - ax, dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function distArco(px, py, { cx, cy, r, desde, hasta }) {
  const ang = (Math.atan2(-(py - cy), px - cx) * 180) / Math.PI
  if (ang >= desde && ang <= hasta) return Math.abs(Math.hypot(px - cx, py - cy) - r)
  const extremo = (g) => [cx + r * Math.cos((g * Math.PI) / 180), cy - r * Math.sin((g * Math.PI) / 180)]
  return Math.min(...[desde, hasta].map((g) => { const [x, y] = extremo(g); return Math.hypot(px - x, py - y) }))
}

function dentroRedondeado(px, py, radio) {
  const qx = Math.max(radio - px, px - (512 - radio), 0)
  const qy = Math.max(radio - py, py - (512 - radio), 0)
  return radio - Math.hypot(qx, qy) // >0 dentro
}

function icono(tam, { escala = 1, esquinas = 0 } = {}) {
  const px = 512 / tam
  const filas = []
  for (let y = 0; y < tam; y++) {
    const fila = Buffer.alloc(1 + tam * 4)
    for (let x = 0; x < tam; x++) {
      const X = (x + 0.5) * px, Y = (y + 0.5) * px
      // la glifo se escala hacia el centro (zona segura de los iconos maskable)
      const gx = 256 + (X - 256) / escala, gy = 256 + (Y - 256) / escala
      const d = Math.min(distSegmento(gx, gy, TRAZO), distArco(gx, gy, ARCO))
      const cobertura = Math.max(0, Math.min(1, (GROSOR / 2 - d) / (px / escala) + 0.5))
      const alfaFondo = esquinas ? Math.max(0, Math.min(1, dentroRedondeado(X, Y, esquinas) / px + 0.5)) : 1
      const i = 1 + x * 4
      for (let c = 0; c < 3; c++) fila[i + c] = Math.round(FONDO[c] + (TINTA[c] - FONDO[c]) * cobertura)
      fila[i + 3] = Math.round(alfaFondo * 255)
    }
    filas.push(fila)
  }
  return png(tam, tam, Buffer.concat(filas))
}

function png(w, h, crudo) {
  const trozo = (tipo, datos) => {
    const t = Buffer.from(tipo)
    const len = Buffer.alloc(4); len.writeUInt32BE(datos.length)
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, datos])))
    return Buffer.concat([len, t, datos, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 6 // 8 bits, RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', ihdr), trozo('IDAT', deflateSync(crudo, { level: 9 })), trozo('IEND', Buffer.alloc(0)),
  ])
}

const destino = new URL('../public/', import.meta.url)
writeFileSync(new URL('icon-192.png', destino), icono(192, { esquinas: 112 }))
writeFileSync(new URL('icon-512.png', destino), icono(512, { esquinas: 112 }))
writeFileSync(new URL('icon-maskable-512.png', destino), icono(512, { escala: 0.78 }))
writeFileSync(new URL('apple-touch-icon.png', destino), icono(180))
console.log('Iconos generados en public/')
