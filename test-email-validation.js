// Quick test to debug email validation
const levenshtein = require('js-levenshtein');

const email = 'namer@gmail.com';
const [localPart, domain] = email.split('@');

console.log('Testing email:', email);
console.log('Local part:', localPart);
console.log('Domain:', domain);

// Basic format check
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
console.log('Passes basic regex:', emailRegex.test(email));

// Domain parts check
const domainParts = domain.split('.');
console.log('Domain parts:', domainParts);
console.log('Domain parts length:', domainParts.length);
console.log('Any empty parts:', domainParts.some(part => part.length === 0));

// Check for consecutive dots
console.log('Has consecutive dots:', email.includes('..'));

// Levenshtein check
const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
const lowerDomain = domain.toLowerCase();

commonDomains.forEach(d => {
  const distance = levenshtein(d, lowerDomain);
  console.log(`Distance from ${d}: ${distance}`);
});

const suggestedDomain = commonDomains.find(d => {
  const distance = levenshtein(d, lowerDomain);
  return distance > 0 && distance <= 2;
});

console.log('Suggested domain:', suggestedDomain);
console.log('Should be valid:', !suggestedDomain);