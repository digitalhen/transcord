db.dropDatabase();

const rates = [
  {rateCode: 'DEFAULT', availabilityExpDate: '12/31/2199', existingExpDate: '12/31/2199', description: 'Default rate code', costPerBlock: 10, blockLength: 60 },
  {rateCode: 'LOCALNEWS2018', availabilityExpDate: '12/31/2018', existingExpDate: '12/31/2199', description: 'Local news half-price', costPerBlock: 5, blockLength: 60 },
];

db.rates.insert(rates);
db.rates.find();