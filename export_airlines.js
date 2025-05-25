const fs = require('fs');
const airlines = require('./airlines_full.js');

const csv = [
  'code,name,label',
  ...airlines.map(a => {
    // Extract name from label (before the last ' (')
    const name = a.label.replace(/ \([A-Z0-9]+\)$/, '');
    return `${a.value},"${name}","${a.label.replace(/"/g, '""')}"`;
  })
].join('\n');

fs.writeFileSync('airlines.csv', csv);
console.log('Exported airlines.csv'); 