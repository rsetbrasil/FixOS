
import Dexie, { type Table } from 'dexie';
import { neon } from '@neondatabase/serverless';
import { Customer, Product, Supplier, Equipment, ServiceOrder, Sale, OrderStatus, BusinessInfo } from '../types';

export class ServiceProDatabase extends Dexie {
  customers!: Table<Customer>;
  products!: Table<Product>;
  suppliers!: Table<Supplier>;
  equipment!: Table<Equipment>;
  orders!: Table<ServiceOrder>;
  sales!: Table<Sale>;
  settings!: Table<{ key: string; value: any }>;

  constructor() {
    super('ServiceProDB');
    this.version(3).stores({
      customers: 'id, name, phone',
      products: 'id, name, category',
      suppliers: 'id, name',
      equipment: 'id, customerId, model',
      orders: 'id, orderNumber, customerId, status',
      sales: 'id, customerId, createdAt',
      settings: 'key'
    });
  }
}

let dbInstance: ServiceProDatabase;
try {
  dbInstance = new ServiceProDatabase();
} catch (e) {
  Dexie.delete('ServiceProDB');
  dbInstance = new ServiceProDatabase();
}

const DEFAULT_NEON_URL = 'postgresql://neondb_owner:npg_3dkHbBJNQ2Ah@ep-still-frog-ahizpvsg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const getNeonUrl = () => localStorage.getItem('neon_connection_string') || DEFAULT_NEON_URL;

const isCloudEnabled = () => {
  try {
    const mode = localStorage.getItem('db_mode');
    if (mode === null) {
      localStorage.setItem('db_mode', 'cloud');
      return true;
    }
    return mode === 'cloud';
  } catch { return true; }
};

const queryNeon = async (sql: string, params: any[] = []) => {
  const url = getNeonUrl();
  if (!url) throw new Error("Neon Connection String não configurada.");
  try {
    const sqlClient = neon(url);
    return await (sqlClient as any)(sql, params);
  } catch (err: any) {
    console.error("Erro na consulta Neon:", err);
    throw err;
  }
};

