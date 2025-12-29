
import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Search, Plus, Trash2, CheckCircle, 
  User, CreditCard, Banknote, Package, X, MessageSquare,
  Zap, Wrench, Tag
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
      // Mostra tudo: Peças e Serviços
      setProducts(p);
      setCustomers(c);
    };
    loadData();
  }, []);

  const addToCart = (product: Product) => {
    const isService = product.category === 'Serviços';
    const existing = cart.find(i => i.productId === product.id);
    
    if (existing) {
      // Se não for serviço, valida estoque
      if (!isService && existing.quantity >= product.stock) {
        alert("Estoque insuficiente para este produto!");
        return;
      }
      setCart(cart.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      // Se não for serviço, valida estoque inicial
      if (!isService && product.stock <= 0) {
        alert("Produto sem estoque disponível!");
        return;
      }
      setCart([...cart, { 
        productId: product.id, 
        quantity: 1, 
        priceAtTime: Number(product.price),
        costAtTime: Number(product.cost)
      }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(i => i.productId !== productId));
  };

  const calculateTotal = () => cart.reduce((acc, item) => acc + (item.priceAtTime * item.quantity), 0);
  const calculateTotalCost = () => cart.reduce((acc, item) => acc + (item.costAtTime * item.quantity), 0);

  const handleFinalizeSale = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    const newSale: Sale = {
      id: Math.random().toString(36).substr(2, 9),
      customerId: selectedCustomerId || undefined,
      items: cart,
      total: calculateTotal(),
      totalCost: calculateTotalCost(),
      paymentMethod,
      createdAt: new Date().toISOString()
    };

    try {
      await db.addSale(newSale);
      
      // Atualiza estoque apenas para produtos físicos
      for (const item of cart) {
        const prod = products.find(p => p.id === item.productId);
        if (prod && prod.category !== 'Serviços') {
          await db.updateProduct({ ...prod, stock: Number(prod.stock) - item.quantity });
        }
      }
      
      setSaleSuccess(newSale);
      setCart([]);
      setSelectedCustomerId('');
      
      // Recarrega produtos para atualizar as quantidades na tela
      const p = await db.getProducts();
      setProducts(p);
    } catch (e) {
      console.error(e);
      alert("Erro ao finalizar venda.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              placeholder="Pesquisar produto ou serviço no catálogo..." 
              className="w-full pl-12 pr-6 py-4 bg-slate-100 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.map(p => {
              const isService = p.category === 'Serviços';
              return (
                <button 
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={!isService && p.stock <= 0}
                  className={`group p-4 bg-white border rounded-2xl text-left transition-all active:scale-95 ${!isService && p.stock <= 0 ? 'opacity-50 grayscale' : 'hover:border-blue-500 hover:shadow-lg'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase flex items-center gap-1 ${isService ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                      {isService ? <Wrench size={10}/> : <Package size={10}/>}
                      {p.category}
                    </span>
                    {!isService && (
                      <span className={`text-[10px] font-bold ${Number(p.stock) < 5 ? 'text-red-500' : 'text-slate-400'}`}>
                        {p.stock} em estoque
                      </span>
                    )}
                    {isService && (
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Disponível</span>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-900 group-hover:text-blue-600 truncate">{p.name}</h4>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xl font-black text-slate-900">R$ {Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <span className="text-[9px] font-bold text-slate-400">SKU: {p.sku || 'N/A'}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {filteredProducts.length === 0 && (
            <div className="py-20 text-center text-slate-300">
               <Package size={40} className="mx-auto mb-2 opacity-20"/>
               <p className="text-xs font-black uppercase tracking-widest">Nenhum item encontrado</p>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm flex flex-col min-h-[600px] sticky top-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-blue-600 text-white rounded-2xl">
              <ShoppingCart size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tighter">Carrinho de Venda</h3>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {cart.map(item => {
              const p = products.find(prod => prod.id === item.productId);
              const isService = p?.category === 'Serviços';
              return (
                <div key={item.productId} className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center group border border-slate-100 hover:bg-white hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${isService ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                      {isService ? <Wrench size={16}/> : <Package size={16}/>}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{p?.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{item.quantity}x R$ {item.priceAtTime.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-slate-900">R$ {(item.quantity * item.priceAtTime).toFixed(2)}</span>
                    <button onClick={() => removeFromCart(item.productId)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><X size={18} /></button>
                  </div>
                </div>
              );
            })}
            {cart.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 opacity-20">
                <ShoppingCart size={48} className="mb-2 text-slate-900" />
                <p className="font-black text-slate-900 uppercase text-[10px] tracking-[0.3em]">Carrinho Vazio</p>
              </div>
            )}
          </div>

          <div className="mt-8 space-y-6 pt-8 border-t border-slate-100">
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex justify-between items-center">
               <div className="flex items-center gap-2">
                  <Zap size={16} className="text-emerald-500"/>
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Lucro Estimado</span>
               </div>
               <span className="text-sm font-black text-emerald-700">R$ {(calculateTotal() - calculateTotalCost()).toFixed(2)}</span>
            </div>

            <div className="space-y-4">
               <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cliente Vinculado</label>
                <select 
                  className="bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">Venda Direta (Consumidor Final)</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Forma de Pagamento</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {id: 'Dinheiro', icon: <Banknote size={14}/>}, 
                    {id: 'Cartão', icon: <CreditCard size={14}/>}, 
                    {id: 'Pix', icon: <QrCode size={14}/>}
                  ].map(m => (
                    <button 
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={`py-3 rounded-2xl font-black text-[10px] uppercase transition-all flex flex-col items-center gap-1 ${paymentMethod === m.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 scale-105' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}
                    >
                      {m.icon}
                      {m.id}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-[32px] shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total da Venda</p>
                <p className="text-3xl font-black text-white tracking-tighter">R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <button 
                onClick={handleFinalizeSale}
                disabled={cart.length === 0 || isProcessing}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:opacity-50"
              >
                {isProcessing ? 'PROCESSANDO...' : 'FINALIZAR VENDA'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {saleSuccess && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-[100]">
          <div className="bg-white rounded-[40px] p-10 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tighter">Venda Realizada!</h3>
            <p className="text-slate-500 text-sm mb-8 font-medium">Os itens foram baixados do estoque e o financeiro foi atualizado automaticamente.</p>
            <button 
              onClick={() => setSaleSuccess(null)}
              className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
            >
              FECHAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const QrCode = ({size}: {size: number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>
  </svg>
);

export default SalesManager;
