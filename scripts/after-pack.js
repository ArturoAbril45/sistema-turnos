/**
 * Hook afterPack: copia el node_modules del standalone después de que
 * electron-builder empaqueta (lo filtra por defecto y no lo incluye).
 */
const fs   = require('fs');
const path = require('path');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const s = path.join(src, item);
    const d = path.join(dest, item);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

exports.default = async function (context) {
  const srcNm = path.join(
    context.packager.projectDir,
    '.next', 'standalone', 'node_modules'
  );
  const destNm = path.join(
    context.appOutDir,
    'resources', '.next', 'standalone', 'node_modules'
  );

  if (fs.existsSync(srcNm) && !fs.existsSync(destNm)) {
    console.log('  • copiando standalone/node_modules...');
    copyDir(srcNm, destNm);
    console.log('  • node_modules copiado OK');
  }
};
