
import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Truck, 
  ShoppingCart, 
  Settings,
  ClipboardList,
  Wrench,
  BarChart3,
  Wallet
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Painel FixOS', icon: <LayoutDashboard size={20} /> },
  { id: 'orders', label: 'Ordens de Serviço', icon: <ClipboardList size={20} /> },
  { id: 'finance', label: 'Financeiro', icon: <Wallet size={20} /> },
  { id: 'customers', label: 'Clientes', icon: <Users size={20} /> },
  { id: 'products', label: 'Estoque/Serviços', icon: <Package size={20} /> },
  { id: 'suppliers', label: 'Fornecedores', icon: <Truck size={20} /> },
  { id: 'equipment', label: 'Equipamentos', icon: <Wrench size={20} /> },
  { id: 'sales', label: 'Vendas Diretas', icon: <ShoppingCart size={20} /> },
  { id: 'settings', label: 'Ajustes FixOS', icon: <Settings size={20} /> },
];

export const STATUS_COLORS: Record<string, string> = {
  'Aguardando Análise': 'bg-blue-100 text-blue-700 border-blue-200',
  'Em Orçamento': 'bg-amber-100 text-amber-700 border-amber-200',
  'Aprovado': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Em Reparo': 'bg-purple-100 text-purple-700 border-purple-200',
  'Finalizado': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Entregue': 'bg-slate-100 text-slate-500 border-slate-200',
  'Cancelado': 'bg-red-100 text-red-700 border-red-200',
  'Garantia/Retorno': 'bg-orange-500 text-white border-orange-600',
};
