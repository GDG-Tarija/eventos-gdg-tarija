const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../src/environments');

// Asegurar que el directorio existe
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// 1. Generar environment.ts (desarrollo, requerido como punto de partida por Angular CLI)
const devFilePath = path.join(dir, 'environment.ts');
const devContent = `export const environment = {
  production: false,
  supabaseUrl: '',
  supabaseKey: '',
};
`;
fs.writeFileSync(devFilePath, devContent, 'utf8');
console.log('[scripts/set-env.js] src/environments/environment.ts generado exitosamente.');

// 2. Generar environment.prod.ts (producción, usado para la sustitución de archivos)
const prodFilePath = path.join(dir, 'environment.prod.ts');
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';

const prodContent = `export const environment = {
  production: true,
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}',
};
`;
fs.writeFileSync(prodFilePath, prodContent, 'utf8');
console.log('[scripts/set-env.js] src/environments/environment.prod.ts generado exitosamente.');
