
import React, { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle, 
  Calendar, Filter, Search, DownloadCloud, PieChart as PieIcon, 
  DollarSign, CreditCard, Landmark, QrCode, BarChart3
} from 'lucide-react';
import { db } from '../utils/storage';
import { ServiceOrder, Sale, FinancialAccount } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const FinancialManager: React.FC = () => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [accs, setAccs] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const loadData = async () => {
      const [o, s, a] = await Promise.all([db.getOrders(), db.getSales(), db.getFinancialAccounts()]);
      setOrders(o || []);
      setSales(s || []);
      setAccs(a || []);
      setLoading(false);
    };
    loadData();
  }, []);

  const finishedOrders = orders.filter(o => 
    (o.status === 'Finalizado' || o.status === 'Entregue') && 
    (o.updatedAt?.startsWith(filterMonth))
  );
  
  const monthSales = sales.filter(s => 
    s.createdAt?.startsWith(filterMonth)
  );
  
  const monthAccs = accs.filter(a => 
    a.status === 'PAGO' && 
    (a.dueDate?.startsWith(filterMonth))
  );

  // Cálculo de Faturamento
  const revenueOS = finishedOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  const revenueSales = monthSales.reduce((acc, s) => acc + (s.total || 0), 0);
  const totalRevenue = revenueOS + revenueSales + monthAccs.filter(a => a.type === 'RECEBER').reduce((acc, a) => acc + (a.amount || 0), 0);

  // Cálculo de Custos
  const costOS = finishedOrders.reduce((acc, o) => acc + (o.totalCost || 0), 0);
  const costSales = monthSales.reduce((acc, s) => acc + (s.totalCost || 0), 0);
  const expenses = monthAccs.filter(a => a.type === 'PAGAR').reduce((acc, a) => acc + (a.amount || 0), 0);
  const totalCost = costOS + costSales + expenses;

  // Lucro Real
  const netProfit = totalRevenue - totalCost;

  const dataCharts = [
    { name: 'Receitas', valor: totalRevenue },
    { name: 'Custos/Despesas', valor: totalCost },
    { name: 'Lucro Líquido', valor: netProfit },
  ];

  if (loading) return <div className="p-20 text-center font-black text-indigo-600 animate-pulse uppercase tracking-[0.2em]">Sincronizando Financeiro...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl">
            <Wallet size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Fluxo de Caixa & Lucratividade</h2>
            <p className="text-slate-500 text-sm font-medium">Análise de receitas brutas vs custos reais de produtos e serviços.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Calendar size={18} className="text-slate-400" />
          <input 
            type="month" 
            className="bg-slate-50 border border-slate-200 p-4 rounded-2xl font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <FinCard label="Receita Bruta" value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={<ArrowUpCircle className="text-emerald-500" />} color="bg-emerald-50/50" />
        <FinCard label="Custo de Peças/M.O." value={`R$ ${(costOS + costSales).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={<TrendingDown className="text-amber-500" />} color="bg-amber-50/50" />
        <FinCard label="Contas Pagas" value={`R$ ${expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={<ArrowDownCircle className="text-red-500" />} color="bg-red-50/50" />
        <FinCard label="Lucro Real" value={`R$ ${netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={<TrendingUp className="text-indigo-500" />} color="bg-indigo-50/50" highlight />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
            <BarChart3 size={14} className="text-indigo-600" /> Comparativo Financeiro
          </h3>
          <div className="h-80 w-full min-h-[320px]">
             <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                <BarChart data={dataCharts}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="valor" radius={[10, 10, 0, 0]}>
                    {dataCharts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 2 ? '#6366f1' : index === 1 ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 text-center">Detalhamento de Entradas</h3>
          <div className="space-y-6">
            <EntryItem label="Ordens de Serviço" value={revenueOS} total={totalRevenue} color="bg-blue-500" />
            <EntryItem label="Vendas de Balcão" value={revenueSales} total={totalRevenue} color="bg-emerald-500" />
            <EntryItem label="Outros Recebimentos" value={totalRevenue - (revenueOS + revenueSales)} total={totalRevenue} color="bg-indigo-500" />
            
            <div className="pt-8 border-t border-slate-100 mt-8">
               <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Margem de Lucro Bruta</span>
                  <span className="text-sm font-black text-slate-900">{((netProfit / (totalRevenue || 1)) * 100).toFixed(1)}%</span>
               </div>
               <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600" style={{ width: `${(netProfit / (totalRevenue || 1)) * 100}%` }}></div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FinCard = ({ label, value, icon, color, highlight }: any) => (
  <div className={`${color} p-8 rounded-[32px] border ${highlight ? 'border-indigo-200 ring-2 ring-indigo-500/10' : 'border-slate-100'} flex items-center justify-between group hover:shadow-md transition-all`}>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-black ${highlight ? 'text-indigo-600' : 'text-slate-900'}`}>{value}</p>
    </div>
    <div className="bg-white p-4 rounded-2xl shadow-sm group-hover:scale-110 transition-transform">{icon}</div>
  </div>
);

const EntryItem = ({ label, value, total, color }: any) => (
  <div className="space-y-2">
    <div className="flex justify-between text-[10px] font-black uppercase">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900">R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
    </div>
    <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${(value / (total || 1)) * 100}%` }}></div>
    </div>
  </div>
);

export default FinancialManager;
