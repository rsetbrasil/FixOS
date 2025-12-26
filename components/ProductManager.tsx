
import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Package, Tag, DollarSign, Box, X } from 'lucide-react';
import { db } from '../utils/storage';
import { Product } from '../types';

const ProductManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      const data = await db.getProducts();
      setProducts(data);
      setLoading(false);
    };
    loadProducts();
  }, []);

  const formatBRL = (val: number = 0) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleCurrencyInput = (value: string, setter: (num: number) => void) => {
    const digits = value.replace(/\D/g, '');
    const cents = parseInt(digits || '0');
    setter(cents / 100);
  };

  const handleSave = async () => {
    if (!editingProduct?.name) return;
    const newProduct = {
      ...editingProduct,
      id: editingProduct.id || Math.random().toString(36).substr(2, 9),
      stock: Number(editingProduct.stock || 0),
      price: Number(editingProduct.price || 0),
      cost: Number(editingProduct.cost || 0),
    } as Product;

    await db.updateProduct(newProduct);
    const updated = await db.getProducts();
    setProducts(updated);
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este item do catálogo?')) {
      const remaining = products.filter(p => p.id !== id);
      await db.saveProducts(remaining);
      setProducts(remaining);
    }
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inputClass = "w-full border border-gray-300 p-2.5 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all";

  if (loading) return <div className="p-20 text-center font-bold text-gray-300 animate-pulse">CARREGANDO PRODUTOS...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Catálogo de Produtos e Serviços</h2>
          <p className="text-sm text-gray-500">Gerencie peças de reposição e serviços de mão de obra.</p>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou categoria..." 
              className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { setEditingProduct({ category: 'Peças', stock: 0, price: 0, cost: 0 }); setIsModalOpen(true); }}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-bold shadow-sm transition-all active:scale-95"
          >
            <Plus size={18} /> Novo Item
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500 text-sm font-medium">
              <th className="pb-3 px-2">Item</th>
              <th className="pb-3 px-2">Categoria</th>
              <th className="pb-3 px-2 text-right">Custo</th>
              <th className="pb-3 px-2 text-right">Venda</th>
              <th className="pb-3 px-2 text-center">Estoque</th>
              <th className="pb-3 px-2 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-4 px-2">
                  <div className="font-bold text-gray-900">{p.name}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{p.sku || 'SEM SKU'}</div>
                </td>
                <td className="py-4 px-2">
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase">
                    {p.category}
                  </span>
                </td>
                <td className="py-4 px-2 text-right text-gray-500 text-sm">
                  R$ {p.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-4 px-2 text-right font-bold text-indigo-600">
                  R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-4 px-2 text-center">
                  <span className={`font-bold ${p.stock < 3 && p.category !== 'Serviços' ? 'text-red-500' : 'text-gray-700'}`}>
                    {p.category === 'Serviços' ? '∞' : p.stock}
                  </span>
                </td>
                <td className="py-4 px-2">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl border border-gray-100 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-gray-900">{editingProduct?.id ? 'Editar' : 'Novo'} Item</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Nome do Produto/Serviço</label>
                <input 
                  placeholder="Ex: Tela iPhone 11 Original" 
                  className={inputClass}
                  value={editingProduct?.name || ''}
                  onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Categoria</label>
                  <select 
                    className={inputClass}
                    value={editingProduct?.category || 'Peças'}
                    onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                  >
                    <option value="Peças">Peças</option>
                    <option value="Serviços">Mão de Obra / Serviço</option>
                    <option value="Acessórios">Acessórios</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">SKU / Código</label>
                  <input 
                    placeholder="Opcional" 
                    className={inputClass}
                    value={editingProduct?.sku || ''}
                    onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Preço de Custo</label>
                  <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg px-3 focus-within:ring-2 focus-within:ring-indigo-500">
                    <span className="text-gray-400 text-sm font-bold">R$</span>
                    <input 
                      type="text"
                      className="w-full p-2.5 bg-transparent outline-none text-right font-bold text-gray-700"
                      value={formatBRL(editingProduct?.cost)}
                      onChange={e => handleCurrencyInput(e.target.value, (val) => setEditingProduct({...editingProduct, cost: val}))}
                    />
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Preço de Venda</label>
                  <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg px-3 focus-within:ring-2 focus-within:ring-indigo-500">
                    <span className="text-gray-400 text-sm font-bold">R$</span>
                    <input 
                      type="text"
                      className="w-full p-2.5 bg-transparent outline-none text-right font-bold text-indigo-600"
                      value={formatBRL(editingProduct?.price)}
                      onChange={e => handleCurrencyInput(e.target.value, (val) => setEditingProduct({...editingProduct, price: val}))}
                    />
                  </div>
                </div>
              </div>

              {editingProduct?.category !== 'Serviços' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Estoque Atual</label>
                  <input 
                    type="number"
                    placeholder="Quantidade" 
                    className={inputClass}
                    value={editingProduct?.stock || 0}
                    onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-600 font-bold">Cancelar</button>
              <button onClick={handleSave} className="px-10 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                Salvar Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;
