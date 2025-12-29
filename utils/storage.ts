
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
    (this as any).version(6).stores({
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
  if (val === null || val === undefined) return {};
  if (typeof val === 'string') {
    try {
      // Se for um JSON válido (ex: objeto ou array stringificado), parseia.
      return JSON.parse(val);
    } catch {
      // Se não for JSON (ex: um texto simples de termos), retorna a string original.
      return val;
    }
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
      `CREATE TABLE IF NOT EXISTS suppliers (id TEXT PRIMARY KEY, name TEXT NOT NULL, contact TEXT, phone TEXT)`,
      `CREATE TABLE IF NOT EXISTS equipment (id TEXT PRIMARY KEY, customer_id TEXT, type TEXT, brand TEXT, model TEXT, serial_number TEXT)`,
      `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value JSONB)`,
      `CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, customer_id TEXT, items JSONB, total DECIMAL(12,2), total_cost DECIMAL(12,2), payment_method TEXT, created_at TEXT)`,
      `CREATE TABLE IF NOT EXISTS financial_accounts (id TEXT PRIMARY KEY, description TEXT, amount DECIMAL(12,2), due_date TEXT, type TEXT, status TEXT, category TEXT, created_at TEXT, related_id TEXT)`,
      `CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, order_number INT, customer_id TEXT, equipment_id TEXT, status TEXT, problem_description TEXT, technical_report TEXT, accessories TEXT, checklist JSONB, checklist_observations TEXT, occurrences JSONB, items JSONB, labor_cost DECIMAL(12,2), labor_cost_base DECIMAL(12,2), diagnosis_fee DECIMAL(12,2), total DECIMAL(12,2), total_cost DECIMAL(12,2), warranty_days INT, created_at TEXT, updated_at TEXT, payment_status TEXT, history JSONB, payment_method TEXT, photos JSONB, technician TEXT)`,
    ];
    
    if (isCloudEnabled()) {
      try {
        for (const sql of commands) { await queryNeon(sql); }
        return { success: true, msg: "Cloud Conectado!" };
      } catch (err: any) {
        return { success: false, msg: "Erro Cloud: " + err.message };
      }
    }
    return { success: true, msg: "Offline Mode." };
  },

  getCustomers: async (): Promise<Customer[]> => {
    if (isCloudEnabled()) {
      const rows = await queryNeon('SELECT * FROM customers ORDER BY name ASC');
      if (rows) return rows as unknown as Customer[];
    }
    return dbInstance.customers.toArray();
  },

  updateCustomer: async (customer: Customer) => {
    await dbInstance.customers.put(customer);
    if (isCloudEnabled()) {
      await queryNeon(`INSERT INTO customers (id, name, phone, email, document, address) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET name = $2, phone = $3, email = $4, document = $5, address = $6`, [customer.id, customer.name, customer.phone || '', customer.email || '', customer.document || '', customer.address || '']);
    }
  },

  getSuppliers: async (): Promise<Supplier[]> => {
    if (isCloudEnabled()) {
      const rows = await queryNeon('SELECT * FROM suppliers ORDER BY name ASC');
      if (rows) return rows as unknown as Supplier[];
    }
    return dbInstance.suppliers.toArray();
  },

  updateSupplier: async (supplier: Supplier) => {
    await dbInstance.suppliers.put(supplier);
    if (isCloudEnabled()) {
      await queryNeon(`INSERT INTO suppliers (id, name, contact, phone) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = $2, contact = $3, phone = $4`, [supplier.id, supplier.name, supplier.contact || '', supplier.phone || '']);
    }
  },

  getProducts: async (): Promise<Product[]> => {
    if (isCloudEnabled()) {
      const rows = await queryNeon('SELECT * FROM products ORDER BY name ASC');
      if (rows) return rows.map(r => ({ ...r, price: Number(r.price), cost: Number(r.cost), stock: Number(r.stock) })) as unknown as Product[];
    }
    return dbInstance.products.toArray();
  },

  updateProduct: async (product: Product) => {
    await dbInstance.products.put(product);
    if (isCloudEnabled()) {
      await queryNeon(`INSERT INTO products (id, name, sku, price, cost, stock, category) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET name = $2, sku = $3, price = $4, cost = $5, stock = $6, category = $7`, [product.id, product.name, product.sku || '', Number(product.price), Number(product.cost), Number(product.stock), product.category]);
    }
  },

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
          problemDescription: r.problem_description,
          technicalReport: r.technical_report,
          accessories: r.accessories,
          checklist: ensureObject(r.checklist),
          checklistObservations: r.checklist_observations,
          occurrences: ensureArray(r.occurrences),
          items: ensureArray(r.items).map((i: any) => ({ 
            productId: i.productId,
            quantity: Number(i.quantity || 1),
            priceAtTime: Number(i.priceAtTime || 0), 
            costAtTime: Number(i.costAtTime || 0)
          })),
          laborCost: Number(r.labor_cost || 0),
          laborCostBase: Number(r.labor_cost_base || 0),
          diagnosisFee: Number(r.diagnosis_fee || 0),
          total: Number(r.total || 0),
          totalCost: Number(r.total_cost || 0),
          warrantyDays: Number(r.warranty_days || 0),
          paymentStatus: r.payment_status,
          paymentMethod: r.payment_method,
          history: ensureArray(r.history),
          photos: ensureArray(r.photos),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          technician: r.technician || ''
        })) as unknown as ServiceOrder[];
      }
    }
    return dbInstance.orders.toArray();
  },

  updateOrder: async (order: ServiceOrder) => {
    const sanitizedOrder: ServiceOrder = {
      ...order,
      laborCost: Number(order.laborCost) || 0,
      laborCostBase: Number(order.laborCostBase) || 0,
      diagnosisFee: Number(order.diagnosisFee) || 0,
      total: Number(order.total) || 0,
      totalCost: Number(order.totalCost) || 0,
      warrantyDays: Number(order.warrantyDays) || 90,
      items: (order.items || []).map(i => ({
        productId: i.productId,
        quantity: Number(i.quantity) || 1,
        priceAtTime: Number(i.priceAtTime) || 0,
        costAtTime: Number(i.costAtTime) || 0
      })),
      photos: order.photos || [],
      history: order.history || [],
      updatedAt: new Date().toISOString()
    };

    await dbInstance.orders.put(sanitizedOrder);

    if (isCloudEnabled()) {
      try {
        const sql = `
          INSERT INTO orders (
            id, order_number, customer_id, equipment_id, status, problem_description, technical_report, 
            accessories, checklist, checklist_observations, occurrences, items, labor_cost, labor_cost_base, 
            diagnosis_fee, total, total_cost, warranty_days, created_at, updated_at, payment_status, 
            history, payment_method, photos, technician
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
          ON CONFLICT (id) DO UPDATE SET 
            customer_id = EXCLUDED.customer_id, equipment_id = EXCLUDED.equipment_id, status = EXCLUDED.status, 
            problem_description = EXCLUDED.problem_description, technical_report = EXCLUDED.technical_report, 
            accessories = EXCLUDED.accessories, checklist = EXCLUDED.checklist, 
            checklist_observations = EXCLUDED.checklist_observations, occurrences = EXCLUDED.occurrences, 
            items = EXCLUDED.items, labor_cost = EXCLUDED.labor_cost, labor_cost_base = EXCLUDED.labor_cost_base, 
            diagnosis_fee = EXCLUDED.diagnosis_fee, total = EXCLUDED.total, total_cost = EXCLUDED.total_cost, 
            warranty_days = EXCLUDED.warranty_days, updated_at = EXCLUDED.updated_at, 
            payment_status = EXCLUDED.payment_status, history = EXCLUDED.history, 
            payment_method = EXCLUDED.payment_method, photos = EXCLUDED.photos, technician = EXCLUDED.technician
        `;

        await queryNeon(sql, [
          sanitizedOrder.id, sanitizedOrder.orderNumber, sanitizedOrder.customerId, sanitizedOrder.equipmentId,
          sanitizedOrder.status, sanitizedOrder.problemDescription || '', sanitizedOrder.technicalReport || '',
          sanitizedOrder.accessories || '', sanitizedOrder.checklist || {}, sanitizedOrder.checklistObservations || '',
          sanitizedOrder.occurrences || [], sanitizedOrder.items || [],
          sanitizedOrder.laborCost, sanitizedOrder.laborCostBase, sanitizedOrder.diagnosisFee,
          sanitizedOrder.total, sanitizedOrder.totalCost, sanitizedOrder.warrantyDays,
          sanitizedOrder.createdAt, sanitizedOrder.updatedAt, sanitizedOrder.paymentStatus,
          sanitizedOrder.history || [], sanitizedOrder.paymentMethod || '',
          sanitizedOrder.photos || [], sanitizedOrder.technician || ''
        ]);

        if (sanitizedOrder.status === OrderStatus.DELIVERED) {
          const accId = 'FIN_' + sanitizedOrder.id;
          await queryNeon(`
            INSERT INTO financial_accounts (id, description, amount, due_date, type, status, category, created_at, related_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING
          `, [accId, `O.S. #${sanitizedOrder.orderNumber}`, sanitizedOrder.total, sanitizedOrder.updatedAt.split('T')[0], 'RECEBER', 'PAGO', 'Ordens de Serviço', sanitizedOrder.createdAt, sanitizedOrder.id]);
        }
      } catch (err) {}
    }
    return sanitizedOrder;
  },

  getFinancialAccounts: async (): Promise<FinancialAccount[]> => {
    if (isCloudEnabled()) {
      const rows = await queryNeon('SELECT * FROM financial_accounts ORDER BY due_date ASC');
      if (rows) return rows.map(r => ({ ...r, amount: Number(r.amount), relatedId: r.related_id })) as unknown as FinancialAccount[];
    }
    return dbInstance.financialAccounts.toArray();
  },

  updateFinancialAccount: async (acc: FinancialAccount) => {
    await dbInstance.financialAccounts.put(acc);
    if (isCloudEnabled()) {
      await queryNeon(`
        INSERT INTO financial_accounts (id, description, amount, due_date, type, status, category, created_at, related_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET description = $2, amount = $3, due_date = $4, type = $5, status = $6, category = $7
      `, [acc.id, acc.description, Number(acc.amount), acc.dueDate, acc.type, acc.status, acc.category, acc.createdAt, acc.relatedId || '']);
    }
  },

  getSales: async () => {
    if (isCloudEnabled()) {
      const rows = await queryNeon('SELECT * FROM sales ORDER BY created_at DESC');
      if (rows) return rows.map(r => ({ ...r, items: ensureArray(r.items), total: Number(r.total), totalCost: Number(r.total_cost || 0) })) as unknown as Sale[];
    }
    return dbInstance.sales.toArray();
  },

  addSale: async (sale: Sale) => {
    await dbInstance.sales.put(sale);
    if (isCloudEnabled()) {
      try {
        await queryNeon(`INSERT INTO sales (id, customer_id, items, total, total_cost, payment_method, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [sale.id, sale.customerId || '', sale.items, Number(sale.total), Number(sale.totalCost || 0), sale.paymentMethod, sale.createdAt]);
      } catch (e) {}
    }
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
  getStatusMessages: () => getSetting('status_messages', {
    'Aguardando Análise': "Olá {{cliente}}, seu aparelho {{aparelho}} já está conosco para análise (O.S. #{{os}}). Logo entraremos em contato!",
    'Em Orçamento': "Olá {{cliente}}, o orçamento da sua O.S. #{{os}} ({{aparelho}}) está pronto! O valor total é R$ {{valor}}. Podemos prosseguir?",
    'Aprovado': "Olá {{cliente}}, o orçamento foi aprovado! Iniciaremos o reparo do seu {{aparelho}} em breve.",
    'Em Reparo': "Olá {{cliente}}, informamos que seu {{aparelho}} (O.S. #{{os}}) já está na bancada técnica para manutenção.",
    'Finalizado': "Olá {{cliente}}, boas notícias! O reparo do seu {{aparelho}} foi concluído. Você já pode vir buscá-lo!",
    'Entregue': "Olá {{cliente}}, seu aparelho {{aparelho}} foi entregue. Obrigado pela preferência!",
    'Cancelado': "Olá {{cliente}}, informamos que a O.S. #{{os}} foi cancelada conforme solicitado.",
    'Garantia/Retorno': "Olá {{cliente}}, recebemos seu {{aparelho}} para verificação de garantia (O.S. #{{os}})."
  }),
  saveStatusMessages: (msgs: Record<string, string>) => saveSetting('status_messages', msgs),
  saveCustomers: (data: any) => dbInstance.customers.clear().then(() => dbInstance.customers.bulkAdd(data)),
  saveProducts: (data: any) => dbInstance.products.clear().then(() => dbInstance.products.bulkAdd(data)),
  saveEquipment: (data: any) => dbInstance.equipment.clear().then(() => dbInstance.equipment.bulkAdd(data)),
  saveSuppliers: (data: any) => dbInstance.suppliers.clear().then(() => dbInstance.suppliers.bulkAdd(data)),
  deleteFinancialAccount: async (id: string) => {
    await dbInstance.financialAccounts.delete(id);
    if (isCloudEnabled()) {
      try { await queryNeon('DELETE FROM financial_accounts WHERE id = $1', [id]); } catch (e) {}
    }
  },
  getEquipment: async (): Promise<Equipment[]> => {
    if (isCloudEnabled()) {
      const rows = await queryNeon('SELECT * FROM equipment');
      if (rows) return rows.map(r => ({ id: r.id, customerId: r.customer_id, type: r.type, brand: r.brand, model: r.model, serialNumber: r.serial_number })) as unknown as Equipment[];
    }
    return dbInstance.equipment.toArray();
  },
  addEquipment: async (eq: Equipment) => {
    await dbInstance.equipment.put(eq);
    if (isCloudEnabled()) {
      await queryNeon(`INSERT INTO equipment (id, customer_id, type, brand, model, serial_number) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET customer_id = $2, type = $3, brand = $4, model = $5, serial_number = $6`, [eq.id, eq.customerId, eq.type || '', eq.brand || '', eq.model || '', eq.serialNumber || '']);
    }
  }
};

async function getSetting(key: string, defaultValue: any) {
  if (isCloudEnabled()) {
    try {
      const rows = await queryNeon('SELECT value FROM settings WHERE key = $1', [key]);
      if (rows && rows.length > 0) return ensureObject(rows[0].value);
    } catch (e) { return defaultValue; }
  }
  const item = await dbInstance.settings.get(key);
  return item ? item.value : defaultValue;
}

async function saveSetting(key: string, value: any) {
  await dbInstance.settings.put({ key, value });
  if (isCloudEnabled()) {
    try {
      await queryNeon('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, value]);
    } catch (e) {}
  }
}
