
import React, { useState, useEffect } from 'react';
import { Search, Tablet, Edit2, Trash2, Plus, User, Info, Smartphone, X } from 'lucide-react';
import { db } from '../utils/storage';
import { Equipment, Customer } from '../types';

const EquipmentManager: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEq, setEditingEq] = useState<Partial<Equipment> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eqData, custData] = await Promise.all([
        db.getEquipment(),
        db.getCustomers()
      ]);
      setEquipment(eqData || []);
      setCustomers(custData || []);
    } catch (err) {
      console.error("Erro ao carregar equipamentos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingEq?.model || !editingEq?.customerId) {
      alert("Por favor, preencha o modelo e selecione um cliente.");
      return;
    }

    const newEq = {
      ...editingEq,
      id: editingEq.id || Math.random().toString(36).substr(2, 9),
    } as Equipment;

    await db.addEquipment(newEq);
    await loadData();
    setIsModalOpen(false);
    setEditingEq(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este equipamento? Isso não removerá as ordens de serviço vinculadas, mas pode causar inconsistências.')) {
      const remaining = equipment.filter(e => e.id !== id);
      await db.saveEquipment(remaining);
      await loadData();
    }
  };

  const filtered = equipment.filter(e => {
    const cust = customers.find(c => c.id === e.customerId);
    const custName = cust?.name || '';
    const search = searchTerm.toLowerCase();
    return e.brand.toLowerCase().includes(search) || 
           e.model.toLowerCase().includes(search) || 
           (e.serialNumber && e.serialNumber.toLowerCase().includes(search)) ||
           custName.toLowerCase().includes(search);
  });

  const inputClass = "w-full border border-gray-300 p-3 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all text-sm";
  const labelClass = "block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-wider";

  if (loading) return <div className="p-20 text-center font-black text-indigo-600 animate-pulse uppercase tracking-[0.2em]">Sincronizando Equipamentos...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner">
            <Smartphone size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Equipamentos dos Clientes</h2>
            <p className="text-gray-500 text-sm font-medium">Histórico e gestão de aparelhos vinculados aos seus clientes.</p>
          </div>
        </div>
        <button 
          onClick={() => { setEditingEq({ type: 'Celular' }); setIsModalOpen(true); }}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 transition-all shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 active:scale-95 text-xs uppercase tracking-widest"
        >
          <Plus size={22} /> NOVO EQUIPAMENTO
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar por Marca, Modelo, Serial ou Cliente..." 
              className="pl-12 pr-6 py-3 border border-gray-200 rounded-2xl w-full bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-50 outline-none transition-all text-sm font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/30 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-50">
                <th className="py-5 px-8">Equipamento</th>
                <th className="py-5 px-4">Proprietário</th>
                <th className="py-5 px-4">Serial / IMEI</th>
                <th className="py-5 px-8 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {filtered.map(eq => {
                const customer = customers.find(c => c.id === eq.customerId);
                return (
                  <tr key={eq.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="py-6 px-8">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-gray-100 rounded-lg text-gray-400 group-hover:bg-white group-hover:text-indigo-600 transition-colors">
                          <Tablet size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-gray-900 uppercase">{eq.brand} {eq.model}</span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{eq.type}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-4">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-gray-300" />
                        <span className="font-bold text-gray-600 uppercase">
                          {customer ? customer.name : <span className="text-red-300 text-[10px] font-black italic">Não Identificado</span>}
                        </span>
                      </div>
                    </td>
                    <td className="py-6 px-4">
                      <span className="font-mono text-[10px] bg-slate-100 px-3 py-1 rounded-md text-slate-500 font-black tracking-widest uppercase">
                        {eq.serialNumber || 'SEM SERIAL'}
                      </span>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setEditingEq(eq); setIsModalOpen(true); }} className="p-2.5 text-gray-400 hover:text-indigo-600 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-90"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(eq.id)} className="p-2.5 text-gray-400 hover:text-red-600 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-90"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <Smartphone className="mx-auto text-slate-200 mb-2" size={32}/>
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Nenhum equipamento cadastrado ou encontrado.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md p-10 border border-white/20 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-50">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">{editingEq?.id ? 'Editar' : 'Novo'} Equipamento</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-300 hover:text-red-500 transition-all p-2 bg-gray-50 rounded-2xl"><X size={24} /></button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className={labelClass}>Cliente Proprietário</label>
                <select 
                  className={inputClass + " font-bold"}
                  value={editingEq?.customerId || ''}
                  onChange={e => setEditingEq({...editingEq, customerId: e.target.value})}
                >
                  <option value="">Selecione o Cliente</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Tipo de Aparelho</label>
                  <input 
                    placeholder="Ex: Celular, Tablet..." 
                    className={inputClass + " font-bold"}
                    value={editingEq?.type || ''}
                    onChange={e => setEditingEq({...editingEq, type: e.target.value})}
                  />
                </div>
                <div>
                  <label className={labelClass}>Marca</label>
                  <input 
                    placeholder="Ex: Samsung, Apple..." 
                    className={inputClass + " font-bold"}
                    value={editingEq?.brand || ''}
                    onChange={e => setEditingEq({...editingEq, brand: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Modelo / Versão</label>
                <input 
                  placeholder="Ex: Galaxy S23 Ultra" 
                  className={inputClass + " font-bold"}
                  value={editingEq?.model || ''}
                  onChange={e => setEditingEq({...editingEq, model: e.target.value})}
                />
              </div>

              <div>
                <label className={labelClass}>Número de Série / IMEI</label>
                <input 
                  placeholder="Identificador exclusivo" 
                  className={inputClass + " font-mono uppercase"}
                  value={editingEq?.serialNumber || ''}
                  onChange={e => setEditingEq({...editingEq, serialNumber: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-10 pt-6 border-t border-gray-50">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-black text-slate-400 hover:text-gray-900 transition-all text-[10px] uppercase tracking-widest">Cancelar</button>
              <button onClick={handleSave} className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 text-[10px] uppercase tracking-widest">Salvar Equipamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentManager;
