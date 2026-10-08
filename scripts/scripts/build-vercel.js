import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamically locate root directory containing artifacts/padel-tracker
let rootDir = __dirname;
while (rootDir !== '/' && !fs.existsSync(path.join(rootDir, 'artifacts/padel-tracker'))) {
  rootDir = path.dirname(rootDir);
}
if (!fs.existsSync(path.join(rootDir, 'artifacts/padel-tracker'))) {
  rootDir = process.cwd();
  while (rootDir !== '/' && !fs.existsSync(path.join(rootDir, 'artifacts/padel-tracker'))) {
    rootDir = path.dirname(rootDir);
  }
}

console.log('Project Root resolved to:', rootDir);
console.log('--- 1. Building Vite app with Bun ---');
execSync('bun run --filter @workspace/padel-tracker build', { cwd: rootDir, stdio: 'inherit' });

const srcDir = path.resolve(rootDir, 'artifacts/padel-tracker/dist/public');
console.log('--- 2. Checking build output in:', srcDir);

if (!fs.existsSync(srcDir)) {
  console.error('Build directory not found:', srcDir);
  process.exit(1);
}

const destinations = [
  path.resolve(rootDir, 'public'),
  path.resolve(rootDir, 'dist'),
  path.resolve(rootDir, 'artifacts/padel-tracker/public'),
  path.resolve(process.cwd(), 'public'),
  path.resolve(process.cwd(), 'dist')
];

for (const dest of new Set(destinations)) {
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(srcDir, dest, { recursive: true });
  console.log(`✓ Copied files to ${dest}:`, fs.readdirSync(dest).filter(f => !f.endsWith('.zip')));
}

console.log('--- 3. Build & copy completed successfully! ---');
