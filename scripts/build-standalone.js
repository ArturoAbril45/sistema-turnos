/**
 * Copia los assets estáticos al directorio standalone de Next.js
 * después de "next build". Necesario para el instalador de Electron.
 */
const fs   = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) { console.warn(`  ⚠ No existe: ${src}`); return; }
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const s = path.join(src, item);
    const d = path.join(dest, item);
    fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

const root       = path.join(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');

console.log('Copiando assets al standalone...');
copyDir(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'));
copyDir(path.join(root, 'public'),           path.join(standalone, 'public'));
console.log('Listo.');
