const fs = require('fs');
const csv = fs.readFileSync('airlines.csv', 'utf8');
const lines = csv.trim().split('\n').slice(1); // skip header

const seen = new Set();
const duplicates = new Set();

for (const line of lines) {
  const [code] = line.split(',');
  if (seen.has(code)) {
    duplicates.add(code);
  } else {
    seen.add(code);
  }
}

console.log('Duplicate codes:', Array.from(duplicates));