#!/usr/bin/env node
/**
 * Copies site/src + content/projects.json to dist/ for deployment.
 * Usage: node scripts/build.js (from repo root)
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const distPath = path.join(root, 'dist');
const siteSrc = path.join(root, 'site', 'src');
const contentPath = path.join(root, 'content', 'projects.json');

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function main() {
  if (!fs.existsSync(siteSrc)) {
    console.error('site/src not found');
    process.exit(1);
  }
  if (!fs.existsSync(contentPath)) {
    console.error('content/projects.json not found');
    process.exit(1);
  }
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true });
  }
  fs.mkdirSync(distPath, { recursive: true });
  copyRecursive(siteSrc, distPath);
  fs.mkdirSync(path.join(distPath, 'content'), { recursive: true });
  fs.copyFileSync(contentPath, path.join(distPath, 'content', 'projects.json'));
  const taxonomyDir = path.join(root, 'content', 'taxonomy');
  if (fs.existsSync(taxonomyDir)) {
    const destTaxonomy = path.join(distPath, 'content', 'taxonomy');
    fs.mkdirSync(destTaxonomy, { recursive: true });
    for (const name of fs.readdirSync(taxonomyDir)) {
      fs.copyFileSync(path.join(taxonomyDir, name), path.join(destTaxonomy, name));
    }
  }
  console.log('Build done: dist/');
}

main();
