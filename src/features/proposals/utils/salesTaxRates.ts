/**
 * Sales Tax Rates Utility
 *
 * US state and city sales tax rates.
 * State rates are base rates; city rates include combined state + local taxes.
 */

export interface TaxRateInfo {
  rate: number; // Decimal (e.g., 0.0625 = 6.25%)
  label: string;
  isCity?: boolean; // True for city entries
  stateCode?: string; // Parent state for cities
}

// US States with sales tax (0% states omitted from dropdown but included for reference)
export const US_STATE_TAX_RATES: Record<string, TaxRateInfo> = {
  AL: { rate: 0.04, label: 'Alabama' },
  AK: { rate: 0, label: 'Alaska' },
  AZ: { rate: 0.056, label: 'Arizona' },
  AR: { rate: 0.065, label: 'Arkansas' },
  CA: { rate: 0.0725, label: 'California' },
  CO: { rate: 0.029, label: 'Colorado' },
  CT: { rate: 0.0635, label: 'Connecticut' },
  DE: { rate: 0, label: 'Delaware' },
  DC: { rate: 0.06, label: 'District of Columbia' },
  FL: { rate: 0.06, label: 'Florida' },
  GA: { rate: 0.04, label: 'Georgia' },
  HI: { rate: 0.04, label: 'Hawaii' },
  ID: { rate: 0.06, label: 'Idaho' },
  IL: { rate: 0.0625, label: 'Illinois' },
  IN: { rate: 0.07, label: 'Indiana' },
  IA: { rate: 0.06, label: 'Iowa' },
  KS: { rate: 0.065, label: 'Kansas' },
  KY: { rate: 0.06, label: 'Kentucky' },
  LA: { rate: 0.0445, label: 'Louisiana' },
  ME: { rate: 0.055, label: 'Maine' },
  MD: { rate: 0.06, label: 'Maryland' },
  MA: { rate: 0.0625, label: 'Massachusetts' },
  MI: { rate: 0.06, label: 'Michigan' },
  MN: { rate: 0.06875, label: 'Minnesota' },
  MS: { rate: 0.07, label: 'Mississippi' },
  MO: { rate: 0.04225, label: 'Missouri' },
  MT: { rate: 0, label: 'Montana' },
  NE: { rate: 0.055, label: 'Nebraska' },
  NV: { rate: 0.0685, label: 'Nevada' },
  NH: { rate: 0, label: 'New Hampshire' },
  NJ: { rate: 0.06625, label: 'New Jersey' },
  NM: { rate: 0.05125, label: 'New Mexico' },
  NY: { rate: 0.04, label: 'New York' },
  NC: { rate: 0.0475, label: 'North Carolina' },
  ND: { rate: 0.05, label: 'North Dakota' },
  OH: { rate: 0.0575, label: 'Ohio' },
  OK: { rate: 0.045, label: 'Oklahoma' },
  OR: { rate: 0, label: 'Oregon' },
  PA: { rate: 0.06, label: 'Pennsylvania' },
  RI: { rate: 0.07, label: 'Rhode Island' },
  SC: { rate: 0.06, label: 'South Carolina' },
  SD: { rate: 0.045, label: 'South Dakota' },
  TN: { rate: 0.07, label: 'Tennessee' },
  TX: { rate: 0.0625, label: 'Texas' },
  UT: { rate: 0.0485, label: 'Utah' },
  VT: { rate: 0.06, label: 'Vermont' },
  VA: { rate: 0.053, label: 'Virginia' },
  WA: { rate: 0.065, label: 'Washington' },
  WV: { rate: 0.06, label: 'West Virginia' },
  WI: { rate: 0.05, label: 'Wisconsin' },
  WY: { rate: 0.04, label: 'Wyoming' },
};