export const db = {
  testConnection: async () => {
    try {
      await queryNeon('SELECT 1');
      return { success: true, msg: "Conectado com sucesso ao Neon!" };
    } catch (err: any) {
      return { success: false, msg: err.message || "Erro ao conectar." };
    }
  },

  initializeTables: async () => {
    const commands = [
      `CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, email TEXT, document TEXT, address TEXT)`,
      `CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, sku TEXT, price DECIMAL(12,2), cost DECIMAL(12,2), stock INT, category TEXT)`,
      `CREATE TABLE IF NOT EXISTS equipment (id TEXT PRIMARY KEY, customer_id TEXT, type TEXT, brand TEXT, model TEXT, serial_number TEXT)`,
      `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value JSONB)`,
      `CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, customer_id TEXT, items JSONB, total DECIMAL(12,2), payment_method TEXT, created_at TEXT)`,
      `CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, order_number INT, customer_id TEXT, equipment_id TEXT, status TEXT, problem_description TEXT, technical_report TEXT, accessories TEXT, checklist JSONB, items JSONB, labor_cost DECIMAL(12,2), diagnosis_fee DECIMAL(12,2), total DECIMAL(12,2), warranty_days INT, warranty_expiry_date TEXT, created_at TEXT, updated_at TEXT, payment_status TEXT, history JSONB, payment_method TEXT)`,
      
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS history JSONB`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS diagnosis_fee DECIMAL(12,2)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT`,
      `ALTER TABLE equipment ADD COLUMN IF NOT EXISTS serial_number TEXT`
    ];
    
    try {
      for (const sql of commands) {
        await queryNeon(sql);
      }
      return { success: true, msg: "Banco sincronizado!" };
    } catch (err: any) {
      return { success: false, msg: "Erro: " + err.message };
    }
  },

  getCustomers: async (): Promise<Customer[]> => {
    if (isCloudEnabled()) {
      try {
        const rows = await queryNeon('SELECT * FROM customers ORDER BY name ASC');
        return rows as unknown as Customer[];
      } catch (e) { return dbInstance.customers.toArray(); }
    }
    return dbInstance.customers.toArray();
  },
  
  updateCustomer: async (customer: Customer) => {
    if (isCloudEnabled()) {
      try {
        await queryNeon(`INSERT INTO customers (id, name, phone, email, document, address) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET name = $2, phone = $3, email = $4, document = $5, address = $6`, [customer.id, customer.name, customer.phone, customer.email, customer.document, customer.address]);
      } catch (e) {}
    }
    return dbInstance.customers.put(customer);
  },
  
  getProducts: async (): Promise<Product[]> => {
    if (isCloudEnabled()) {
      try {
        const rows = await queryNeon('SELECT * FROM products ORDER BY name ASC');
        return rows.map(r => ({ ...r, price: Number(r.price), cost: Number(r.cost), stock: Number(r.stock) })) as unknown as Product[];
      } catch { return dbInstance.products.toArray(); }
    }
    return dbInstance.products.toArray();
  },

  updateProduct: async (product: Product) => {
    if (isCloudEnabled()) {
      try {
        await queryNeon(`INSERT INTO products (id, name, sku, price, cost, stock, category) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET name = $2, sku = $3, price = $4, cost = $5, stock = $6, category = $7`, [product.id, product.name, product.sku, product.price, product.cost, product.stock, product.category]);
      } catch (e) {}
    }
    return dbInstance.products.put(product);
  },

  getEquipment: async (): Promise<Equipment[]> => {
    if (isCloudEnabled()) {
      try {
        const rows = await queryNeon('SELECT * FROM equipment');
        return rows.map(r => ({ ...r, customerId: r.customer_id, serialNumber: r.serial_number })) as unknown as Equipment[];
      } catch { return dbInstance.equipment.toArray(); }
    }
    return dbInstance.equipment.toArray();
  },

  addEquipment: async (eq: Equipment) => {
    if (isCloudEnabled()) {
      try {
        await queryNeon(`INSERT INTO equipment (id, customer_id, type, brand, model, serial_number) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET customer_id = $2, type = $3, brand = $4, model = $5, serial_number = $6`, [eq.id, eq.customerId, eq.type, eq.brand, eq.model, eq.serialNumber]);
      } catch (e) {}
    }
    return dbInstance.equipment.put(eq);
  },

  getOrders: async (): Promise<ServiceOrder[]> => {
    if (isCloudEnabled()) {
      try {
        const rows = await queryNeon('SELECT * FROM orders ORDER BY order_number DESC');
        return rows.map(r => {
          let checklistParsed = {};
          let itemsParsed = [];
          let historyParsed = [];
          try {
            checklistParsed = typeof r.checklist === 'string' ? JSON.parse(r.checklist) : (r.checklist || {});
            itemsParsed = typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []);
            historyParsed = typeof r.history === 'string' ? JSON.parse(r.history) : (r.history || []);
          } catch (e) {}
          return {
            ...r,
            orderNumber: Number(r.order_number),
            customerId: r.customer_id,
            equipmentId: r.equipment_id,
            checklist: checklistParsed,
            items: itemsParsed.map((i: any) => ({ ...i, priceAtTime: Number(i.priceAtTime) })),
            laborCost: Number(r.labor_cost),
            diagnosisFee: Number(r.diagnosis_fee || 0),
            total: Number(r.total),
            warrantyDays: Number(r.warranty_days),
            paymentStatus: r.payment_status || 'Pendente',
            paymentMethod: r.payment_method,
            history: historyParsed,
            createdAt: r.created_at,
            updatedAt: r.updated_at
          };
        }) as unknown as ServiceOrder[];
      } catch (e) { return dbInstance.orders.toArray(); }
    }
    return dbInstance.orders.toArray();
  },

  updateOrder: async (order: ServiceOrder) => {
    if (isCloudEnabled()) {
      try {
        await queryNeon(`
          INSERT INTO orders (
            id, order_number, customer_id, equipment_id, status, problem_description, 
            technical_report, accessories, checklist, items, labor_cost, diagnosis_fee, total, 
            warranty_days, warranty_expiry_date, created_at, updated_at, payment_status, history, payment_method
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          ON CONFLICT (id) DO UPDATE SET
          status = $5, problem_description = $6, technical_report = $7, accessories = $8,
          checklist = $9, items = $10, labor_cost = $11, diagnosis_fee = $12, total = $13, updated_at = $17,
          warranty_expiry_date = $15, payment_status = $18, history = $19, payment_method = $20
        `, [
          order.id, order.orderNumber, order.customerId, order.equipmentId, order.status,
          order.problemDescription, order.technicalReport, order.accessories,
          JSON.stringify(order.checklist), JSON.stringify(order.items),
          order.laborCost, order.diagnosisFee, order.total, order.warrantyDays, order.warrantyExpiryDate,
          order.createdAt, order.updatedAt, order.paymentStatus, JSON.stringify(order.history || []),
          order.paymentMethod || null
        ]);
      } catch (e) { db.initializeTables().catch(() => {}); }
    }
    return dbInstance.orders.put(order);
  },
  
  getSales: async (): Promise<Sale[]> => {
    if (isCloudEnabled()) {
      try {
        const rows = await queryNeon('SELECT * FROM sales ORDER BY created_at DESC');
        return rows.map(r => ({
          ...r,
          customerId: r.customer_id,
          createdAt: r.created_at,
          paymentMethod: r.payment_method,
          items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
          total: Number(r.total)
        })) as unknown as Sale[];
      } catch { return dbInstance.sales.toArray(); }
    }
    return dbInstance.sales.toArray();
  },

  addSale: async (sale: Sale) => {
    if (isCloudEnabled()) {
      try {
        await queryNeon(`INSERT INTO sales (id, customer_id, items, total, payment_method, created_at) VALUES ($1, $2, $3, $4, $5, $6)`, [sale.id, sale.customerId, JSON.stringify(sale.items), sale.total, sale.paymentMethod, sale.createdAt]);
      } catch (e) {}
    }
    return dbInstance.sales.put(sale);
  },

  getBusinessInfo: () => getSetting('business_info', { name: 'FIXOS ASSISTÊNCIA', cnpj: '00.000.000/0001-00', phone: '(11) 99999-9999', address: 'Rua das Tecnologias, 101 - Centro' }),
  saveBusinessInfo: (info: BusinessInfo) => saveSetting('business_info', info),
  getChecklist: () => getSetting('checklist', ["Liga", "Tela Íntegra", "Câmeras", "Bateria", "WiFi/Rede", "Carregamento"]),
  saveChecklist: (data: string[]) => saveSetting('checklist', data),
  getTermsEntry: () => getSetting('terms_entry', `ANÁLISE EM 5 DIAS ÚTEIS.`),
  getTermsBudget: () => getSetting('terms_budget', `ORÇAMENTO VÁLIDO POR 7 DIAS.`),
  getTermsExit: () => getSetting('terms_exit', `GARANTIA DE 90 DIAS.`),
  saveTermsEntry: (data: string) => saveSetting('terms_entry', data),
  saveTermsBudget: (data: string) => saveSetting('terms_budget', data),
  saveTermsExit: (data: string) => saveSetting('terms_exit', data),
  getDefaultWarranty: () => getSetting('default_warranty', 90),
  saveDefaultWarranty: (days: number) => saveSetting('default_warranty', days),
  saveCustomers: (data: any) => dbInstance.customers.clear().then(() => dbInstance.customers.bulkAdd(data)),
  saveProducts: (data: any) => dbInstance.products.clear().then(() => dbInstance.products.bulkAdd(data)),
  saveEquipment: (data: any) => dbInstance.equipment.clear().then(() => dbInstance.equipment.bulkAdd(data)),
  syncLocalToCloud: async () => {} // Placeholder
};

async function getSetting(key: string, defaultValue: any) {
  if (isCloudEnabled()) {
    try {
      const rows = await queryNeon('SELECT value FROM settings WHERE key = $1', [key]);
      if (rows.length > 0) {
        const val = rows[0].value;
        return typeof val === 'string' ? JSON.parse(val) : (val !== null ? val : defaultValue);
      }
      return defaultValue;
    } catch { return defaultValue; }
  }
  const item = await dbInstance.settings.get(key);
  return item ? item.value : defaultValue;
}

async function saveSetting(key: string, value: any) {
  if (isCloudEnabled()) {
    try {
      await queryNeon('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, JSON.stringify(value)]);
    } catch (e) {}
  }
  await dbInstance.settings.put({ key, value });
}
