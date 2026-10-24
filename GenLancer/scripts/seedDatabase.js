// scripts/seedDatabase.js
import { seed } from '../server/scripts/seedDatabase.js';

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal seed failure:', err);
    process.exit(1);
  });
