
import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, UserCheck, X, MapPin, Loader2 } from 'lucide-react';
import { db } from '../utils/storage';
import { Customer } from '../types';

const CustomerManager: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCepLoading, setIsCepLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const data = await db.getCustomers();
    setCustomers(data);
    setLoading(false);
  };

  const handleCepLookup = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    setEditingCustomer(prev => ({ ...prev, zipCode: cep }));

    if (cleanCep.length === 8) {
      setIsCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          const addressString = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
          setEditingCustomer(prev => ({ ...prev, address: addressString }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      } finally {
        setIsCepLoading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!editingCustomer?.name) return;
    const newCustomer = {
      ...editingCustomer,
      id: editingCustomer.id || Math.random().toString(36).substr(2, 9),
      phone: editingCustomer.phone || '',
      email: editingCustomer.email || '',
      document: editingCustomer.document || '',
      zipCode: editingCustomer.zipCode || '',
      address: editingCustomer.address || ''
    } as Customer;

    await db.updateCustomer(newCustomer);
    await loadCustomers();
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este cliente?')) {
      const updated = customers.filter(c => c.id !== id);
      await db.saveCustomers(updated);
      await loadCustomers();
    }
  };

  const filtered = customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-gray-100 gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
            <UserCheck size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Base de Clientes</h2>
            <p className="text-gray-500 text-sm">Gerencie o cadastro e contatos dos seus clientes.</p>
          </div>
        </div>
        <button 
          onClick={() => { setEditingCustomer({}); setIsModalOpen(true); }}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl hover:bg-indigo-700 flex items-center gap-3 font-black shadow-lg shadow-indigo-100 transition-all active:scale-95"
        >
          <Plus size={22} /> NOVO CLIENTE
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou telefone..." 
              className="pl-12 pr-6 py-3 border border-gray-200 rounded-2xl w-full focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/30 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-50">
                <th className="py-5 px-8">Nome do Cliente</th>
                <th className="py-5 px-4">WhatsApp</th>
                <th className="py-5 px-4">Email</th>
                <th className="py-5 px-8 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-indigo-50/20 transition-colors">
                  <td className="py-5 px-8 font-bold text-gray-900">{c.name}</td>
                  <td className="py-5 px-4 text-gray-600 font-medium">{c.phone}</td>
                  <td className="py-5 px-4 text-gray-400 text-sm">{c.email || '—'}</td>
                  <td className="py-5 px-8">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => { setEditingCustomer(c); setIsModalOpen(true); }} className="p-2.5 text-gray-400 hover:text-indigo-600 bg-white border border-gray-100 rounded-xl shadow-sm"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-2.5 text-gray-400 hover:text-red-600 bg-white border border-gray-100 rounded-xl shadow-sm"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-gray-300 italic">Nenhum cliente cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-md shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-50">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">{editingCustomer?.id ? 'Editar' : 'Novo'} Cliente</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-300 hover:text-red-500 transition-all p-2 bg-gray-50 rounded-2xl"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome Completo</label>
                <input 
                  className="w-full border border-gray-200 p-3 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50"
                  value={editingCustomer?.name || ''}
                  onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">WhatsApp</label>
                  <input 
                    className="w-full border border-gray-200 p-3 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50"
                    value={editingCustomer?.phone || ''}
                    onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Documento (CPF/CNPJ)</label>
                  <input 
                    className="w-full border border-gray-200 p-3 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50"
                    value={editingCustomer?.document || ''}
                    onChange={e => setEditingCustomer({...editingCustomer, document: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Email</label>
                <input 
                  className="w-full border border-gray-200 p-3 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50"
                  value={editingCustomer?.email || ''}
                  onChange={e => setEditingCustomer({...editingCustomer, email: e.target.value})}
                />
              </div>
              
              <div className="border-t border-gray-100 pt-4 mt-4">
                <div className="space-y-1.5 relative">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                    <MapPin size={10} /> CEP (Busca Automática)
                  </label>
                  <div className="relative">
                    <input 
                      placeholder="00000-000"
                      className="w-full border border-gray-200 p-3 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50"
                      value={editingCustomer?.zipCode || ''}
                      onChange={e => handleCepLookup(e.target.value)}
                    />
                    {isCepLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" size={18} />}
                  </div>
                </div>
                <div className="space-y-1.5 mt-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Endereço Completo</label>
                  <textarea 
                    rows={2}
                    className="w-full border border-gray-200 p-3 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50 resize-none text-sm"
                    value={editingCustomer?.address || ''}
                    onChange={e => setEditingCustomer({...editingCustomer, address: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-10 pt-6 border-t border-gray-50">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-gray-400 hover:text-gray-900 text-xs uppercase tracking-widest">Sair</button>
              <button onClick={handleSave} className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 active:scale-95 uppercase text-xs tracking-widest">Salvar Cliente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManager;
