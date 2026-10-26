import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Locate the workspace root directory containing artifacts/padel-tracker
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
console.log('Current Working Directory:', process.cwd());

// 2. Ensure root dependencies are installed if running from a subdirectory
const trackerModules = path.join(rootDir, 'artifacts/padel-tracker/node_modules');
const rootModules = path.join(rootDir, 'node_modules');
if (!fs.existsSync(trackerModules) && !fs.existsSync(rootModules)) {
  console.log('--- 1a. Installing workspace dependencies at root ---');
  try {
    execSync('bun install', { cwd: rootDir, stdio: 'inherit' });
  } catch {
    try {
      execSync('npm install', { cwd: rootDir, stdio: 'inherit' });
    } catch (e) {
      console.warn('Install warning:', e.message);
    }
  }
}

// 3. Build Vite frontend
console.log('--- 2. Building Vite app ---');
let buildSuccess = false;
try {
  console.log('Building via bun workspace...');
  execSync('bun run --filter @workspace/padel-tracker build', { cwd: rootDir, stdio: 'inherit' });
  buildSuccess = true;
} catch (bunErr) {
  console.log('Bun build failed or unavailable, trying npm workspace...');
  try {
    execSync('npm run build --workspace=@workspace/padel-tracker', { cwd: rootDir, stdio: 'inherit' });
    buildSuccess = true;
  } catch (npmErr) {
    console.log('Npm workspace build failed, trying direct vite build...');
    const trackerDir = path.resolve(rootDir, 'artifacts/padel-tracker');
    execSync('npx vite build --config vite.config.ts', { cwd: trackerDir, stdio: 'inherit' });
    buildSuccess = true;
  }
}

// 4. Verify build output
const srcDir = path.resolve(rootDir, 'artifacts/padel-tracker/dist/public');
console.log('--- 3. Checking build output in:', srcDir);

if (!fs.existsSync(srcDir)) {
  console.error('Build directory not found:', srcDir);
  process.exit(1);
}

// 5. Copy built assets to all candidate output directories
const destinations = [
  path.resolve(rootDir, 'public'),
  path.resolve(rootDir, 'dist'),
  path.resolve(rootDir, 'artifacts/padel-tracker/public'),
  path.resolve(rootDir, 'artifacts/padel-tracker/dist'),
  path.resolve(rootDir, 'scripts/public'),
  path.resolve(rootDir, 'scripts/dist'),
  path.resolve(process.cwd(), 'public'),
  path.resolve(process.cwd(), 'dist')
];

for (const dest of new Set(destinations)) {
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(srcDir, dest, { recursive: true });
  console.log(`✓ Copied files to ${dest}`);
}

console.log('--- 4. Build & copy completed successfully! ---');
