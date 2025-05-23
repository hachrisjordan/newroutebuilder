const { PrismaClient } = require('@prisma/client');
const { airlines } = require('../airlines_full.js');
const { airports } = require('../airports.js');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding airlines...');
  const seenCodes = new Set();
  for (const airline of airlines) {
    if (seenCodes.has(airline.value)) continue;
    seenCodes.add(airline.value);
    await prisma.airline.create({
      data: {
        code: airline.value,
        name: airline.label.split(' (')[0],
        label: airline.label,
      },
    });
  }

  console.log('Seeding airports...');
  for (const airport of airports) {
    await prisma.airport.create({
      data: {
        iata: airport.IATA,
        name: airport.Name,
        cityName: airport.CityName,
        country: airport.Country,
        countryCode: airport.CountryCode,
        latitude: airport.Latitude,
        longitude: airport.Longitude,
        zone: airport.Zone,
        tc: airport.TC,
        copazone: airport.copazone,
      },
    });
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 