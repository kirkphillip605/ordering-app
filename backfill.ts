import { db } from './server/db';
import { products } from './server/db/schema';
import { isNull } from 'drizzle-orm';

async function run() {
  console.log('Backfilling product categories...');
  const result = await db.update(products).set({ category: 'Other' }).where(isNull(products.category));
  console.log('Done backfilling.', result);
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
