
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Eye, Search,
  X, Printer, Smartphone, User, ClipboardList, CheckSquare,
  MessageSquare, CheckCircle, Send, UserPlus,
  Trash, Zap, DollarSign, Check, MessageCircle, Download, FileText,
  PackagePlus, CreditCard, Banknote, QrCode, Wrench, Package,
  AlertCircle, TrendingDown
} from 'lucide-react';
import { db } from '../utils/storage';
import { OrderStatus, PaymentStatus, ServiceOrder, Customer, Equipment, Product, Occurrence, BusinessInfo } from '../types';
import { STATUS_COLORS } from '../constants';

const ServiceOrderManager: React.FC = () => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Partial<ServiceOrder>>({});
  
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [addingType, setAddingType] = useState<'peça' | 'serviço'>('peça');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [tempPaymentMethod, setTempPaymentMethod] = useState<string>('Dinheiro');

  const printFrameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [o, c, e, p, b] = await Promise.all([
        db.getOrders(), db.getCustomers(), db.getEquipment(), db.getProducts(), db.getBusinessInfo()
      ]);
      setOrders(o || []); 
      setCustomers(c || []); 
      setEquipment(e || []); 
      setProducts(p || []); 
      setBusinessInfo(b);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const itemsRevenue = (currentOrder.items || []).reduce((acc, item) => acc + (item.priceAtTime * item.quantity), 0);
    const itemsCost = (currentOrder.items || []).reduce((acc, item) => acc + (item.costAtTime * item.quantity), 0);
    const laborRevenue = currentOrder.laborCost || 0;
    const laborCost = currentOrder.laborCostBase || 0; 
    const diagFee = currentOrder.diagnosisFee || 0;

    return {
      revenue: itemsRevenue + laborRevenue + diagFee,
      cost: itemsCost + laborCost
    };
  };

  const handleAddItemToOS = (p: Product) => {
    const newItem = {
      productId: p.id,
      quantity: 1,
      priceAtTime: p.price,
      costAtTime: p.cost
    };
    setCurrentOrder(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
    setIsAddingItem(false);
  };

  const handleRemoveItemFromOS = (idx: number) => {
    setCurrentOrder(prev => ({
      ...prev,
      items: (prev.items || []).filter((_, i) => i !== idx)
    }));
  };

  const handleSave = async (isClosing?: boolean, paymentMethod?: string) => {
    if (!currentOrder.customerId) return alert("Selecione um cliente.");
    if (!currentOrder.equipmentId) return alert("Selecione um equipamento.");

    const totals = calculateTotals();
    const maxOrderNumber = orders.length > 0 ? Math.max(...orders.map(o => o.orderNumber)) : 1000;
    
    let status = currentOrder.status || OrderStatus.ENTRY;
    let paymentStatus = currentOrder.paymentStatus || PaymentStatus.PENDING;
    
    if (isClosing) { 
      status = OrderStatus.DELIVERED; 
      paymentStatus = PaymentStatus.PAID; 
    }
    
    const orderToSave = {
      ...currentOrder,
      status,
      paymentStatus,
      paymentMethod: paymentMethod || currentOrder.paymentMethod,
      id: currentOrder.id || Math.random().toString(36).substr(2, 9),
      orderNumber: currentOrder.orderNumber || (maxOrderNumber + 1),
      createdAt: currentOrder.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      total: totals.revenue,
      totalCost: totals.cost,
      items: currentOrder.items || [],
      history: [...(currentOrder.history || []), { 
        status, 
        timestamp: new Date().toISOString(), 
        note: isClosing ? `O.S. Entregue e Faturada (${paymentMethod})` : "Registro atualizado" 
      }]
    } as ServiceOrder;

    await db.updateOrder(orderToSave);
    await loadAllData();
    setIsModalOpen(false);
    setIsPaymentModalOpen(false);
    alert(isClosing ? "O.S. faturada com sucesso!" : "Alterações salvas.");
  };

  const handlePrintOS = async (order: Partial<ServiceOrder>) => {
    if (!order.id) return;
    
    // Pegar dados sincronizados no momento do clique
    const cust = customers.find(c => c.id === order.customerId);
    const eq = equipment.find(e => e.id === order.equipmentId);
    const biz = businessInfo || { name: 'FIXOS ASSISTÊNCIA', cnpj: '00.000.000/0001-00', phone: '(11) 99999-8493', address: 'Rua das Tecnologias, 101' };
    
    // Obter termos (tratando erro se o banco falhar)
    let terms = "Garantia de 90 dias conforme CDC.";
    try {
        terms = order.status === OrderStatus.DELIVERED ? await db.getTermsExit() : await db.getTermsEntry();
    } catch (e) { console.error("Erro termos:", e); }

    const itemsHtml = (order.items || []).map(item => {
      const p = products.find(prod => prod.id === item.productId);
      return `<tr><td>${p?.name || 'Item'}</td><td style="text-align: center;">${item.quantity}</td><td style="text-align: right;">R$ ${item.priceAtTime.toFixed(2)}</td><td style="text-align: right;">R$ ${(item.quantity * item.priceAtTime).toFixed(2)}</td></tr>`;
    }).join('');

    const content = `
      <html>
        <head>
          <title>Impressão O.S. #${order.orderNumber}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 25px; color: #1e293b; line-height: 1.5; font-size: 11px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 15px; }
            .biz-info h1 { margin: 0; font-size: 20px; font-weight: 900; }
            .os-badge { text-align: right; }
            .os-number { font-size: 24px; font-weight: 900; margin: 0; color: #000; }
            .section { margin-bottom: 12px; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; }
            .section-title { font-weight: 900; text-transform: uppercase; font-size: 8px; color: #64748b; margin-bottom: 5px; border-bottom: 1px solid #f1f5f9; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 5px 0; }
            th { background: #f8fafc; text-align: left; padding: 6px; font-size: 8px; text-transform: uppercase; border: 1px solid #e2e8f0; }
            td { padding: 6px; border: 1px solid #e2e8f0; }
            .totals { text-align: right; margin-top: 10px; }
            .total-line { font-size: 14px; font-weight: 900; color: #000; }
            .signature { margin-top: 40px; display: flex; justify-content: space-around; }
            .sig-box { border-top: 1px solid #000; width: 180px; text-align: center; padding-top: 5px; font-weight: bold; }
            @media print { body { padding: 0; } .header { border-bottom-color: #000; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="biz-info"><h1>${biz.name}</h1><p>${biz.cnpj}<br>${biz.address}<br>Whats: ${biz.phone}</p></div>
            <div class="os-badge"><p class="os-number">O.S. #${order.orderNumber}</p><p>Data: ${new Date(order.createdAt || '').toLocaleDateString('pt-BR')}<br>Status: <strong>${order.status}</strong></p></div>
          </div>
          <div class="grid">
            <div class="section"><div class="section-title">Cliente</div><strong>${cust?.name || 'Não informado'}</strong><br>Doc: ${cust?.document || '---'}<br>Tel: ${cust?.phone || '---'}</div>
            <div class="section"><div class="section-title">Equipamento</div><strong>${eq?.brand} ${eq?.model}</strong><br>Série: ${eq?.serialNumber || '---'}<br>Tipo: ${eq?.type || 'Aparelho'}</div>
          </div>
          <div class="section"><div class="section-title">Observações Técnicas</div><p style="margin:0">${order.problemDescription || 'Nenhuma observação.'}</p></div>
          <div class="section">
            <div class="section-title">Peças e Serviços</div>
            <table><thead><tr><th>Descrição</th><th style="text-align: center;">Qtd</th><th style="text-align: right;">Unit.</th><th style="text-align: right;">Subtotal</th></tr></thead><tbody>${itemsHtml || '<tr><td colspan="4" style="text-align:center;">Sem itens</td></tr>'}</tbody></table>
            <div class="totals">
              <p style="margin:2px">M.O.: R$ ${(order.laborCost || 0).toFixed(2)} | Diag.: R$ ${(order.diagnosisFee || 0).toFixed(2)}</p>
              <p class="total-line">VALOR TOTAL: R$ ${(order.total || 0).toFixed(2)}</p>
            </div>
          </div>
          <div class="section"><div class="section-title">Termos</div><div style="font-size: 8px; white-space: pre-wrap;">${terms}</div></div>
          <div class="signature"><div class="sig-box">Assinatura do Cliente</div><div class="sig-box">Responsável Técnico</div></div>
        </body>
      </html>
    `;

    // Metodo de Impressão via Window Temporária (Mais robusto para preview/modais)
    const win = window.open('', '_blank', 'width=800,height=900');
    if (win) {
      win.document.write(content);
      win.document.close();
      win.focus();
      // Pequeno delay para garantir renderização das fontes/estilos
      setTimeout(() => {
        win.print();
        win.close();
      }, 500);
    } else {
      alert("Bloqueador de pop-ups ativado! Permita pop-ups para imprimir.");
    }
  };

  const totals = calculateTotals();
  const filteredItemsForModal = products.filter(p => addingType === 'serviço' ? p.category === 'Serviços' : p.category !== 'Serviços');

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center">
        <button onClick={() => { setCurrentOrder({ status: OrderStatus.ENTRY, laborCost: 0, diagnosisFee: 0, laborCostBase: 0, items: [], checklist: {}, occurrences: [] }); setIsViewMode(false); setIsModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 uppercase tracking-widest shadow-lg active:scale-95 transition-all">
          <Plus size={18} /> Nova O.S.
        </button>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input placeholder="Buscar por O.S. ou Nome..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="p-5">O.S.</th>
              <th className="p-5">Cliente / Aparelho</th>
              <th className="p-5">Entrada</th>
              <th className="p-5 text-right">Valor</th>
              <th className="p-5 text-center">Status</th>
              <th className="p-5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.filter(o => o.orderNumber.toString().includes(searchTerm) || customers.find(c => c.id === o.customerId)?.name.toLowerCase().includes(searchTerm.toLowerCase())).map(order => {
              const cust = customers.find(c => c.id === order.customerId);
              const eq = equipment.find(e => e.id === order.equipmentId);
              return (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors text-xs font-bold">
                  <td className="p-5 text-slate-400">#{order.orderNumber}</td>
                  <td className="p-5">
                    <div className="flex flex-col">
                      <span className="text-slate-900 uppercase">{cust?.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{eq?.brand} {eq?.model}</span>
                    </div>
                  </td>
                  <td className="p-5 text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="p-5 text-right text-slate-900 font-black">R$ {order.total.toFixed(2)}</td>
                  <td className="p-5 text-center">
                    <span className={`px-3 py-1 rounded-full text-[9px] uppercase font-black border ${STATUS_COLORS[order.status]}`}>{order.status}</span>
                  </td>
                  <td className="p-5 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setCurrentOrder(order); setIsViewMode(true); setIsModalOpen(true); }} className="p-2 bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors" title="Visualizar"><Eye size={14}/></button>
                      <button onClick={() => { setCurrentOrder(order); setIsViewMode(false); setIsModalOpen(true); }} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors" title="Editar"><Edit2 size={14}/></button>
                      <button onClick={() => handlePrintOS(order)} className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors" title="Imprimir"><Printer size={14}/></button>
                      <button onClick={() => { const c = customers.find(cust => cust.id === order.customerId); if(c?.phone) window.open(`https://api.whatsapp.com/send?phone=55${c.phone.replace(/\D/g, '')}`, '_blank'); }} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors" title="WhatsApp"><MessageCircle size={14}/></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[40px] w-full max-w-6xl shadow-2xl relative my-auto animate-in zoom-in-95 duration-200">
            <div className="p-10">
              <div className="flex justify-between items-center mb-10 pb-4 border-b">
                <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tighter">O.S. #{currentOrder.orderNumber || 'NOVA'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X size={24}/></button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Lado Esquerdo - Cadastro e Itens */}
                <div className="lg:col-span-8 space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1 tracking-widest">Cliente</label>
                      <select disabled={isViewMode} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={currentOrder.customerId || ''} onChange={e => setCurrentOrder({...currentOrder, customerId: e.target.value})}>
                        <option value="">Selecione o Cliente...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1 tracking-widest">Aparelho</label>
                      <select disabled={isViewMode} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={currentOrder.equipmentId || ''} onChange={e => setCurrentOrder({...currentOrder, equipmentId: e.target.value})}>
                        <option value="">Selecione o Equipamento...</option>
                        {equipment.filter(eq => eq.customerId === currentOrder.customerId).map(eq => <option key={eq.id} value={eq.id}>{eq.brand} {eq.model}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                      <label className="text-[10px] font-black uppercase text-slate-400 block tracking-widest">Itens e Serviços</label>
                      {!isViewMode && (
                        <div className="flex gap-3">
                          <button onClick={() => { setAddingType('peça'); setIsAddingItem(true); }} className="flex items-center gap-2 text-[10px] font-black text-indigo-600 bg-white border border-indigo-100 px-4 py-2 rounded-xl uppercase tracking-widest shadow-sm hover:shadow-md transition-all">
                            <Package size={14}/> + Peça
                          </button>
                          <button onClick={() => { setAddingType('serviço'); setIsAddingItem(true); }} className="flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-white border border-emerald-100 px-4 py-2 rounded-xl uppercase tracking-widest shadow-sm hover:shadow-md transition-all">
                            <Wrench size={14}/> + Serviço
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {(currentOrder.items || []).map((item, idx) => {
                        const p = products.find(prod => prod.id === item.productId);
                        const isService = p?.category === 'Serviços';
                        return (
                          <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center text-xs shadow-sm">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-xl ${isService ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'}`}>{isService ? <Wrench size={16}/> : <Package size={16}/>}</div>
                              <div>
                                <p className="font-black text-slate-900">{p?.name}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase">{isService ? 'Serviço' : 'Peça'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="text-slate-900 font-black">R$ {item.priceAtTime.toFixed(2)}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Custo: R$ {item.costAtTime.toFixed(2)}</p>
                              </div>
                              {!isViewMode && <button onClick={() => handleRemoveItemFromOS(idx)} className="p-2 text-slate-300 hover:text-red-500 transition-all"><Trash size={16}/></button>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1 tracking-widest">Relato do Problema / Observações</label>
                     <textarea disabled={isViewMode} className="w-full bg-slate-50 border border-slate-200 p-6 rounded-[24px] text-sm font-bold h-32 outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" placeholder="Descreva o problema aqui..." value={currentOrder.problemDescription || ''} onChange={e => setCurrentOrder({...currentOrder, problemDescription: e.target.value})} />
                  </div>
                </div>

                {/* Sidebar Direita - Status e Financeiro */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-indigo-50/50 p-6 rounded-[24px] border border-indigo-100">
                    <label className="text-[10px] font-black uppercase text-indigo-400 block mb-2 px-1 tracking-widest">Status Atual</label>
                    <select disabled={isViewMode} className="w-full bg-white p-4 rounded-xl border border-indigo-200 text-xs font-black text-indigo-700 outline-none shadow-sm" value={currentOrder.status || OrderStatus.ENTRY} onChange={e => setCurrentOrder({...currentOrder, status: e.target.value as OrderStatus})}>
                      {Object.values(OrderStatus).map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>

                  <div className="bg-slate-900 p-8 rounded-[32px] text-white space-y-8 shadow-2xl">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-6">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Receita Total</span>
                      <p className="text-3xl font-black tracking-tighter">R$ {totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mão de Obra</span>
                        <div className="flex items-center bg-slate-800 rounded-xl px-3 border border-slate-700">
                          <span className="text-slate-500 text-[9px] font-bold mr-1">R$</span>
                          <input disabled={isViewMode} type="number" className="w-20 p-2 bg-transparent text-right font-black outline-none text-white text-xs" value={currentOrder.laborCost || 0} onChange={e => setCurrentOrder({...currentOrder, laborCost: Number(e.target.value)})} />
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Taxa Diag.</span>
                        <div className="flex items-center bg-slate-800 rounded-xl px-3 border border-slate-700">
                          <span className="text-slate-500 text-[9px] font-bold mr-1">R$</span>
                          <input disabled={isViewMode} type="number" className="w-20 p-2 bg-transparent text-right font-black outline-none text-white text-xs" value={currentOrder.diagnosisFee || 0} onChange={e => setCurrentOrder({...currentOrder, diagnosisFee: Number(e.target.value)})} />
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-800">
                      <div className="p-5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex justify-between items-center shadow-inner">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Lucro Bruto</span>
                        <span className="text-2xl font-black text-emerald-400">R$ {(totals.revenue - totals.cost).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-[24px] border border-slate-200 space-y-4 shadow-sm">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Técnico Responsável</label>
                      <input disabled={isViewMode} className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={currentOrder.technician || ''} onChange={e => setCurrentOrder({...currentOrder, technician: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Dias de Garantia</label>
                      <input disabled={isViewMode} type="number" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={currentOrder.warrantyDays || 90} onChange={e => setCurrentOrder({...currentOrder, warrantyDays: Number(e.target.value)})} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex justify-end gap-3 pt-8 border-t border-slate-100">
                <button onClick={() => handlePrintOS(currentOrder)} className="flex items-center gap-2 bg-slate-800 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 hover:bg-slate-900 transition-all shadow-lg">
                  <Printer size={18}/> Imprimir Relatório
                </button>
                {!isViewMode ? (
                  <>
                    <button onClick={() => handleSave(false)} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 hover:bg-indigo-700 transition-all">Salvar O.S.</button>
                    <button onClick={() => setIsPaymentModalOpen(true)} className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-100 active:scale-95 hover:bg-emerald-700 transition-all">Entregar e Faturar</button>
                  </>
                ) : (
                  <button onClick={() => setIsModalOpen(false)} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase active:scale-95 transition-all">Fechar</button>
                )}
              </div>
            </div>

            {/* Sub-modal de Faturamento */}
            {isPaymentModalOpen && (
              <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center p-6 z-[100] rounded-[40px]">
                <div className="bg-white rounded-[32px] p-10 w-full max-w-sm shadow-2xl text-center border border-slate-100 animate-in zoom-in-95">
                   <h4 className="text-xl font-black uppercase text-slate-900 mb-6 tracking-tighter">Finalizar Recebimento</h4>
                   <div className="bg-emerald-50 p-8 rounded-3xl mb-8 border border-emerald-100">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total à Receber</p>
                      <p className="text-4xl font-black text-emerald-900">R$ {totals.revenue.toFixed(2)}</p>
                   </div>
                   <div className="space-y-3">
                      {['Dinheiro', 'Pix', 'Cartão'].map(m => (
                        <button key={m} onClick={() => setTempPaymentMethod(m)} className={`w-full p-4 rounded-2xl border font-black text-xs uppercase tracking-widest transition-all ${tempPaymentMethod === m ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-[1.02]' : 'bg-white border-slate-200 text-slate-500'}`}>{m}</button>
                      ))}
                   </div>
                   <button onClick={() => handleSave(true, tempPaymentMethod)} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest mt-8 shadow-2xl active:scale-95 hover:bg-emerald-600 transition-all">Confirmar Faturamento</button>
                   <button onClick={() => setIsPaymentModalOpen(false)} className="mt-4 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-600">Voltar para Edição</button>
                </div>
              </div>
            )}

            {/* Seleção de Peças/Serviços */}
            {isAddingItem && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6 z-[90] rounded-[40px]">
                <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-slate-100">
                   <div className="flex justify-between items-center mb-6 pb-4 border-b">
                      <h4 className="text-lg font-black uppercase text-slate-900 tracking-tighter">Adicionar {addingType}</h4>
                      <button onClick={() => setIsAddingItem(false)} className="p-2 bg-slate-50 rounded-full"><X size={20}/></button>
                   </div>
                   <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                     {filteredItemsForModal.map(p => (
                       <button key={p.id} onClick={() => handleAddItemToOS(p)} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center hover:bg-white hover:border-indigo-400 transition-all text-xs font-black text-slate-800 shadow-sm">
                         <div className="text-left">
                            <p className="uppercase">{p.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold">{p.category}</p>
                         </div>
                         <span className="text-indigo-600">R$ {p.price.toFixed(2)}</span>
                       </button>
                     ))}
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrderManager;
