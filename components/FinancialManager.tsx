
import React, { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle, 
  Calendar, Filter, Search, DownloadCloud, PieChart as PieIcon, 
  DollarSign, CreditCard, Landmark, QrCode
} from 'lucide-react';
import { db } from '../utils/storage';
import { ServiceOrder, Sale } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const FinancialManager: React.FC = () => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const loadData = async () => {
      const [o, s] = await Promise.all([db.getOrders(), db.getSales()]);
      setOrders(o);
      setSales(s);
      setLoading(false);
    };
    loadData();
  }, []);

  const finishedOrders = orders.filter(o => o.status === 'Finalizado' || o.status === 'Entregue');
  
  const transactions = [
    ...finishedOrders.map(o => ({
      id: o.id,
      type: 'OS',
      description: `O.S. #${o.orderNumber}`,
      amount: o.total,
      date: o.updatedAt,
      method: o.paymentMethod || 'Dinheiro'
    })),
    ...sales.map(s => ({
      id: s.id,
      type: 'VENDA',
      description: 'Venda Direta',
      amount: s.total,
      date: s.createdAt,
      method: s.paymentMethod
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredTransactions = transactions.filter(t => t.date.startsWith(filterMonth));

  const totalRevenue = filteredTransactions.reduce((acc, t) => acc + t.amount, 0);
  const osRevenue = filteredTransactions.filter(t => t.type === 'OS').reduce((acc, t) => acc + t.amount, 0);
  const salesRevenue = filteredTransactions.filter(t => t.type === 'VENDA').reduce((acc, t) => acc + t.amount, 0);

  const methodData = [
    { name: 'Dinheiro', value: filteredTransactions.filter(t => t.method === 'Dinheiro').reduce((acc, t) => acc + t.amount, 0) },
    { name: 'Cartão', value: filteredTransactions.filter(t => t.method === 'Cartão').reduce((acc, t) => acc + t.amount, 0) },
    { name: 'Pix', value: filteredTransactions.filter(t => t.method === 'Pix').reduce((acc, t) => acc + t.amount, 0) },
  ].filter(d => d.value > 0);

  const COLORS = ['#10b981', '#6366f1', '#f59e0b'];

  if (loading) return <div className="p-20 text-center font-black text-indigo-600 animate-pulse">CARREGANDO FINANCEIRO...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl">
            <Wallet size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Gestão Financeira</h2>
            <p className="text-slate-500 text-sm font-medium">Controle de entradas, métodos de pagamento e fluxo de caixa.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="month" 
            className="bg-slate-50 border-none p-4 rounded-2xl font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          />
          <button className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all">
            <DownloadCloud size={24} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FinCard label="Receita Bruta" value={`R$ ${totalRevenue.toLocaleString()}`} icon={<ArrowUpCircle className="text-emerald-500" />} color="bg-emerald-50/50" />
        <FinCard label="Faturamento O.S." value={`R$ ${osRevenue.toLocaleString()}`} icon={<TrendingUp className="text-blue-500" />} color="bg-blue-50/50" />
        <FinCard label="Vendas Diretas" value={`R$ ${salesRevenue.toLocaleString()}`} icon={<TrendingUp className="text-amber-500" />} color="bg-amber-50/50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
            <Calendar size={14} className="text-indigo-600" /> Histórico Recente de Entradas
          </h3>
          <div className="space-y-4">
            {filteredTransactions.slice(0, 10).map((t) => (
              <div key={t.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-[24px] border border-slate-100 group hover:bg-white hover:shadow-lg transition-all">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${t.type === 'OS' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                    {t.method === 'Dinheiro' && <DollarSign size={20} />}
                    {t.method === 'Cartão' && <CreditCard size={20} />}
                    {t.method === 'Pix' && <QrCode size={20} />}
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-sm uppercase">{t.description}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(t.date).toLocaleDateString()} • {t.method}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-emerald-600 text-lg">+ R$ {t.amount.toLocaleString()}</p>
                </div>
              </div>
            ))}
            {filteredTransactions.length === 0 && (
              <p className="text-center py-20 text-slate-400 font-bold italic">Nenhuma movimentação no período.</p>
            )}
          </div>
        </div>

        <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm flex flex-col items-center">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-10 text-center">
            Meios de Pagamento
          </h3>
          <div className="h-64 w-full min-h-[256px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={256}>
              <PieChart>
                <Pie data={methodData} innerRadius={60} outerRadius={80} paddingAngle={10} dataKey="value">
                  {methodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} 
                  formatter={(val: number) => `R$ ${val.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 w-full space-y-3">
            {methodData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-[10px] font-black uppercase text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  {d.name}
                </div>
                <span>R$ {d.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const FinCard = ({ label, value, icon, color }: any) => (
  <div className={`${color} p-8 rounded-[32px] border border-slate-100 flex items-center justify-between group`}>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-900">{value}</p>
    </div>
    <div className="bg-white p-4 rounded-2xl shadow-sm group-hover:scale-110 transition-transform">{icon}</div>
  </div>
);

export default FinancialManager;
