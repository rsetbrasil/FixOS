
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
  PENDING = 'Pendente',
  PARTIAL = 'Parcial',
  PAID = 'Pago'
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
}

export interface Sale {
  id: string;
  customerId?: string;
  items: SaleItem[];
  total: number;
  paymentMethod: string;
  createdAt: string;
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
  items: Array<{
    productId: string;
    quantity: number;
    priceAtTime: number;
  }>;
  laborCost: number;
  diagnosisFee: number;
  total: number;
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
}
