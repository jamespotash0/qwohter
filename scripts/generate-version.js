/**
 * Generate version.json for deployment version tracking
 * Run during build to create a unique version identifier
 * Format: v1.0.{buildNumber} where buildNumber is simple incrementing number
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const outputPath = join(process.cwd(), 'public', 'version.json');

// Try to read existing version to increment build number
let buildNumber = 1;
if (existsSync(outputPath)) {
  try {
    const existing = JSON.parse(readFileSync(outputPath, 'utf-8'));
    // Extract build number from v1.0.X format
    const match = existing.version?.match(/v1\.0\.(\d+)/);
    if (match) {
      buildNumber = parseInt(match[1]) + 1;
    }
  } catch (e) {
    console.warn('Could not read existing version, starting from 1');
  }
}

const buildTime = new Date().toISOString();
const version = `v1.0.${buildNumber}`;

const versionInfo = {
  version,
  buildTime,
};

// Write to public directory so it's served as static file
writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));

console.log('✅ Generated version.json:', versionInfo);
