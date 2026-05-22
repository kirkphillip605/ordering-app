import { pgTable, text, timestamp, uuid, numeric, pgEnum, boolean } from 'drizzle-orm/pg-core';

// We define PostgreSQL schemas. For the SQLite fallback, we will map these dynamically or use compatible queries.
export const listStatusEnum = pgEnum('list_status', ['draft', 'ordered']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('standard').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const vendors = pgTable('vendors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const units = pgTable('units', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  abbreviation: text('abbreviation').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').default(''),
  brand: text('brand'),
  category: text('category').default('Other').notNull(),
  isFrequentlyOrdered: boolean('is_frequently_ordered').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const productVariants = pgTable('product_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
});

export const productUpcs = pgTable('product_upcs', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
  upc: text('upc').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const productVendors = pgTable('product_vendors', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  vendorId: uuid('vendor_id').references(() => vendors.id, { onDelete: 'cascade' }).notNull(),
});

export const purchaseLists = pgTable('purchase_lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  status: text('status').default('draft').notNull(), // 'draft' or 'ordered'
  orderDate: timestamp('order_date'),
  orderNumber: text('order_number'),
  isArchived: text('is_archived').default('false').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const purchaseListItems = pgTable('purchase_list_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  purchaseListId: uuid('purchase_list_id').references(() => purchaseLists.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  quantity: numeric('quantity').notNull(),
  unitId: uuid('unit_id').references(() => units.id, { onDelete: 'restrict' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
