
import Dexie, { type Table } from 'dexie';
import { neon } from '@neondatabase/serverless';
import { Customer, Product, Supplier, Equipment, ServiceOrder, Sale, OrderStatus, BusinessInfo, FinancialAccount } from '../types';

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
    (this as any).version(5).stores({
      customers: 'id, name, phone',
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
  const mode = localStorage.getItem('db_mode');
  if (mode === null) return true;
  return mode === 'cloud';
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

const ensureObject = (val: any) => {
  if (val === null || val === undefined) return {};
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return val; }
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

export const db = {
  initializeTables: async () => {
    const commands = [
      `CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, email TEXT, document TEXT, address TEXT)`,
      `CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, sku TEXT, price DECIMAL(12,2), cost DECIMAL(12,2), stock INT, category TEXT)`,
      `CREATE TABLE IF NOT EXISTS equipment (id TEXT PRIMARY KEY, customer_id TEXT, type TEXT, brand TEXT, model TEXT, serial_number TEXT)`,
      `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value JSONB)`,
      `CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, customer_id TEXT, items JSONB, total DECIMAL(12,2), total_cost DECIMAL(12,2), payment_method TEXT, created_at TEXT)`,
      `CREATE TABLE IF NOT EXISTS financial_accounts (id TEXT PRIMARY KEY, description TEXT, amount DECIMAL(12,2), due_date TEXT, type TEXT, status TEXT, category TEXT, created_at TEXT, related_id TEXT)`,
      `CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, order_number INT, customer_id TEXT, equipment_id TEXT, status TEXT, problem_description TEXT, technical_report TEXT, accessories TEXT, checklist JSONB, checklist_observations TEXT, occurrences JSONB, items JSONB, labor_cost DECIMAL(12,2), labor_cost_base DECIMAL(12,2), diagnosis_fee DECIMAL(12,2), total DECIMAL(12,2), total_cost DECIMAL(12,2), warranty_days INT, warranty_expiry_date TEXT, created_at TEXT, updated_at TEXT, payment_status TEXT, history JSONB, payment_method TEXT)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_cost DECIMAL(12,2)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS labor_cost_base DECIMAL(12,2)`,
      `ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_cost DECIMAL(12,2)`,
      `ALTER TABLE financial_accounts ADD COLUMN IF NOT EXISTS related_id TEXT`
    ];
    
    if (isCloudEnabled()) {
      try {
        for (const sql of commands) { await queryNeon(sql); }
        return { success: true, msg: "Banco Cloud sincronizado!" };
      } catch (err: any) {
        return { success: false, msg: "Erro Cloud: " + err.message };
      }
    }
    return { success: true, msg: "Usando banco Local." };
  },

  getCustomers: async (): Promise<Customer[]> => {
    if (isCloudEnabled()) {
      try {
        const rows = await queryNeon('SELECT * FROM customers ORDER BY name ASC');
        return rows as unknown as Customer[];
      } catch { return dbInstance.customers.toArray(); }
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

  getOrders: async (): Promise<ServiceOrder[]> => {
    if (isCloudEnabled()) {
      try {
        const rows = await queryNeon('SELECT * FROM orders ORDER BY order_number DESC');
        return rows.map(r => ({
          ...r,
          orderNumber: Number(r.order_number),
          customerId: r.customer_id,
          equipmentId: r.equipment_id,
          checklist: ensureObject(r.checklist),
          occurrences: ensureArray(r.occurrences),
          items: ensureArray(r.items).map((i: any) => ({ ...i, priceAtTime: Number(i.priceAtTime), costAtTime: Number(i.costAtTime || 0) })),
          laborCost: Number(r.labor_cost),
          laborCostBase: Number(r.labor_cost_base || 0),
          diagnosisFee: Number(r.diagnosis_fee || 0),
          total: Number(r.total),
          totalCost: Number(r.total_cost || 0),
          history: ensureArray(r.history),
          createdAt: r.created_at,
          updatedAt: r.updated_at
        })) as unknown as ServiceOrder[];
      } catch { return dbInstance.orders.toArray(); }
    }
    return dbInstance.orders.toArray();
  },

  updateOrder: async (order: ServiceOrder) => {
    if (isCloudEnabled()) {
      try {
        await queryNeon(`
          INSERT INTO orders (id, order_number, customer_id, equipment_id, status, problem_description, technical_report, accessories, checklist, checklist_observations, occurrences, items, labor_cost, labor_cost_base, diagnosis_fee, total, total_cost, warranty_days, created_at, updated_at, payment_status, history, payment_method)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
          ON CONFLICT (id) DO UPDATE SET status = $5, problem_description = $6, technical_report = $7, accessories = $8, checklist = $9, checklist_observations = $10, occurrences = $11, items = $12, labor_cost = $13, labor_cost_base = $14, diagnosis_fee = $15, total = $16, total_cost = $17, updated_at = $20, payment_status = $21, history = $22, payment_method = $23
        `, [order.id, order.orderNumber, order.customerId, order.equipmentId, order.status, order.problemDescription, order.technicalReport, order.accessories, JSON.stringify(order.checklist), order.checklistObservations, JSON.stringify(order.occurrences), JSON.stringify(order.items), order.laborCost, order.laborCostBase || 0, order.diagnosisFee, order.total, order.totalCost || 0, order.warrantyDays, order.createdAt, order.updatedAt, order.paymentStatus, JSON.stringify(order.history), order.paymentMethod]);

        // Automação: Se for ENTREGUE, cria registro no financeiro se não existir
        if (order.status === OrderStatus.DELIVERED) {
          const accs = await queryNeon('SELECT id FROM financial_accounts WHERE related_id = $1', [order.id]);
          if (accs.length === 0) {
            const accId = 'FIN_' + order.id;
            await queryNeon(`
              INSERT INTO financial_accounts (id, description, amount, due_date, type, status, category, created_at, related_id)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [accId, `RECEITA O.S. #${order.orderNumber}`, order.total, new Date().toISOString().split('T')[0], 'RECEBER', 'PAGO', 'Ordens de Serviço', new Date().toISOString(), order.id]);
          }
        }
      } catch (e) { console.error("Erro updateOrder cloud:", e); }
    }
    return dbInstance.orders.put(order);
  },

  getFinancialAccounts: async (): Promise<FinancialAccount[]> => {
    if (isCloudEnabled()) {
      try {
        const rows = await queryNeon('SELECT * FROM financial_accounts ORDER BY due_date ASC');
        return rows.map(r => ({ ...r, amount: Number(r.amount), relatedId: r.related_id })) as unknown as FinancialAccount[];
      } catch { return []; }
    }
    return dbInstance.financialAccounts.toArray();
  },

  updateFinancialAccount: async (acc: FinancialAccount) => {
    if (isCloudEnabled()) {
      try {
        await queryNeon(`
          INSERT INTO financial_accounts (id, description, amount, due_date, type, status, category, created_at, related_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET description = $2, amount = $3, due_date = $4, type = $5, status = $6, category = $7
        `, [acc.id, acc.description, acc.amount, acc.dueDate, acc.type, acc.status, acc.category, acc.createdAt, acc.relatedId]);
      } catch (e) {}
    }
    return dbInstance.financialAccounts.put(acc);
  },

  getSales: async () => {
    if (isCloudEnabled()) {
      try {
        const rows = await queryNeon('SELECT * FROM sales ORDER BY created_at DESC');
        return rows.map(r => ({ ...r, items: ensureArray(r.items), total: Number(r.total), totalCost: Number(r.total_cost || 0) })) as unknown as Sale[];
      } catch { return dbInstance.sales.toArray(); }
    }
    return dbInstance.sales.toArray();
  },

  addSale: async (sale: Sale) => {
    if (isCloudEnabled()) {
      try {
        await queryNeon(`INSERT INTO sales (id, customer_id, items, total, total_cost, payment_method, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [sale.id, sale.customerId, JSON.stringify(sale.items), sale.total, sale.totalCost || 0, sale.paymentMethod, sale.createdAt]);
        // Automação: Gera registro financeiro imediato para venda direta
        const accId = 'FIN_' + sale.id;
        await queryNeon(`
          INSERT INTO financial_accounts (id, description, amount, due_date, type, status, category, created_at, related_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [accId, `VENDA DIRETA #${sale.id.slice(-4).toUpperCase()}`, sale.total, sale.createdAt.split('T')[0], 'RECEBER', 'PAGO', 'Vendas Diretas', sale.createdAt, sale.id]);
      } catch (e) {}
    }
    return dbInstance.sales.put(sale);
  },

  getBusinessInfo: () => getSetting('business_info', { name: 'FIXOS ASSISTÊNCIA', cnpj: '00.000.000/0001-00', phone: '(11) 99999-8493', address: 'Rua das Tecnologias, 101 - Centro' }),
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
  syncLocalToCloud: async () => {},
  deleteFinancialAccount: async (id: string) => {
    if (isCloudEnabled()) {
      try { await queryNeon('DELETE FROM financial_accounts WHERE id = $1', [id]); } catch (e) {}
    }
    return dbInstance.financialAccounts.delete(id);
  },
  getEquipment: async (): Promise<Equipment[]> => {
    if (isCloudEnabled()) {
      try {
        const rows = await queryNeon('SELECT * FROM equipment');
        return rows as unknown as Equipment[];
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
  }
};

async function getSetting(key: string, defaultValue: any) {
  if (isCloudEnabled()) {
    try {
      const rows = await queryNeon('SELECT value FROM settings WHERE key = $1', [key]);
      if (rows.length > 0) return ensureObject(rows[0].value);
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
