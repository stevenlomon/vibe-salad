// This is Vanilla TypeScript! No Vite or similar meaning .env.local can't be read at runtime, thus the need for a script like this 
// unless we do a full re-build of the entire project
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env.local');
const outPath = path.resolve(__dirname, 'config.ts');

if (!fs.existsSync(envPath)) {
  console.error('Missing .env.local — copy .env.example and fill in your keys.');
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf-8')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('=').map(s => s.trim()))
);

const ts = `export const CLIENT_ID = '${env.CLIENT_ID}';\nexport const CLIENT_SECRET = '${env.CLIENT_SECRET}';\n`;

fs.writeFileSync(outPath, ts);
console.log('Generated scripts/config.ts from .env.local');
