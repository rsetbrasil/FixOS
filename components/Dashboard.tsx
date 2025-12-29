
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import { 
  Activity, Calendar, ArrowUpRight, Folder, LayoutGrid, Zap, TrendingUp, Sparkles, RefreshCcw
} from 'lucide-react';
import { db } from '../utils/storage';
import { ServiceOrder, Sale, OrderStatus } from '../types';
// Import Gemini insights service
import { getBusinessInsights } from '../services/gemini';

const Dashboard: React.FC = () => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [o, s] = await Promise.all([db.getOrders(), db.getSales()]);
        setOrders(o);
        setSales(s);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const osRevenue = orders.reduce((acc, o) => acc + o.total, 0);
  const salesRevenue = sales.reduce((acc, s) => acc + s.total, 0);
  const totalRevenue = osRevenue + salesRevenue;

  const handleGenerateInsights = async () => {
    setIsGeneratingInsights(true);
    const stats = {
      totalRevenue,
      osCount: orders.length,
      salesCount: sales.length,
      averageTicket: totalRevenue / (orders.length + sales.length || 1),
      pendingOrders: orders.filter(o => o.status === OrderStatus.ENTRY || o.status === OrderStatus.BUDGET).length
    };
    try {
      const insights = await getBusinessInsights(stats);
      setAiInsights(insights);
    } catch (err) {
      console.error("Erro AI Insights:", err);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  if (loading) return <div className="p-20 text-center font-black text-blue-600 animate-pulse uppercase tracking-[0.3em]">Carregando Painel...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="Faturamento O.S." value={`R$ ${osRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={<Folder className="text-blue-600" />} color="bg-blue-50 border-blue-100" />
        <MetricCard label="Vendas Diretas" value={`R$ ${salesRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={<TrendingUp className="text-emerald-600" />} color="bg-emerald-50 border-emerald-100" />
        <MetricCard label="Receita Total" value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={<Zap className="text-amber-600" />} color="bg-amber-50 border-amber-100" />
      </div>

      {/* AI Strategy Insights Section */}
      <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
           <Sparkles size={160} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="max-w-xl">
             <h3 className="text-2xl font-black mb-2 flex items-center gap-3">
               <Sparkles className="text-indigo-400" /> Assistente de Crescimento FixOS
             </h3>
             <p className="text-slate-400 text-sm font-medium leading-relaxed">
               {aiInsights || "Sua inteligência artificial integrada analisará o faturamento e fluxo de ordens para sugerir ações imediatas de otimização."}
             </p>
          </div>
          <button 
            onClick={handleGenerateInsights}
            disabled={isGeneratingInsights}
            className="bg-indigo-600 text-white px-10 py-5 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-900/40 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
          >
            {isGeneratingInsights ? <RefreshCcw className="animate-spin" size={18} /> : <Zap size={18} />}
            {aiInsights ? "Recalcular Sugestões" : "Gerar Insights com IA"}
          </button>
        </div>
        {aiInsights && (
          <div className="mt-10 p-8 bg-white/5 rounded-[32px] border border-white/10 backdrop-blur-md animate-in slide-in-from-top-4 duration-500">
            <div className="text-indigo-50 text-xs font-bold whitespace-pre-wrap leading-loose italic">
              {aiInsights}
            </div>
          </div>
        )}
      </div>

      {/* Seção de Status */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity size={14} className="text-blue-600" /> Monitoramento de Fluxo
            </h3>
            <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-3 py-1 rounded-full uppercase">On-line</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            <GaugeItem label="Orçamento" value={orders.filter(o => o.status === OrderStatus.BUDGET).length} color="#3b82f6" max={orders.length || 1} />
            <GaugeItem label="Em Aberto" value={orders.filter(o => o.status === OrderStatus.ENTRY).length} color="#6366f1" max={orders.length || 1} />
            <GaugeItem label="Aprovado" value={orders.filter(o => o.status === OrderStatus.APPROVED).length} color="#10b981" max={orders.length || 1} />
            <GaugeItem label="Manutenção" value={orders.filter(o => o.status === OrderStatus.IN_REPAIR).length} color="#f59e0b" max={orders.length || 1} />
            <GaugeItem label="Concluído" value={orders.filter(o => o.status === OrderStatus.FINISHED).length} color="#10b981" max={orders.length || 1} />
            <GaugeItem label="Entregue" value={orders.filter(o => o.status === OrderStatus.DELIVERED).length} color="#94a3b8" max={orders.length || 1} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[320px]">
          <div className="relative w-48 h-48">
            <ResponsiveContainer width="100%" height="100%" minHeight={160}>
              <PieChart>
                <Pie 
                  data={[{v: 75}, {v: 25}]} 
                  innerRadius="75%" 
                  outerRadius="100%" 
                  startAngle={225} 
                  endAngle={-45} 
                  dataKey="v" 
                  stroke="none"
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#f1f5f9" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-slate-900">75%</span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Meta Mensal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Detalhado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DataWidget title="Ticket Médio" value={`R$ ${(totalRevenue / (orders.length || 1)).toFixed(2)}`} sub="Base atual" />
        <DataWidget title="Ordens Ativas" value={orders.length} sub="+12% vs período anterior" />
        <DataWidget title="Estoque Baixo" value="14 itens" sub="Atenção necessária" />
        <div className="bg-blue-600 p-8 rounded-[32px] shadow-xl shadow-blue-200 flex flex-col justify-between group hover:scale-[1.02] transition-transform h-[180px]">
          <div className="flex justify-between items-start">
             <LayoutGrid className="text-blue-100" size={24} />
             <ArrowUpRight className="text-blue-100" size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Margem Projetada</p>
            <p className="text-3xl font-black text-white">R$ {(totalRevenue * 0.45).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, icon, color }: any) => (
  <div className={`${color} p-8 rounded-[32px] border flex items-center justify-between group hover:shadow-md transition-all h-[140px]`}>
    <div className="space-y-2">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
    <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
      {icon}
    </div>
  </div>
);

const GaugeItem = ({ label, value, color, max }: any) => (
  <div className="text-center group min-w-[100px]">
    <div className="relative w-24 h-24 mx-auto mb-3">
      <div className="absolute inset-0">
        <ResponsiveContainer width="100%" height="100%" minHeight={96}>
          <PieChart>
            <Pie 
              data={[{v: value || 0.1}, {v: Math.max(0.1, max - value)}]} 
              innerRadius="75%" 
              outerRadius="100%" 
              startAngle={225} 
              endAngle={-45} 
              dataKey="v" 
              stroke="none"
            >
              <Cell fill={color} />
              <Cell fill="#f1f5f9" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="absolute inset-0 flex items-center justify-center pt-2">
        <span className="text-xl font-black text-slate-900 group-hover:scale-125 transition-transform">{value}</span>
      </div>
    </div>
    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate px-1">{label}</p>
  </div>
);

const DataWidget = ({ title, value, sub }: any) => (
  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm h-[180px] flex flex-col justify-center">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{title}</p>
    <p className="text-2xl font-black text-slate-900 mb-1">{value}</p>
    <p className="text-[10px] font-bold text-emerald-600">{sub}</p>
  </div>
);

export default Dashboard;
