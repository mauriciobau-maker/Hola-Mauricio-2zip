import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- 1. Building Vite app with Bun ---');
execSync('bun run --filter @workspace/padel-tracker build', { stdio: 'inherit' });

const srcDir = path.resolve(__dirname, '../artifacts/padel-tracker/dist/public');
console.log('--- 2. Checking build output in:', srcDir);

if (!fs.existsSync(srcDir)) {
  console.error('Build directory not found:', srcDir);
  process.exit(1);
}

const destinations = [
  path.resolve(__dirname, '../public'),
  path.resolve(__dirname, '../dist'),
  path.resolve(__dirname, '../artifacts/padel-tracker/public')
];

for (const dest of destinations) {
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(srcDir, dest, { recursive: true });
  console.log(`✓ Copied files to ${dest}:`, fs.readdirSync(dest).filter(f => !f.endsWith('.zip')));
}

console.log('--- 3. Build & copy completed successfully! ---');
