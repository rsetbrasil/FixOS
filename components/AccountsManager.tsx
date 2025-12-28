
import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, CheckCircle, X, 
  ArrowUpCircle, ArrowDownCircle, Filter, Calendar,
  DollarSign, Tag, Clock, AlertCircle
} from 'lucide-react';
import { db } from '../utils/storage';
import { FinancialAccount } from '../types';

const AccountsManager: React.FC = () => {
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<Partial<FinancialAccount> | null>(null);
  const [filter, setFilter] = useState<'TODOS' | 'PAGAR' | 'RECEBER'>('TODOS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PENDENTE' | 'PAGO'>('TODOS');

  useEffect(() => { loadAccounts(); }, []);

  const loadAccounts = async () => {
    const data = await db.getFinancialAccounts();
    setAccounts(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editingAcc?.description || !editingAcc?.amount || !editingAcc?.dueDate) return alert("Preencha todos os campos.");
    
    const account: FinancialAccount = {
      ...editingAcc,
      id: editingAcc.id || Math.random().toString(36).substr(2, 9),
      description: editingAcc.description,
      amount: Number(editingAcc.amount),
      dueDate: editingAcc.dueDate,
      type: editingAcc.type || 'PAGAR',
      status: editingAcc.status || 'PENDENTE',
      category: editingAcc.category || 'Geral',
      createdAt: editingAcc.createdAt || new Date().toISOString()
    } as FinancialAccount;

    await db.updateFinancialAccount(account);
    await loadAccounts();
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja excluir este lançamento?")) {
      await db.deleteFinancialAccount(id);
      await loadAccounts();
    }
  };

  const toggleStatus = async (acc: FinancialAccount) => {
    const updated = { ...acc, status: acc.status === 'PENDENTE' ? 'PAGO' : ('PENDENTE' as any) };
    await db.updateFinancialAccount(updated);
    await loadAccounts();
  };

  const filtered = accounts.filter(acc => {
    const matchType = filter === 'TODOS' || acc.type === filter;
    const matchStatus = statusFilter === 'TODOS' || acc.status === statusFilter;
    return matchType && matchStatus;
  });

  const totalPagar = filtered.filter(a => a.type === 'PAGAR' && a.status === 'PENDENTE').reduce((acc, a) => acc + a.amount, 0);
  const totalReceber = filtered.filter(a => a.type === 'RECEBER' && a.status === 'PENDENTE').reduce((acc, a) => acc + a.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard label="Pendente a Pagar" value={`R$ ${totalPagar.toLocaleString()}`} icon={<ArrowDownCircle className="text-red-500" />} color="bg-red-50" />
        <SummaryCard label="Pendente a Receber" value={`R$ ${totalReceber.toLocaleString()}`} icon={<ArrowUpCircle className="text-emerald-500" />} color="bg-emerald-50" />
        <button 
          onClick={() => { setEditingAcc({ type: 'PAGAR', status: 'PENDENTE', dueDate: new Date().toISOString().split('T')[0] }); setIsModalOpen(true); }}
          className="bg-indigo-600 text-white rounded-[32px] p-8 flex flex-col items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
        >
          <Plus size={32} />
          <span className="font-black text-xs uppercase tracking-widest">Novo Lançamento</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <FilterBtn active={filter === 'TODOS'} onClick={() => setFilter('TODOS')}>Todos</FilterBtn>
          <FilterBtn active={filter === 'PAGAR'} onClick={() => setFilter('PAGAR')}>Pagar</FilterBtn>
          <FilterBtn active={filter === 'RECEBER'} onClick={() => setFilter('RECEBER')}>Receber</FilterBtn>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <FilterBtn active={statusFilter === 'TODOS'} onClick={() => setStatusFilter('TODOS')}>Tudo</FilterBtn>
          <FilterBtn active={statusFilter === 'PENDENTE'} onClick={() => setStatusFilter('PENDENTE')}>Pendentes</FilterBtn>
          <FilterBtn active={statusFilter === 'PAGO'} onClick={() => setStatusFilter('PAGO')}>Pagos</FilterBtn>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="p-5 px-8">Descrição / Categoria</th>
              <th className="p-5">Vencimento</th>
              <th className="p-5">Tipo</th>
              <th className="p-5">Valor</th>
              <th className="p-5 text-center">Status</th>
              <th className="p-5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(acc => (
              <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-5 px-8">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900">{acc.description}</span>
                    <span className="text-[10px] text-slate-400 font-black uppercase flex items-center gap-1"><Tag size={10}/> {acc.category}</span>
                  </div>
                </td>
                <td className="p-5 text-sm font-bold text-slate-600">
                  {new Date(acc.dueDate).toLocaleDateString('pt-BR')}
                </td>
                <td className="p-5">
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${acc.type === 'PAGAR' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {acc.type}
                  </span>
                </td>
                <td className={`p-5 font-black ${acc.type === 'PAGAR' ? 'text-red-600' : 'text-emerald-600'}`}>
                  R$ {acc.amount.toLocaleString()}
                </td>
                <td className="p-5 text-center">
                  <button 
                    onClick={() => toggleStatus(acc)}
                    className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${acc.status === 'PAGO' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >
                    {acc.status === 'PAGO' ? (acc.type === 'PAGAR' ? 'PAGO' : 'RECEBIDO') : 'PENDENTE'}
                  </button>
                </td>
                <td className="p-5">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => { setEditingAcc(acc); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 bg-white border rounded-xl shadow-sm"><Edit2 size={16}/></button>
                    <button onClick={() => handleDelete(acc.id)} className="p-2 text-slate-400 hover:text-red-600 bg-white border rounded-xl shadow-sm"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-20 text-center text-slate-300 font-bold italic">Nenhum lançamento encontrado.</div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-50">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Novo Lançamento</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-50 rounded-full"><X size={24}/></button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Descrição</label>
                <input 
                  className="w-full bg-slate-50 border p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="Ex: Aluguel da Loja, Compra de Peças..."
                  value={editingAcc?.description || ''}
                  onChange={e => setEditingAcc({...editingAcc, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Valor</label>
                  <input 
                    type="number"
                    className="w-full bg-slate-50 border p-4 rounded-2xl text-sm font-black text-slate-900 outline-none" 
                    value={editingAcc?.amount || ''}
                    onChange={e => setEditingAcc({...editingAcc, amount: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Vencimento</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-50 border p-4 rounded-2xl text-sm font-bold outline-none" 
                    value={editingAcc?.dueDate?.split('T')[0] || ''}
                    onChange={e => setEditingAcc({...editingAcc, dueDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo</label>
                  <select 
                    className="w-full bg-slate-50 border p-4 rounded-2xl text-sm font-black uppercase outline-none"
                    value={editingAcc?.type || 'PAGAR'}
                    onChange={e => setEditingAcc({...editingAcc, type: e.target.value as any})}
                  >
                    <option value="PAGAR">Conta a Pagar</option>
                    <option value="RECEBER">Conta a Receber</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Categoria</label>
                  <input 
                    className="w-full bg-slate-50 border p-4 rounded-2xl text-sm font-bold outline-none" 
                    placeholder="Ex: Fixos, Peças..."
                    value={editingAcc?.category || ''}
                    onChange={e => setEditingAcc({...editingAcc, category: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-10 pt-6 border-t border-slate-50">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-4 font-black text-slate-400 text-xs uppercase tracking-widest">Sair</button>
              <button onClick={handleSave} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 uppercase text-xs tracking-widest">Salvar Lançamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value, icon, color }: any) => (
  <div className={`${color} p-8 rounded-[32px] border border-white shadow-sm flex items-center justify-between`}>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
    <div className="p-4 bg-white rounded-2xl shadow-sm">{icon}</div>
  </div>
);

const FilterBtn = ({ children, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
  >
    {children}
  </button>
);

export default AccountsManager;
