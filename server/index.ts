import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq, ilike, desc, sql } from 'drizzle-orm';
import path from 'path';
import { fileURLToPath } from 'url';
import { eq, and, desc, sql, ilike } from 'drizzle-orm';
import { db } from './db/index.js';
import { 
  users, 
  vendors, 
  units, 
  products, 
  productUpcs,
  productVendors,
  purchaseLists, 
  purchaseListItems 
} from './db/schema.js';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-restaurant-pwa';
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

app.use(cors({
  origin: FRONTEND_URL === '*' ? '*' : [FRONTEND_URL, 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// Authentication Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// --- AUTHENTICATION ROUTES ---
app.post('/api/auth/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    
    const [newUser] = await db.insert(users).values({
      username,
      passwordHash,
    }).returning({
      id: users.id,
      username: users.username,
      role: users.role,
    });

    const token = jwt.sign({ id: newUser.id, username: newUser.username, role: newUser.role }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user: newUser });
  } catch (error: any) {
    if (error.code === '23505') { // PostgreSQL unique violation code
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Failed to register user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
  try {
    const [user] = await db.select({ id: users.id, username: users.username, role: users.role }).from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// --- ADMIN USERS CRUD ---
const adminOnly = (req: any, res: any, next: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

app.get('/api/users', authenticateToken, adminOnly, async (req, res) => {
  try {
    const list = await db.select({
      id: users.id,
      username: users.username,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users).orderBy(users.username);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', authenticateToken, adminOnly, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [newUser] = await db.insert(users).values({ username, passwordHash, role: role || 'standard' })
      .returning({ id: users.id, username: users.username, role: users.role });
    res.status(201).json(newUser);
  } catch (error: any) {
    if (error.code === '23505') return res.status(400).json({ error: 'Username already exists' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/users/:id', authenticateToken, adminOnly, async (req, res) => {
  const { username, password, role } = req.body;
  const { id } = req.params;
  try {
    let updateData: any = { username, role, updatedAt: new Date() };
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);

    const [updatedUser] = await db.update(users).set(updateData).where(eq(users.id, id))
      .returning({ id: users.id, username: users.username, role: users.role });
    if (!updatedUser) return res.status(404).json({ error: 'User not found' });
    res.json(updatedUser);
  } catch (error: any) {
    if (error.code === '23505') return res.status(400).json({ error: 'Username already exists' });
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/users/:id', authenticateToken, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const [deleted] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// --- VENDORS CRUD ---
app.get('/api/vendors', authenticateToken, async (req, res) => {
  try {
    const list = await db.select().from(vendors).orderBy(vendors.name);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

app.post('/api/vendors', authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const [newVendor] = await db.insert(vendors).values({
      name,
      description: description || '',
    }).returning();
    
    res.status(201).json(newVendor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

app.put('/api/vendors/:id', authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  const { id } = req.params;

  try {
    const [updatedVendor] = await db.update(vendors)
      .set({ 
        name, 
        description: description || '',
        updatedAt: new Date()
      })
      .where(eq(vendors.id, id))
      .returning();

    if (!updatedVendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(updatedVendor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

app.delete('/api/vendors/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [deletedVendor] = await db.delete(vendors).where(eq(vendors.id, id)).returning();
    if (!deletedVendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
});

// --- UNITS CRUD ---
app.get('/api/units', authenticateToken, async (req, res) => {
  try {
    const list = await db.select().from(units).orderBy(units.name);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch units' });
  }
});

app.post('/api/units', authenticateToken, async (req, res) => {
  const { name, abbreviation } = req.body;
  if (!name || !abbreviation) return res.status(400).json({ error: 'Name and abbreviation are required' });

  try {
    const [newUnit] = await db.insert(units).values({
      name,
      abbreviation,
    }).returning();

    res.status(201).json(newUnit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create unit' });
  }
});

app.put('/api/units/:id', authenticateToken, async (req, res) => {
  const { name, abbreviation } = req.body;
  const { id } = req.params;

  try {
    const [updatedUnit] = await db.update(units)
      .set({ 
        name, 
        abbreviation,
        updatedAt: new Date()
      })
      .where(eq(units.id, id))
      .returning();

    if (!updatedUnit) return res.status(404).json({ error: 'Unit not found' });
    res.json(updatedUnit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update unit' });
  }
});

app.delete('/api/units/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [deletedUnit] = await db.delete(units).where(eq(units.id, id)).returning();
    if (!deletedUnit) return res.status(404).json({ error: 'Unit not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete unit' });
  }
});

// --- PRODUCTS CRUD & UPC LOOKUP ---

app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const list = await db.select({
      id: products.id,
      name: products.name,
      description: products.description,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      upc: sql<string>`(SELECT string_agg("product_upcs"."upc", ',') FROM "product_upcs" WHERE "product_upcs"."product_id" = "products"."id")`,
      vendor_name: sql<string>`(SELECT string_agg("vendors"."name", ', ') FROM "product_vendors" JOIN "vendors" ON "product_vendors"."vendor_id" = "vendors"."id" WHERE "product_vendors"."product_id" = "products"."id")`
    }).from(products).orderBy(products.name);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Search products by name (case-insensitive partial match)
app.get('/api/products/search', authenticateToken, async (req, res) => {
  const q = (req.query.q as string || '').trim();
  if (!q || q.length < 1) return res.json([]);

  try {
    const results = await db.select({
      id: products.id,
      name: products.name,
      description: products.description,
      upc: sql<string>`(SELECT string_agg("product_upcs"."upc", ',') FROM "product_upcs" WHERE "product_upcs"."product_id" = "products"."id")`,
      vendor_name: sql<string>`(SELECT string_agg("vendors"."name", ', ') FROM "product_vendors" JOIN "vendors" ON "product_vendors"."vendor_id" = "vendors"."id" WHERE "product_vendors"."product_id" = "products"."id")`
    })
      .from(products)
      .where(ilike(products.name, `%${q}%`))
      .orderBy(products.name)
      .limit(20);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search products' });
  }
});

app.get('/api/products/upc/:upc', authenticateToken, async (req, res) => {
  const { upc } = req.params;
  try {
    const upcRecord = await db.select({ productId: productUpcs.productId }).from(productUpcs).where(eq(productUpcs.upc, upc)).limit(1);
    if (!upcRecord.length) return res.status(404).json({ error: 'Product not found' });

    const [product] = await db.select({
      id: products.id,
      name: products.name,
      description: products.description,
      upc: sql<string>`(SELECT string_agg("product_upcs"."upc", ',') FROM "product_upcs" WHERE "product_upcs"."product_id" = "products"."id")`,
      vendor_name: sql<string>`(SELECT string_agg("vendors"."name", ', ') FROM "product_vendors" JOIN "vendors" ON "product_vendors"."vendor_id" = "vendors"."id" WHERE "product_vendors"."product_id" = "products"."id")`
    }).from(products).where(eq(products.id, upcRecord[0].productId)).limit(1);

    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to query product by UPC' });
  }
});

app.post('/api/products', authenticateToken, async (req, res) => {
  const { name, description, upcs, vendorIds } = req.body;
  if (!name || !upcs || !upcs.length) return res.status(400).json({ error: 'Name and at least one UPC are required' });

  try {
    const [newProduct] = await db.insert(products).values({
      name,
      description: description || '',
    }).returning();

    for (const upc of upcs) {
      await db.insert(productUpcs).values({ productId: newProduct.id, upc });
    }
    if (vendorIds && vendorIds.length > 0) {
      for (const vendorId of vendorIds) {
        await db.insert(productVendors).values({ productId: newProduct.id, vendorId });
      }
    }

    res.status(201).json({ ...newProduct, upcs, vendorIds });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'A product with this UPC already exists' });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/products/:id', authenticateToken, async (req, res) => {
  const { name, description, upcs, vendorIds } = req.body;
  const { id } = req.params;

  try {
    const [updatedProduct] = await db.update(products)
      .set({ name, description: description || '', updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    if (!updatedProduct) return res.status(404).json({ error: 'Product not found' });

    if (upcs && upcs.length > 0) {
      await db.delete(productUpcs).where(eq(productUpcs.productId, id));
      for (const upc of upcs) {
        await db.insert(productUpcs).values({ productId: id, upc });
      }
    }
    if (vendorIds !== undefined) {
      await db.delete(productVendors).where(eq(productVendors.productId, id));
      for (const vendorId of vendorIds) {
        if (vendorId) await db.insert(productVendors).values({ productId: id, vendorId });
      }
    }

    res.json(updatedProduct);
  } catch (error: any) {
    if (error.code === '23505') return res.status(400).json({ error: 'A product with this UPC already exists' });
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Link / update a product's UPC (for "Link to Existing Product" flow)
app.patch('/api/products/:id/upc', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { upc } = req.body;
  if (!upc) return res.status(400).json({ error: 'UPC is required' });

  try {
    const [existing] = await db.select({ productId: productUpcs.productId })
      .from(productUpcs).where(eq(productUpcs.upc, upc)).limit(1);

    if (existing && existing.productId !== id) {
      return res.status(400).json({ error: 'This UPC is already assigned to another product' });
    }

    if (!existing) {
      await db.insert(productUpcs).values({ productId: id, upc });
    }

    const [full] = await db.select({
      id: products.id,
      name: products.name,
      description: products.description,
      upc: sql<string>`(SELECT string_agg("product_upcs"."upc", ',') FROM "product_upcs" WHERE "product_upcs"."product_id" = "products"."id")`,
      vendor_name: sql<string>`(SELECT string_agg("vendors"."name", ', ') FROM "product_vendors" JOIN "vendors" ON "product_vendors"."vendor_id" = "vendors"."id" WHERE "product_vendors"."product_id" = "products"."id")`
    }).from(products).where(eq(products.id, id)).limit(1);

    res.json(full);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update product UPC' });
  }
});

app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [deletedProduct] = await db.delete(products).where(eq(products.id, id)).returning();
    if (!deletedProduct) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// --- PURCHASE LISTS & ITEMS ---
app.get('/api/purchase-lists', authenticateToken, async (req, res) => {
  try {
    const lists = await db.select({
      id: purchaseLists.id,
      name: purchaseLists.name,
      status: purchaseLists.status,
      orderDate: purchaseLists.orderDate,
      orderNumber: purchaseLists.orderNumber,
      isArchived: purchaseLists.isArchived,
      createdAt: purchaseLists.createdAt,
      updatedAt: purchaseLists.updatedAt,
      itemCount: sql<number>`CAST((SELECT COUNT(*) FROM "purchase_list_items" WHERE "purchase_list_items"."purchase_list_id" = "purchase_lists"."id") AS INTEGER)`
    })
    .from(purchaseLists)
    .orderBy(desc(purchaseLists.createdAt));

    res.json(lists);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchase lists' });
  }
});

app.get('/api/purchase-lists/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [list] = await db.select().from(purchaseLists).where(eq(purchaseLists.id, id)).limit(1);
    if (!list) return res.status(404).json({ error: 'Purchase list not found' });

    const items = await db.select({
      id: purchaseListItems.id,
      purchaseListId: purchaseListItems.purchaseListId,
      productId: purchaseListItems.productId,
      quantity: purchaseListItems.quantity,
      unitId: purchaseListItems.unitId,
      createdAt: purchaseListItems.createdAt,
      createdAt: purchaseListItems.createdAt,
      updatedAt: purchaseListItems.updatedAt,
      product_name: products.name,
      product_upc: sql<string>`(SELECT string_agg("product_upcs"."upc", ',') FROM "product_upcs" WHERE "product_upcs"."product_id" = "products"."id")`,
      vendor_name: sql<string>`(SELECT string_agg("vendors"."name", ', ') FROM "product_vendors" JOIN "vendors" ON "product_vendors"."vendor_id" = "vendors"."id" WHERE "product_vendors"."product_id" = "products"."id")`,
      unit_name: units.name,
      unit_abbreviation: units.abbreviation,
    })
    .from(purchaseListItems)
    .innerJoin(products, eq(purchaseListItems.productId, products.id))
    .innerJoin(units, eq(purchaseListItems.unitId, units.id))
    .where(eq(purchaseListItems.purchaseListId, id));

    res.json({ ...list, items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchase list details' });
  }
});

app.post('/api/purchase-lists', authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const [newList] = await db.insert(purchaseLists).values({
      name,
      status: 'draft',
    }).returning();

    res.status(201).json(newList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create purchase list' });
  }
});

app.put('/api/purchase-lists/:id', authenticateToken, async (req, res) => {
  const { name, status, orderDate, orderNumber, isArchived } = req.body;
  const { id } = req.params;

  try {
    const [updatedList] = await db.update(purchaseLists)
      .set({ 
        name, 
        status,
        orderDate: orderDate ? new Date(orderDate) : undefined,
        orderNumber,
        isArchived: isArchived !== undefined ? (isArchived ? 'true' : 'false') : undefined,
        updatedAt: new Date()
      })
      .where(eq(purchaseLists.id, id))
      .returning();

    if (!updatedList) return res.status(404).json({ error: 'Purchase list not found' });
    res.json(updatedList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update purchase list' });
  }
});

app.delete('/api/purchase-lists/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [deletedList] = await db.delete(purchaseLists).where(eq(purchaseLists.id, id)).returning();
    if (!deletedList) return res.status(404).json({ error: 'Purchase list not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete purchase list' });
  }
});

// --- PURCHASE LIST ITEMS ---
app.post('/api/purchase-lists/:id/items', authenticateToken, async (req, res) => {
  const { id: purchaseListId } = req.params;
  const { productId, quantity, unitId } = req.body;

  if (!productId || quantity === undefined || !unitId) {
    return res.status(400).json({ error: 'Product, quantity, and unit are required' });
  }

  try {
    // Check if item already exists in this list, if so update quantity
    const [existing] = await db.select()
      .from(purchaseListItems)
      .where(
        and(
          eq(purchaseListItems.purchaseListId, purchaseListId),
          eq(purchaseListItems.productId, productId)
        )
      )
      .limit(1);

    if (existing) {
      const newQty = (Number(existing.quantity) + Number(quantity)).toString();
      const [updatedItem] = await db.update(purchaseListItems)
        .set({ 
          quantity: newQty,
          unitId, // update unit to the latest selection
          updatedAt: new Date()
        })
        .where(eq(purchaseListItems.id, existing.id))
        .returning();

      res.json({ ...updatedItem, _merged: true });
    } else {
      const [newItem] = await db.insert(purchaseListItems).values({
        purchaseListId,
        productId,
        quantity: quantity.toString(),
        unitId,
      }).returning();

      res.status(201).json(newItem);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to add item to purchase list' });
  }
});

app.put('/api/purchase-list-items/:itemId', authenticateToken, async (req, res) => {
  const { itemId } = req.params;
  const { quantity, unitId } = req.body;

  try {
    const [updatedItem] = await db.update(purchaseListItems)
      .set({ 
        quantity: quantity.toString(), 
        unitId,
        updatedAt: new Date()
      })
      .where(eq(purchaseListItems.id, itemId))
      .returning();

    if (!updatedItem) return res.status(404).json({ error: 'Item not found' });
    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

app.delete('/api/purchase-list-items/:itemId', authenticateToken, async (req, res) => {
  const { itemId } = req.params;
  try {
    const [deletedItem] = await db.delete(purchaseListItems).where(eq(purchaseListItems.id, itemId)).returning();
    if (!deletedItem) return res.status(404).json({ error: 'Item not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Serve frontend in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
