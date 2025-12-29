
export enum OrderStatus {
  ENTRY = 'Aguardando Análise',
  BUDGET = 'Em Orçamento',
  APPROVED = 'Aprovado',
  IN_REPAIR = 'Em Reparo',
  FINISHED = 'Finalizado',
  DELIVERED = 'Entregue',
  CANCELLED = 'Cancelado',
  WARRANTY = 'Garantia/Retorno'
}

export enum PaymentStatus {
  PENDENTE = 'Pendente',
  PARCIAL = 'Parcial',
  PAGO = 'Pago'
}

export interface BusinessInfo {
  name: string;
  cnpj: string;
  phone: string;
  address: string;
  logoUrl?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  document: string;
  zipCode?: string;
  address: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  category: string;
}

export interface Equipment {
  id: string;
  customerId: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string;
}

export interface SaleItem {
  productId: string;
  quantity: number;
  priceAtTime: number;
  costAtTime: number;
}

export interface Sale {
  id: string;
  customerId?: string;
  items: SaleItem[];
  total: number;
  totalCost: number;
  paymentMethod: string;
  createdAt: string;
}

export interface Occurrence {
  id: string;
  description: string;
  timestamp: string;
  type: 'Informação' | 'Alerta' | 'Problema';
}

export interface FinancialAccount {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  type: 'PAGAR' | 'RECEBER';
  status: 'PENDENTE' | 'PAGO';
  category: string;
  createdAt: string;
  relatedId?: string; // ID da OS ou Venda relacionada
}

export interface ServiceOrder {
  id: string;
  orderNumber: number;
  customerId: string;
  equipmentId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  problemDescription: string;
  technicalReport: string;
  accessories: string;
  checklist: Record<string, boolean>;
  checklistObservations?: string;
  photos?: string[]; // Array de strings base64
  items: Array<{
    productId: string;
    quantity: number;
    priceAtTime: number;
    costAtTime: number;
  }>;
  laborCost: number;
  laborCostBase?: number; // Custo de execução (ex: comissão técnico)
  diagnosisFee: number;
  total: number;
  totalCost: number;
  warrantyDays: number;
  warrantyExpiryDate?: string;
  createdAt: string;
  updatedAt: string;
  technician?: string;
  priority?: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  history: Array<{
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }>;
  occurrences?: Occurrence[];
}
