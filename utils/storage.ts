
import { Dexie, type Table } from 'dexie';
import { neon } from '@neondatabase/serverless';
import { Customer, Product, Supplier, Equipment, ServiceOrder, Sale, OrderStatus, BusinessInfo, FinancialAccount } from '../types';

// The database class extends Dexie. Using named import for Dexie to ensure proper instance method inheritance in TypeScript.
export class ServiceProDatabase extends Dexie {
  customers!: Table<Customer>;
  products!: Table<Product>;
  suppliers!: Table<Supplier>;
  equipment!: Table<Equipment>;
  orders!: Table<ServiceOrder>;
  sales!: Table<Sale>;
  financialAccounts!: Table<FinancialAccount>;
  settings!: Table<{ key: string; value: any }>;

  constructor() {
    super('ServiceProDB');
    // Schema updated to version 8 to include zipCode
    this.version(8).stores({
      customers: 'id, name, phone, zipCode',
      products: 'id, name, category',
      suppliers: 'id, name',
      equipment: 'id, customerId, model',
      orders: 'id, orderNumber, customerId, status',
      sales: 'id, customerId, createdAt',
      financialAccounts: 'id, dueDate, status, type, relatedId',
      settings: 'key'
    });
  }
}

export const dbInstance = new ServiceProDatabase();

const DEFAULT_NEON_URL = 'postgresql://neondb_owner:npg_3dkHbBJNQ2Ah@ep-still-frog-ahizpvsg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';
const getNeonUrl = () => localStorage.getItem('neon_connection_string') || DEFAULT_NEON_URL;
const isCloudEnabled = () => {
  const mode = localStorage.getItem('db_mode');
  return mode === 'cloud';
};

const queryNeon = async (sql: string, params: any[] = []) => {
  const url = getNeonUrl();
  if (!url) return null;
  try {
    const sqlClient = neon(url);
    return await (sqlClient as any)(sql, params);
  } catch (err: any) {
    console.error("ERRO POSTGRESQL:", err.message);
    throw err;
  }
};

const ensureObject = (val: any) => {
  if (!val) return {};
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return {}; }
  }
  return val;
};

const ensureArray = (val: any) => {
  if (!val) return [];
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return Array.isArray(val) ? val : [];
};

const getSetting = async (key: string, defaultValue: any) => {
  if (isCloudEnabled()) {
    const rows = await queryNeon('SELECT value FROM settings WHERE key = $1', [key]);
    if (rows && rows.length > 0) {
        const val = rows[0].value;
        return typeof val === 'string' ? JSON.parse(val) : val;
    }
  }
  const s = await dbInstance.settings.get(key);
  return s ? s.value : defaultValue;
};

