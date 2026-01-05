#!/usr/bin/env node
/**
 * Converts JSON proposal data to CSV format for Supabase import
 * Usage: node scripts/convert-json-to-csv.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, '..', 'test.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'proposals-import.csv');

// CSV columns matching the proposals table schema
const CSV_COLUMNS = [
  'id',
  'organization_id',
  'organization_name',
  'created_by',
  'created_by_name',
  'proposal_number',
  'document_type',
  'is_main_version',
  'project_name',
  'client_name',
  'client_company',
  'job_location',
  'status',
  'total_value',
  'is_complete',
  'form_id',
  'form_data',
  'proposal_source',
  'created_at',
  'updated_at',
  'submitted_at',
  'won_at',
  'rejected_at',
  'completed_at',
  'archived',
  'archived_at',
  'is_on_board',
  'google_doc_id',
  'paid_at',
  'comments',
  'document_count',
];

// Default values for columns not in source data
const DEFAULT_VALUES = {
  completed_at: '',
  archived_at: '',
  google_doc_id: '',
  paid_at: '',
  comments: '',
  document_count: 0,
};

// Contact name to ID mapping
const CONTACT_NAME_ID_MAP = {
  'Stan Potash': '80cdbbe6-5991-4582-b341-96a2c5bd77f0',
  'Lillian': '45e72ba5-8842-4406-8ccb-2ba50e1e10aa',
  'Ed Machinski': 'ef012fbd-39c2-40f8-a497-b224da5cc64c',
};

/**
 * Transforms old lead times phase format to new format
 * Old: { id, name, duration: "2 weeks", order }
 * New: { id, phaseName, duration, durationUnit, estCompletionDate }
 */
function transformLeadTimesPhase(oldPhase) {
  const { id, name, duration: durationStr } = oldPhase;

  // Parse duration string like "2 weeks", "2-3 weeks", "1-2 days", "8-10 "
  let duration = '';
  let durationUnit = 'weeks';

  if (durationStr) {
    const match = durationStr.match(/^([\d-]+)\s*(\w*)$/);
    if (match) {
      duration = match[1];
      durationUnit = match[2] || 'weeks';
    }
  }

  return {
    id,
    phaseName: name || '',
    duration,
    durationUnit,
    estCompletionDate: '',
  };
}

/**
 * Transforms form_data.leadTimes to new format
 */
function transformLeadTimes(formData) {
  if (!formData?.leadTimes?.sections) return formData;

  const transformedSections = formData.leadTimes.sections.map(section => ({
    ...section,
    phases: section.phases?.map(transformLeadTimesPhase) || [],
  }));

  return {
    ...formData,
    leadTimes: {
      ...formData.leadTimes,
      sections: transformedSections,
    },
  };
}

/**
 * Adds contactNameId to form_data.info based on contactName
 */
function addContactNameId(formData) {
  if (!formData?.info?.contactName) return formData;

  const contactName = formData.info.contactName;
  const contactNameId = CONTACT_NAME_ID_MAP[contactName] || '';

  return {
    ...formData,
    info: {
      ...formData.info,
      contactNameId,
    },
  };
}

function escapeCSVField(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = typeof value === 'object'
    ? JSON.stringify(value)
    : String(value);

  // If the value contains commas, quotes, or newlines, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function convertToCSV(proposals) {
  const headerRow = CSV_COLUMNS.join(',');

  const dataRows = proposals.map(proposal => {
    // Transform form_data: leadTimes format + add contactNameId
    let transformedFormData = transformLeadTimes(proposal.form_data);
    transformedFormData = addContactNameId(transformedFormData);

    return CSV_COLUMNS.map(column => {
      // Use default value if column has one
      if (column in DEFAULT_VALUES) {
        return escapeCSVField(DEFAULT_VALUES[column]);
      }
      // Use transformed form_data
      if (column === 'form_data') {
        return escapeCSVField(transformedFormData);
      }
      return escapeCSVField(proposal[column]);
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

function main() {
  console.log('Reading JSON file:', INPUT_FILE);

  const jsonContent = fs.readFileSync(INPUT_FILE, 'utf-8');
  const proposals = JSON.parse(jsonContent);

  console.log(`Found ${proposals.length} proposals to convert`);

  const csvContent = convertToCSV(proposals);

  fs.writeFileSync(OUTPUT_FILE, csvContent, 'utf-8');

  console.log(`CSV file written to: ${OUTPUT_FILE}`);
  console.log(`Total rows: ${proposals.length + 1} (including header)`);
}

main();
