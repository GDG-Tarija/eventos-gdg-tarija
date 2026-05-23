const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../src/environments');
const filePath = path.join(dir, 'environment.prod.ts');

// Asegurar que el directorio existe
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Leer las variables de entorno de producción
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';

const content = `export const environment = {
  production: true,
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}',
};
`;

fs.writeFileSync(filePath, content, 'utf8');
console.log('[scripts/set-env.js] src/environments/environment.prod.ts generado exitosamente.');