const saveSetting = async (key: string, value: any) => {
  await dbInstance.settings.put({ key, value });
  if (isCloudEnabled()) {
    await queryNeon('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, JSON.stringify(value)]);
  }
};

export const db = {
  initializeTables: async () => {
    if (isCloudEnabled()) {
      try {
        await queryNeon(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value JSONB)`);
        await queryNeon(`CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, email TEXT, document TEXT, zip_code TEXT, address TEXT)`);
        await queryNeon(`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, order_number INT, customer_id TEXT, equipment_id TEXT, status TEXT, problem_description TEXT, technical_report TEXT, accessories TEXT, checklist JSONB, occurrences JSONB, items JSONB, labor_cost DECIMAL(12,2), diagnosis_fee DECIMAL(12,2), total DECIMAL(12,2), warranty_days INT, created_at TEXT, updated_at TEXT, payment_status TEXT, history JSONB, photos JSONB, technician TEXT)`);
        return { success: true, msg: "Cloud Conectado!" };
      } catch (err: any) {
        return { success: false, msg: "Erro Cloud: " + err.message };
      }
    }
    return { success: true, msg: "Offline Mode." };
  },

  getCustomers: () => dbInstance.customers.toArray(),
  updateCustomer: async (c: Customer) => {
    await dbInstance.customers.put(c);
    if (isCloudEnabled()) await queryNeon(`INSERT INTO customers (id, name, phone, email, document, zip_code, address) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET name = $2, phone = $3, email = $4, document = $5, zip_code = $6, address = $7`, [c.id, c.name, c.phone, c.email, c.document, c.zipCode, c.address]);
  },
  saveCustomers: (list: Customer[]) => dbInstance.customers.bulkPut(list),

  getProducts: () => dbInstance.products.toArray(),
  updateProduct: async (p: Product) => {
    await dbInstance.products.put(p);
  },
  saveProducts: (list: Product[]) => dbInstance.products.bulkPut(list),

  getEquipment: () => dbInstance.equipment.toArray(),
  addEquipment: async (eq: Equipment) => {
    await dbInstance.equipment.put(eq);
  },
  saveEquipment: (list: Equipment[]) => dbInstance.equipment.bulkPut(list),

  getOrders: async (): Promise<ServiceOrder[]> => {
    if (isCloudEnabled()) {
      const rows = await queryNeon('SELECT * FROM orders ORDER BY order_number DESC');
      if (rows) {
        return rows.map(r => ({
          id: r.id,
          orderNumber: Number(r.order_number),
          customerId: r.customer_id,
          equipmentId: r.equipment_id,
          status: r.status,
          problemDescription: r.problem_description || '',
          technicalReport: r.technical_report || '',
          accessories: r.accessories || '',
          checklist: ensureObject(r.checklist),
          occurrences: ensureArray(r.occurrences),
          items: ensureArray(r.items),
          laborCost: Number(r.labor_cost || 0),
          diagnosisFee: Number(r.diagnosis_fee || 0),
          total: Number(r.total || 0),
          warrantyDays: Number(r.warranty_days || 90),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          paymentStatus: r.payment_status,
          history: ensureArray(r.history),
          photos: ensureArray(r.photos),
          technician: r.technician || ''
        })) as any;
      }
    }
    return dbInstance.orders.toArray();
  },
  updateOrder: async (o: ServiceOrder) => {
    await dbInstance.orders.put(o);
    if (isCloudEnabled()) {
      await queryNeon(`
        INSERT INTO orders (id, order_number, customer_id, equipment_id, status, problem_description, technical_report, accessories, checklist, occurrences, items, labor_cost, diagnosis_fee, total, warranty_days, created_at, updated_at, payment_status, history, photos, technician)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        ON CONFLICT (id) DO UPDATE SET 
          order_number=$2, customer_id=$3, equipment_id=$4, status=$5, problem_description=$6, technical_report=$7, 
          checklist=$9, occurrences=$10, items=$11, labor_cost=$12, diagnosis_fee=$13, total=$14, updated_at=$17, 
          history=$19, photos=$20, technician=$21
      `, [
        o.id, o.orderNumber, o.customerId, o.equipmentId, o.status, o.problemDescription, o.technicalReport, o.accessories, 
        JSON.stringify(o.checklist || {}), JSON.stringify(o.occurrences || []), JSON.stringify(o.items || []), 
        o.laborCost, o.diagnosisFee, o.total, o.warrantyDays, o.createdAt, o.updatedAt, o.paymentStatus, 
        JSON.stringify(o.history || []), JSON.stringify(o.photos || []), o.technician
      ]);
    }
  },
  deleteOrder: async (id: string) => {
    await dbInstance.orders.delete(id);
    if (isCloudEnabled()) {
      await queryNeon('DELETE FROM orders WHERE id = $1', [id]);
    }
  },

  getSales: () => dbInstance.sales.toArray(),
  addSale: async (s: Sale) => {
    await dbInstance.sales.put(s);
  },

  getFinancialAccounts: () => dbInstance.financialAccounts.toArray(),
  updateFinancialAccount: async (a: FinancialAccount) => {
    await dbInstance.financialAccounts.put(a);
  },
  deleteFinancialAccount: (id: string) => dbInstance.financialAccounts.delete(id),

  getBusinessInfo: () => getSetting('business_info', { name: '', cnpj: '', phone: '', address: '' }),
  saveBusinessInfo: (info: BusinessInfo) => saveSetting('business_info', info),
  getChecklist: () => getSetting('checklist', []),
  saveChecklist: (list: string[]) => saveSetting('checklist', list),
  getStatusMessages: () => getSetting('status_messages', {}),
  saveStatusMessages: (msgs: any) => saveSetting('status_messages', msgs),
  getTermsEntry: () => getSetting('terms_entry', ''),
  saveTermsEntry: (t: string) => saveSetting('terms_entry', t),
  getTermsBudget: () => getSetting('terms_budget', ''),
  saveTermsBudget: (t: string) => saveSetting('terms_budget', t),
  getTermsExit: () => getSetting('terms_exit', ''),
  saveTermsExit: (t: string) => saveSetting('terms_exit', t),
  getDefaultWarranty: () => getSetting('default_warranty', 90),
  saveDefaultWarranty: (d: number) => saveSetting('default_warranty', d),
  
  getSuppliers: () => dbInstance.suppliers.toArray(),
  updateSupplier: async (s: Supplier) => { await dbInstance.suppliers.put(s); },
  saveSuppliers: (list: Supplier[]) => dbInstance.suppliers.bulkPut(list),
};