// Major US cities with combined state + local tax rates
// These rates include state, county, and city taxes
export const US_CITY_TAX_RATES: Record<string, TaxRateInfo> = {
  // New York
  'NYC-NY': { rate: 0.08875, label: 'New York City', isCity: true, stateCode: 'NY' },
  'YON-NY': { rate: 0.08375, label: 'Yonkers', isCity: true, stateCode: 'NY' },

  // California
  'LA-CA': { rate: 0.095, label: 'Los Angeles', isCity: true, stateCode: 'CA' },
  'SF-CA': { rate: 0.08625, label: 'San Francisco', isCity: true, stateCode: 'CA' },
  'SD-CA': { rate: 0.0775, label: 'San Diego', isCity: true, stateCode: 'CA' },
  'OAK-CA': { rate: 0.1025, label: 'Oakland', isCity: true, stateCode: 'CA' },

  // Illinois
  'CHI-IL': { rate: 0.1025, label: 'Chicago', isCity: true, stateCode: 'IL' },

  // Texas
  'HOU-TX': { rate: 0.0825, label: 'Houston', isCity: true, stateCode: 'TX' },
  'DAL-TX': { rate: 0.0825, label: 'Dallas', isCity: true, stateCode: 'TX' },
  'SA-TX': { rate: 0.0825, label: 'San Antonio', isCity: true, stateCode: 'TX' },
  'AUS-TX': { rate: 0.0825, label: 'Austin', isCity: true, stateCode: 'TX' },

  // Washington
  'SEA-WA': { rate: 0.1025, label: 'Seattle', isCity: true, stateCode: 'WA' },
  'TAC-WA': { rate: 0.102, label: 'Tacoma', isCity: true, stateCode: 'WA' },

  // Pennsylvania
  'PHL-PA': { rate: 0.08, label: 'Philadelphia', isCity: true, stateCode: 'PA' },
  'PIT-PA': { rate: 0.07, label: 'Pittsburgh', isCity: true, stateCode: 'PA' },

  // Colorado
  'DEN-CO': { rate: 0.0881, label: 'Denver', isCity: true, stateCode: 'CO' },

  // Arizona
  'PHX-AZ': { rate: 0.086, label: 'Phoenix', isCity: true, stateCode: 'AZ' },
  'TUC-AZ': { rate: 0.086, label: 'Tucson', isCity: true, stateCode: 'AZ' },

  // Georgia
  'ATL-GA': { rate: 0.089, label: 'Atlanta', isCity: true, stateCode: 'GA' },

  // Tennessee
  'NSH-TN': { rate: 0.0925, label: 'Nashville', isCity: true, stateCode: 'TN' },
  'MEM-TN': { rate: 0.0975, label: 'Memphis', isCity: true, stateCode: 'TN' },

  // Louisiana
  'NO-LA': { rate: 0.0945, label: 'New Orleans', isCity: true, stateCode: 'LA' },
  'BR-LA': { rate: 0.0995, label: 'Baton Rouge', isCity: true, stateCode: 'LA' },

  // Alabama
  'BHM-AL': { rate: 0.10, label: 'Birmingham', isCity: true, stateCode: 'AL' },

  // Nevada
  'LV-NV': { rate: 0.08375, label: 'Las Vegas', isCity: true, stateCode: 'NV' },

  // Missouri
  'KC-MO': { rate: 0.091, label: 'Kansas City', isCity: true, stateCode: 'MO' },
  'STL-MO': { rate: 0.09679, label: 'St. Louis', isCity: true, stateCode: 'MO' },

  // Florida
  'MIA-FL': { rate: 0.07, label: 'Miami', isCity: true, stateCode: 'FL' },
  'ORL-FL': { rate: 0.065, label: 'Orlando', isCity: true, stateCode: 'FL' },
  'TPA-FL': { rate: 0.075, label: 'Tampa', isCity: true, stateCode: 'FL' },

  // Ohio
  'CLE-OH': { rate: 0.08, label: 'Cleveland', isCity: true, stateCode: 'OH' },
  'COL-OH': { rate: 0.075, label: 'Columbus', isCity: true, stateCode: 'OH' },

  // Minnesota
  'MPS-MN': { rate: 0.08025, label: 'Minneapolis', isCity: true, stateCode: 'MN' },
};

// Get tax rate for a US state or city (returns percentage, e.g., 6.25)
export const getTaxRate = (code: string): number => {
  const upperCode = code.toUpperCase();
  // Check cities first (they have more specific rates)
  const cityInfo = US_CITY_TAX_RATES[upperCode];
  if (cityInfo) return cityInfo.rate * 100;
  // Fall back to state
  const stateInfo = US_STATE_TAX_RATES[upperCode];
  return stateInfo ? stateInfo.rate * 100 : 0;
};

// Alias for backwards compatibility
export const getStateTaxRate = getTaxRate;

// Format rate with up to 3 decimal places, removing trailing zeros
export const formatTaxRate = (percent: number): string => {
  // Remove trailing zeros but keep up to 3 decimal precision
  return percent % 1 === 0 ? percent.toString() : parseFloat(percent.toFixed(3)).toString();
};

export interface TaxOption {
  value: string;
  label: string;
  rate: number;
  isCity?: boolean;
  stateCode?: string;
}

// Get all tax options (states + cities) grouped for dropdown
export const getTaxOptions = (): TaxOption[] => {
  const options: TaxOption[] = [];

  // Add states
  Object.entries(US_STATE_TAX_RATES).forEach(([code, info]) => {
    options.push({
      value: code,
      label: `${info.label} (${formatTaxRate(info.rate * 100)}%)`,
      rate: info.rate * 100,
      isCity: false,
    });
  });

  // Add cities with state suffix for clarity
  Object.entries(US_CITY_TAX_RATES).forEach(([code, info]) => {
    options.push({
      value: code,
      label: `${info.label}, ${info.stateCode} (${formatTaxRate(info.rate * 100)}%)`,
      rate: info.rate * 100,
      isCity: true,
      stateCode: info.stateCode,
    });
  });

  // Sort: States first alphabetically, then cities alphabetically
  return options.sort((a, b) => {
    // States come before cities
    if (a.isCity !== b.isCity) return a.isCity ? 1 : -1;
    // Within each group, sort alphabetically
    return a.label.localeCompare(b.label);
  });
};

// Alias for backwards compatibility
export const getStateOptions = getTaxOptions;

// States with no sales tax
export const NO_TAX_STATES = ['AK', 'DE', 'MT', 'NH', 'OR'];
