const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env.local');
const outPath = path.resolve(__dirname, 'config.ts');

let clientId, clientSecret;

if (fs.existsSync(envPath)) {
  // Local dev: read from .env.local file
  const env = Object.fromEntries(
    fs.readFileSync(envPath, 'utf-8')
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => line.split('=').map(s => s.trim()))
  );
  clientId = env.CLIENT_ID;
  clientSecret = env.CLIENT_SECRET;
} else if (process.env.CLIENT_ID && process.env.CLIENT_SECRET) {
  // CI/Vercel: read from environment variables
  clientId = process.env.CLIENT_ID;
  clientSecret = process.env.CLIENT_SECRET;
} else {
  console.error('Missing credentials — set .env.local locally or env vars in Vercel.');
  process.exit(1);
}

const ts = `export const CLIENT_ID = '${clientId}';\nexport const CLIENT_SECRET = '${clientSecret}';\n`;

fs.writeFileSync(outPath, ts);
console.log('Generated scripts/config.ts');
