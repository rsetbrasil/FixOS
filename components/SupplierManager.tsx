
import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Truck, X, Phone, User, Tag } from 'lucide-react';
import { db } from '../utils/storage';
import { Supplier } from '../types';

const SupplierManager: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    const data = await db.getSuppliers();
    setSuppliers(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editingSupplier?.name) return alert("O nome da empresa é obrigatório.");
    
    const newSupplier = {
      ...editingSupplier,
      id: editingSupplier.id || Math.random().toString(36).substr(2, 9),
      name: editingSupplier.name,
      contact: editingSupplier.contact || '',
      phone: editingSupplier.phone || ''
    } as Supplier;

    await db.updateSupplier(newSupplier);
    await loadSuppliers();
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir este fornecedor?')) {
      const updated = suppliers.filter(s => s.id !== id);
      await db.saveSuppliers(updated);
      await loadSuppliers();
    }
  };

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.contact.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inputClass = "w-full border border-slate-200 p-4 rounded-2xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-700 text-sm";
  const labelClass = "block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest px-1";

  if (loading) return <div className="p-20 text-center font-black text-indigo-600 animate-pulse uppercase tracking-[0.2em]">Sincronizando Fornecedores...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl shadow-inner border border-indigo-100">
            <Truck size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Gestão de Fornecedores</h2>
            <p className="text-slate-500 text-sm font-medium">Controle seus parceiros de logística e suprimentos de peças.</p>
          </div>
        </div>
        <button 
          onClick={() => { setEditingSupplier({}); setIsModalOpen(true); }}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 uppercase text-xs tracking-widest"
        >
          <Plus size={20} /> NOVO FORNECEDOR
        </button>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar fornecedor por nome ou contato..." 
              className="pl-12 pr-6 py-3 border border-slate-200 rounded-2xl w-full focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/50 text-sm font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-50">
                <th className="py-5 px-8">Fornecedor</th>
                <th className="py-5 px-4">Pessoa de Contato</th>
                <th className="py-5 px-4">WhatsApp / Fone</th>
                <th className="py-5 px-8 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-indigo-50/20 transition-colors group">
                  <td className="py-5 px-8">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 uppercase">{s.name}</span>
                      <span className="text-[10px] text-slate-400 font-black tracking-widest">ID: {s.id.slice(-6).toUpperCase()}</span>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-slate-400" />
                      <span className="text-slate-600 font-bold">{s.contact || '—'}</span>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-slate-400" />
                      <span className="text-slate-600 font-bold">{s.phone || '—'}</span>
                    </div>
                  </td>
                  <td className="py-5 px-8">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setEditingSupplier(s); setIsModalOpen(true); }} className="p-2.5 text-slate-400 hover:text-indigo-600 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-90"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(s.id)} className="p-2.5 text-slate-400 hover:text-red-600 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-90"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <div className="opacity-10 mb-4 flex justify-center"><Truck size={48} /></div>
                    <p className="text-slate-300 font-black uppercase text-xs tracking-[0.2em]">Nenhum fornecedor encontrado</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-md shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-50">
              <div className="flex items-center gap-3">
                 <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Truck size={24}/></div>
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingSupplier?.id ? 'Editar' : 'Novo'} Fornecedor</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-all p-2 bg-slate-50 rounded-2xl"><X size={24} /></button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className={labelClass}>Nome da Empresa / Fantasia</label>
                <input 
                  placeholder="Ex: Distribuidora de Peças Tech" 
                  className={inputClass}
                  value={editingSupplier?.name || ''}
                  onChange={e => setEditingSupplier({...editingSupplier, name: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Pessoa de Contato / Vendedor</label>
                <input 
                  placeholder="Nome do contato principal" 
                  className={inputClass}
                  value={editingSupplier?.contact || ''}
                  onChange={e => setEditingSupplier({...editingSupplier, contact: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Telefone / WhatsApp</label>
                <input 
                  placeholder="(00) 00000-0000" 
                  className={inputClass}
                  value={editingSupplier?.phone || ''}
                  onChange={e => setEditingSupplier({...editingSupplier, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-10 pt-6 border-t border-slate-50">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-slate-400 hover:text-gray-900 transition-all text-xs uppercase tracking-widest">Cancelar</button>
              <button onClick={handleSave} className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 uppercase text-xs tracking-widest">
                Salvar Fornecedor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManager;
