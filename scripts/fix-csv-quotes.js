#!/usr/bin/env node
/**
 * Fix CSV Quote Escaping
 *
 * The problem: JSON field values ending with a single " instead of ""
 * Example: "clientCompany"":""Wesbuilt",""  should be  "clientCompany"":""Wesbuilt"",""
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = path.join(__dirname, '..', 'proposals-import.csv');
const outputFile = path.join(__dirname, '..', 'proposals-import-fixed.csv');

// Read the file as a single string
let content = fs.readFileSync(inputFile, 'utf8');

// Fix pattern 1: A word/value ending with single " followed by ,""
// This catches: Wesbuilt","" which should be Wesbuilt"",""
// Pattern: letter/digit/space followed by "," then "" (start of next key)
content = content.replace(/([a-zA-Z0-9\s\.\)\]\-])",""(?=[a-zA-Z])/g, '$1"",""');

// Fix pattern 2: Values ending with \" (escaped quote in JSON) followed by ,""
// Like: 4\"","" should stay as is (already correct)
// But: 4"","" where it's actually 4\" in the original might be wrong

// Fix pattern 3: Handle the panelThickness field which has escaped quotes like 4\"
// In CSV this becomes 4\"" but might be malformed as 4\""
// The pattern 4\" in JSON becomes 4\"" in CSV (the backslash-quote plus CSV quote escape)
content = content.replace(/\\",""(?=[a-zA-Z])/g, '\\"",""');

// Fix pattern 4: Single quote before }}" pattern
// Like: value"}}" should be value""}}"
content = content.replace(/([a-zA-Z0-9\s])"\}\}/g, '$1""\}\}');

// Fix pattern 5: Empty clientName in JSON
// Original malformed: ""clientName"":""",""clientCompany"" (3 quotes = invalid)
// Should be: ""clientName"":"""",""clientCompany"" (4 quotes = empty string)
// In JSON this becomes: "clientName":"","clientCompany"
content = content.replace(/""clientName"":""",""clientCompany/g, '""clientName"":"""",""clientCompany');

// Process line by line to fix unquoted fields with commas
const lines = content.split('\n');
const fixedLines = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  if (i === 0) {
    // Header line - keep as is
    fixedLines.push(line);
    continue;
  }

  if (!line.trim()) {
    fixedLines.push(line);
    continue;
  }

  // Fix specific pattern: ,true,Consolidated, ,Consolidated ,"
  // This should be: ,true,"Consolidated"," ","Consolidated ","
  // The issue is project_name, client_name, client_company fields have unquoted commas
  line = line.replace(
    /,true,Consolidated, ,Consolidated ,"/g,
    ',true,"Consolidated"," ","Consolidated","'
  );

  fixedLines.push(line);
}

content = fixedLines.join('\n');

// Write the fixed content
fs.writeFileSync(outputFile, content, 'utf8');

console.log('Fixed CSV written to:', outputFile);

// Validate by checking field counts
const validationLines = content.split('\n');
const headerFieldCount = validationLines[0].split(',').length;
console.log(`Header has ${headerFieldCount} fields`);

let issueCount = 0;
for (let i = 1; i < validationLines.length; i++) {
  const line = validationLines[i];
  if (!line.trim()) continue;

  // Simple field count (won't be accurate for complex CSV but gives indication)
  // Count commas outside of quotes
  let fieldCount = 1;
  let inQuotes = false;
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      if (line[j + 1] === '"') {
        j++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fieldCount++;
    }
  }

  if (fieldCount !== headerFieldCount) {
    console.log(`Row ${i}: has ${fieldCount} fields (expected ${headerFieldCount})`);
    issueCount++;
  }
}

console.log(`\nTotal rows with field count issues: ${issueCount}`);
