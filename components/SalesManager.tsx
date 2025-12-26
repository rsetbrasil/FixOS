
import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Search, Plus, Trash2, CheckCircle, 
  User, CreditCard, Banknote, Package, X, MessageSquare,
  Zap
} from 'lucide-react';
import { db } from '../utils/storage';
import { Product, Customer, Sale, SaleItem } from '../types';

const SalesManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Dinheiro');
  const [isProcessing, setIsProcessing] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState<Sale | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const [p, c] = await Promise.all([db.getProducts(), db.getCustomers()]);
      setProducts(p.filter(prod => prod.category !== 'Serviços'));
      setCustomers(c);
    };
    loadData();
  }, []);

  const addToCart = (product: Product) => {
    const existing = cart.find(i => i.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        alert("Estoque insuficiente!");
        return;
      }
      setCart(cart.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      if (product.stock <= 0) {
        alert("Produto sem estoque!");
        return;
      }
      setCart([...cart, { productId: product.id, quantity: 1, priceAtTime: Number(product.price) }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(i => i.productId !== productId));
  };

  const calculateTotal = () => cart.reduce((acc, item) => acc + (Number(item.priceAtTime) * item.quantity), 0);

  const handleFinalizeSale = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    const newSale: Sale = {
      id: Math.random().toString(36).substr(2, 9),
      customerId: selectedCustomerId || undefined,
      items: cart,
      total: calculateTotal(),
      paymentMethod,
      createdAt: new Date().toISOString()
    };

    try {
      await db.addSale(newSale);
      for (const item of cart) {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          await db.updateProduct({ ...prod, stock: Number(prod.stock) - item.quantity });
        }
      }
      setSaleSuccess(newSale);
      setCart([]);
      setSelectedCustomerId('');
      const p = await db.getProducts();
      setProducts(p.filter(prod => prod.category !== 'Serviços'));
    } catch (e) {
      alert("Erro ao finalizar venda.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              placeholder="Pesquisar produto no catálogo..." 
              className="w-full pl-12 pr-6 py-4 bg-slate-100 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.map(p => (
              <button 
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.stock <= 0}
                className="group p-4 bg-white border border-slate-200 rounded-2xl text-left hover:border-blue-500 hover:shadow-lg transition-all disabled:opacity-50"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase">{p.category}</span>
                  <span className={`text-[10px] font-bold ${Number(p.stock) < 5 ? 'text-red-500' : 'text-emerald-600'}`}>{p.stock} un.</span>
                </div>
                <h4 className="font-bold text-slate-900 group-hover:text-blue-600 truncate">{p.name}</h4>
                <p className="text-xl font-black text-slate-900 mt-2">R$ {Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm flex flex-col min-h-[600px]">
          <div className="flex items-center gap-3 mb-8">
            <ShoppingCart className="text-blue-600" />
            <h3 className="text-xl font-black text-slate-900">Finalização de Venda</h3>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {cart.map(item => {
              const p = products.find(prod => prod.id === item.productId);
              return (
                <div key={item.productId} className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center group border border-slate-100">
                  <div>
                    <p className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{p?.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{item.quantity}x R$ {item.priceAtTime.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-blue-600">R$ {(Number(item.quantity) * item.priceAtTime).toFixed(2)}</span>
                    <button onClick={() => removeFromCart(item.productId)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><X size={18} /></button>
                  </div>
                </div>
              );
            })}
            {cart.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 opacity-20">
                <Package size={48} className="mb-2 text-slate-900" />
                <p className="font-black text-slate-900">Carrinho Vazio</p>
              </div>
            )}
          </div>

          <div className="mt-8 space-y-6 pt-8 border-t border-slate-100">
            <div className="space-y-4">
               <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cliente Vinculado</label>
                <select 
                  className="bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 outline-none"
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">Venda Rápida (Sem Cadastro)</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Método de Pagamento</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Dinheiro', 'Cartão', 'Pix'].map(m => (
                    <button 
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`py-3 rounded-xl font-black text-[10px] uppercase transition-all ${paymentMethod === m ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-end bg-slate-50 p-6 rounded-3xl border border-slate-200">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Subtotal</p>
                <p className="text-4xl font-black text-slate-900">R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <button 
                onClick={handleFinalizeSale}
                disabled={cart.length === 0 || isProcessing}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isProcessing ? 'Finalizando...' : 'Concluir'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {saleSuccess && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6 z-[60]">
          <div className="bg-white rounded-[40px] p-10 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Venda Concluída!</h3>
            <p className="text-slate-500 text-sm mb-8 font-medium">O registro foi processado e o estoque atualizado com sucesso.</p>
            <button 
              onClick={() => setSaleSuccess(null)}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-lg shadow-blue-100"
            >
              Nova Venda
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesManager;
