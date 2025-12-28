
import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Package, Tag, DollarSign, Box, X, Wrench, AlertCircle } from 'lucide-react';
import { db } from '../utils/storage';
import { Product } from '../types';

interface ProductManagerProps {
  mode?: 'products' | 'services';
}

const ProductManager: React.FC<ProductManagerProps> = ({ mode = 'products' }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [mode]);

  const loadData = async () => {
    setLoading(true);
    const data = await db.getProducts();
    // Filtra baseado no modo da página
    if (mode === 'services') {
      setProducts(data.filter(p => p.category === 'Serviços'));
    } else {
      setProducts(data.filter(p => p.category !== 'Serviços'));
    }
    setLoading(false);
  };

  const formatBRL = (val: number = 0) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleCurrencyInput = (value: string, setter: (num: number) => void) => {
    const digits = value.replace(/\D/g, '');
    const cents = parseInt(digits || '0');
    setter(cents / 100);
  };

  const handleSave = async () => {
    if (!editingProduct?.name) return alert("O nome é obrigatório.");
    const newProduct = {
      ...editingProduct,
      id: editingProduct.id || Math.random().toString(36).substr(2, 9),
      stock: mode === 'services' ? 0 : Number(editingProduct.stock || 0),
      price: Number(editingProduct.price || 0),
      cost: Number(editingProduct.cost || 0),
      category: mode === 'services' ? 'Serviços' : (editingProduct.category || 'Peças')
    } as Product;

    await db.updateProduct(newProduct);
    await loadData();
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este item?')) {
      const allProducts = await db.getProducts();
      const remaining = allProducts.filter(p => p.id !== id);
      await db.saveProducts(remaining);
      await loadData();
    }
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inputClass = "w-full border border-slate-200 p-4 rounded-2xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-700 text-sm";
  const labelClass = "block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest px-1";

  if (loading) return (
    <div className="p-20 text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-4"></div>
      <p className="font-black text-indigo-600 uppercase tracking-widest text-xs">Sincronizando {mode === 'services' ? 'Serviços' : 'Estoque'}...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 gap-6">
        <div className="flex items-center gap-5">
          <div className={`p-4 rounded-3xl shadow-inner ${mode === 'services' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
            {mode === 'services' ? <Wrench size={32} /> : <Package size={32} />}
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {mode === 'services' ? 'Serviços Técnicos' : 'Estoque de Peças'}
            </h2>
            <p className="text-slate-500 text-sm font-medium">
              {mode === 'services' ? 'Gerencie os valores de mão de obra e serviços prestados pela assistência.' : 'Controle de componentes, acessórios e peças de reposição.'}
            </p>
          </div>
        </div>
        <button 
          onClick={() => { 
            setEditingProduct({ category: mode === 'services' ? 'Serviços' : 'Peças', stock: 0, price: 0, cost: 0 }); 
            setIsModalOpen(true); 
          }}
          className={`${mode === 'services' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-black shadow-xl transition-all active:scale-95 uppercase text-xs tracking-widest`}
        >
          <Plus size={20} /> Novo {mode === 'services' ? 'Serviço' : 'Produto'}
        </button>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={`Buscar ${mode === 'services' ? 'serviço' : 'peça'}...`} 
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
                <th className="py-5 px-8">Identificação</th>
                {mode === 'products' && <th className="py-5 px-4">Categoria</th>}
                <th className="py-5 px-4 text-right">Custo</th>
                <th className="py-5 px-4 text-right">Venda</th>
                {mode === 'products' && <th className="py-5 px-4 text-center">Estoque</th>}
                <th className="py-5 px-8 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-5 px-8">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{p.name}</span>
                      <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase">{p.sku || 'SEM SKU'}</span>
                    </div>
                  </td>
                  {mode === 'products' && (
                    <td className="py-5 px-4">
                      <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-tighter">
                        {p.category}
                      </span>
                    </td>
                  )}
                  <td className="py-5 px-4 text-right text-slate-500 font-bold text-sm">
                    R$ {formatBRL(p.cost)}
                  </td>
                  <td className={`py-5 px-4 text-right font-black ${mode === 'services' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                    R$ {formatBRL(p.price)}
                  </td>
                  {mode === 'products' && (
                    <td className="py-5 px-4 text-center">
                      <div className={`inline-flex items-center justify-center min-w-[40px] px-2 py-1 rounded-lg font-black text-xs ${p.stock < 3 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-50 text-slate-700 border border-slate-100'}`}>
                        {p.stock}
                      </div>
                    </td>
                  )}
                  <td className="py-5 px-8">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="p-2.5 text-slate-400 hover:text-indigo-600 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-90"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-2.5 text-slate-400 hover:text-red-600 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-90"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <AlertCircle className="mx-auto text-slate-200 mb-2" size={32}/>
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Nenhum registro encontrado.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-lg shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-50">
              <div className="flex items-center gap-3">
                 <div className={`p-3 rounded-2xl ${mode === 'services' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                    {mode === 'services' ? <Wrench size={24}/> : <Package size={24}/>}
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingProduct?.id ? 'Editar' : 'Novo'} {mode === 'services' ? 'Serviço' : 'Produto'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-all p-2 bg-slate-50 rounded-2xl"><X size={24} /></button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className={labelClass}>Nome Descritivo</label>
                <input 
                  placeholder={mode === 'services' ? "Ex: Troca de Tela iPhone 11" : "Ex: Conector de Carga Moto G8"} 
                  className={inputClass}
                  value={editingProduct?.name || ''}
                  onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelClass}>Categoria</label>
                  <select 
                    disabled={mode === 'services'}
                    className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-400`}
                    value={editingProduct?.category || (mode === 'services' ? 'Serviços' : 'Peças')}
                    onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                  >
                    <option value="Peças">Peças</option>
                    <option value="Serviços">Serviços</option>
                    <option value="Acessórios">Acessórios</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>SKU / Código Referência</label>
                  <input 
                    placeholder="Identificador" 
                    className={inputClass}
                    value={editingProduct?.sku || ''}
                    onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelClass}>Preço de Custo (Base)</label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                    <span className="text-slate-400 text-sm font-black mr-2">R$</span>
                    <input 
                      type="text"
                      className="w-full py-4 bg-transparent outline-none text-right font-black text-slate-700 text-sm"
                      value={formatBRL(editingProduct?.cost)}
                      onChange={e => handleCurrencyInput(e.target.value, (val) => setEditingProduct({...editingProduct, cost: val}))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Preço de Venda (Final)</label>
                  <div className={`flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 focus-within:ring-2 focus-within:ring-indigo-500 transition-all`}>
                    <span className="text-slate-400 text-sm font-black mr-2">R$</span>
                    <input 
                      type="text"
                      className={`w-full py-4 bg-transparent outline-none text-right font-black text-sm ${mode === 'services' ? 'text-emerald-600' : 'text-indigo-600'}`}
                      value={formatBRL(editingProduct?.price)}
                      onChange={e => handleCurrencyInput(e.target.value, (val) => setEditingProduct({...editingProduct, price: val}))}
                    />
                  </div>
                </div>
              </div>

              {mode === 'products' && (
                <div className="space-y-1.5">
                  <label className={labelClass}>Quantidade em Estoque</label>
                  <input 
                    type="number"
                    placeholder="0" 
                    className={inputClass}
                    value={editingProduct?.stock || 0}
                    onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4 mt-10 pt-6 border-t border-slate-50">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-slate-400 hover:text-slate-900 transition-all text-xs uppercase tracking-widest">Cancelar</button>
              <button onClick={handleSave} className={`px-10 py-3 ${mode === 'services' ? 'bg-emerald-600' : 'bg-indigo-600'} text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:opacity-90 transition-all active:scale-95 uppercase text-xs tracking-widest`}>
                Salvar Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;
