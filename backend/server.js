'use strict';

/**
 * Compatibility entry point for environments that expect a plain JS launcher.
 * It starts the compiled backend if `dist/app.js` exists.
 */

const fs = require('fs');
const path = require('path');

const distAppPath = path.join(__dirname, 'dist', 'app.js');

if (!fs.existsSync(distAppPath)) {
  console.error('Impossible de démarrer le backend: `dist/app.js` est introuvable.');
  console.error("Lance d'abord `npm run build` dans le dossier backend.");
  process.exit(1);
}

require(distAppPath);
