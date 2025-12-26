
import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Filter, ChevronDown, Eye, Search,
  X, Save, Printer, Smartphone, User, ClipboardList, ShoppingBag, Sparkles, CheckSquare, Square,
  MessageSquare, CheckCircle, Clock, AlertCircle, RefreshCw, Send, UserPlus, MonitorSmartphone,
  PackagePlus, Trash, Zap, DollarSign, CreditCard, QrCode, RotateCcw, Receipt, MoreHorizontal,
  Calendar, UserCog, Tag as TagIcon, Tablet, Laptop, Watch, Tv
} from 'lucide-react';
import { db } from '../utils/storage';
import { OrderStatus, PaymentStatus, ServiceOrder, Customer, Equipment, Product, BusinessInfo } from '../types';
import { STATUS_COLORS } from '../constants';

const ServiceOrderManager: React.FC = () => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Partial<ServiceOrder>>({});
  
  // Estados para cadastros rápidos dentro da O.S.
  const [isNewEquip, setIsNewEquip] = useState(false);
  const [tempEquip, setTempEquip] = useState({ brand: '', model: '', serialNumber: '', type: 'Smartphone' });
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', document: '' });

  const EQUIP_TYPES = ['Smartphone', 'Notebook', 'Tablet', 'Smartwatch', 'Console', 'Monitor', 'Impressora', 'Outros'];

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [o, c, e, p] = await Promise.all([
        db.getOrders(), db.getCustomers(), db.getEquipment(), db.getProducts()
      ]);
      setOrders(o || []); 
      setCustomers(c || []); 
      setEquipment(e || []); 
      setProducts(p || []); 
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatBRL = (val: number = 0) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleCurrencyInput = (value: string, setter: (num: number) => void) => {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '');
    const cents = parseInt(digits || '0');
    // Transforma em decimal (ex: 5000 -> 50.00)
    setter(cents / 100);
  };

  const handleQuickCustomerSave = async () => {
    if (!newCust.name || !newCust.phone) return alert("Preencha Nome e WhatsApp");
    const customer: Customer = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCust.name,
      phone: newCust.phone,
      document: newCust.document,
      email: '',
      address: ''
    };
    await db.updateCustomer(customer);
    const updatedCusts = await db.getCustomers();
    setCustomers(updatedCusts);
    setCurrentOrder(prev => ({ ...prev, customerId: customer.id }));
    setIsAddingCustomer(false);
    setNewCust({ name: '', phone: '', document: '' });
  };

  const handlePrint = async (order: ServiceOrder) => {
    const biz = await db.getBusinessInfo();
    const customer = customers.find(c => c.id === order.customerId);
    const eq = equipment.find(e => e.id === order.equipmentId);
    
    // Lógica Dinâmica de Termos baseada no Status solicitado
    let terms = '';
    let termTitle = 'TERMOS DE RESPONSABILIDADE:';

    if (order.status === OrderStatus.BUDGET) {
      terms = await db.getTermsBudget();
      termTitle = 'TERMOS DE ORÇAMENTO:';
    } else if (order.status === OrderStatus.FINISHED || order.status === OrderStatus.DELIVERED) {
      terms = await db.getTermsExit();
      termTitle = 'TERMOS DE SAÍDA / GARANTIA:';
    } else {
      terms = await db.getTermsEntry();
      termTitle = 'TERMOS DE ENTRADA:';
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = (order.items || []).map(item => {
      const p = products.find(prod => prod.id === item.productId);
      return `<tr><td style="padding: 5px 0;">${p?.name || 'Item'}</td><td style="padding: 5px 0; text-align: right;">R$ ${item.priceAtTime.toFixed(2)}</td><td style="padding: 5px 0; text-align: right;">R$ ${(item.quantity * item.priceAtTime).toFixed(2)}</td></tr>`;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>ORDEM DE SERVIÇO #${order.orderNumber}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Inter', sans-serif; color: #000; font-size: 10px; margin: 0; padding: 0; line-height: 1.2; }
            .container { max-width: 190mm; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
            .biz-info h1 { margin: 0; font-size: 20px; font-weight: 900; }
            .biz-info p { margin: 2px 0; color: #444; font-size: 9px; }
            .os-info { text-align: right; }
            .os-info .os-label { font-size: 8px; font-weight: bold; color: #666; margin: 0; }
            .os-info .os-number { font-size: 28px; font-weight: 900; margin: 0; line-height: 1; }
            .os-info .os-date { font-size: 11px; font-weight: bold; margin-top: 5px; }
            .section { border: 1px solid #ddd; border-radius: 4px; padding: 8px; margin-bottom: 10px; }
            .section-label { font-size: 7px; font-weight: 900; color: #555; text-transform: uppercase; margin-bottom: 5px; display: block; border-bottom: 1px solid #eee; padding-bottom: 3px; }
            .data-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .data-field strong { display: block; font-size: 7px; color: #777; text-transform: uppercase; }
            .data-field span { font-size: 10px; font-weight: bold; display: block; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            th { text-align: left; font-size: 8px; font-weight: 900; text-transform: uppercase; border-bottom: 1.5px solid #000; padding: 4px 0; }
            td { border-bottom: 1px solid #eee; padding: 4px 0; font-size: 9px; }
            .summary { margin-top: 10px; text-align: right; }
            .total-row { display: flex; justify-content: flex-end; gap: 20px; margin-top: 10px; border-top: 2px solid #000; padding-top: 5px; align-items: baseline; }
            .total-label, .total-value { font-size: 18px; font-weight: 900; }
            .terms { font-size: 7.5px; color: #333; text-align: justify; margin-top: 15px; border: 1px solid #eee; padding: 8px; border-radius: 4px; line-height: 1.4; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
            .sig-box { border-top: 1.5px solid #000; width: 45%; text-align: center; padding-top: 5px; font-size: 8px; font-weight: 900; text-transform: uppercase; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="container">
            <div class="header">
              <div class="biz-info"><h1>${biz.name}</h1><p>CNPJ/CPF: ${biz.cnpj} | Fone/WhatsApp: ${biz.phone}</p><p>${biz.address}</p></div>
              <div class="os-info"><p class="os-label">ORDEM DE SERVIÇO</p><p class="os-number">#${order.orderNumber}</p><p class="os-date">${new Date(order.createdAt).toLocaleString('pt-BR')}</p></div>
            </div>
            <div class="section"><span class="section-label">Dados do Cliente</span><div class="data-row"><div class="data-field"><strong>Nome</strong><span>${customer?.name || '---'}</span></div><div class="data-field"><strong>WhatsApp</strong><span>${customer?.phone || '---'}</span></div></div></div>
            <div class="section"><span class="section-label">Dados do Equipamento</span><div class="data-row"><div class="data-field"><strong>Marca / Modelo</strong><span>${eq?.brand} ${eq?.model}</span></div><div class="data-field"><strong>Nº de Série</strong><span>${eq?.serialNumber || 'N/A'}</span></div><div class="data-field"><strong>Acessórios</strong><span>${order.accessories || 'NENHUM'}</span></div></div></div>
            <div class="section"><span class="section-label">Defeito / Diagnóstico</span><div style="font-weight: bold;">${order.problemDescription || '---'}</div></div>
            <div class="section">
              <span class="section-label">Produtos e Serviços</span>
              <table><thead><tr><th style="width: 60%">Descrição</th><th style="text-align: right;">Valor Unit.</th><th style="text-align: right;">Total</th></tr></thead>
              <tbody>
                ${order.laborCost > 0 ? `<tr><td>MÃO DE OBRA</td><td style="text-align: right;">R$ ${order.laborCost.toFixed(2)}</td><td style="text-align: right;">R$ ${order.laborCost.toFixed(2)}</td></tr>` : ''}
                ${order.diagnosisFee > 0 ? `<tr><td>TAXA DE DIAGNÓSTICO</td><td style="text-align: right;">R$ ${order.diagnosisFee.toFixed(2)}</td><td style="text-align: right;">R$ ${order.diagnosisFee.toFixed(2)}</td></tr>` : ''}
                ${itemsHtml}
              </tbody></table>
              <div class="summary">
                <div class="total-row"><span class="total-label">VALOR TOTAL</span><span class="total-value">R$ ${order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
              </div>
            </div>
            <div class="terms"><strong>${termTitle}</strong><br>${terms}</div>
            <div class="signatures"><div class="sig-box">Assinatura do Cliente</div><div class="sig-box">Responsável</div></div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const calculateTotal = () => {
    const itemsTotal = (currentOrder.items || []).reduce((acc, item) => acc + (item.priceAtTime * item.quantity), 0);
    return (currentOrder.laborCost || 0) + (currentOrder.diagnosisFee || 0) + itemsTotal;
  };

  const handleSave = async (isClosing?: boolean) => {
    if (!currentOrder.customerId) return alert("Selecione um cliente.");

    let finalEquipId = currentOrder.equipmentId;

    try {
      if (isNewEquip) {
        if (!tempEquip.brand || !tempEquip.model) return alert("Preencha Marca e Modelo do equipamento.");
        const newEq = {
          id: Math.random().toString(36).substr(2, 9),
          customerId: currentOrder.customerId,
          ...tempEquip
        } as Equipment;
        await db.addEquipment(newEq);
        finalEquipId = newEq.id;
        await loadAllData(); 
      }

      if (!finalEquipId) return alert("Selecione ou cadastre um equipamento.");

      const maxOrderNumber = orders.length > 0 ? Math.max(...orders.map(o => o.orderNumber)) : 1000;
      let status = currentOrder.status || OrderStatus.ENTRY;
      let paymentStatus = currentOrder.paymentStatus || PaymentStatus.PENDING;

      if (isClosing) {
        status = OrderStatus.DELIVERED;
        paymentStatus = PaymentStatus.PAID;
      }

      const orderToSave = {
        ...currentOrder,
        equipmentId: finalEquipId,
        status,
        paymentStatus,
        diagnosisFee: currentOrder.diagnosisFee || 0,
        id: currentOrder.id || Math.random().toString(36).substr(2, 9),
        orderNumber: currentOrder.orderNumber || (maxOrderNumber + 1),
        createdAt: currentOrder.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        total: calculateTotal(),
        history: [...(currentOrder.history || []), { status, timestamp: new Date().toISOString(), note: "Registro salvo/atualizado" }]
      } as ServiceOrder;

      await db.updateOrder(orderToSave);
      await loadAllData();
      setIsModalOpen(false);
      setIsNewEquip(false);
      alert("O.S. Processada com sucesso!");
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center">
        <button onClick={() => { setCurrentOrder({ status: OrderStatus.ENTRY, laborCost: 0, diagnosisFee: 0, items: [] }); setIsViewMode(false); setIsModalOpen(true); setIsNewEquip(false); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-100 uppercase tracking-widest">
          <Plus size={18} /> Nova O.S.
        </button>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input placeholder="Buscar O.S., Cliente ou Modelo..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="p-4">O.S.</th>
              <th className="p-4">Cliente / Aparelho</th>
              <th className="p-4">Entrada</th>
              <th className="p-4 text-right">Valor</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.filter(o => o.orderNumber.toString().includes(searchTerm) || customers.find(c => c.id === o.customerId)?.name.toLowerCase().includes(searchTerm.toLowerCase())).map(order => {
              const cust = customers.find(c => c.id === order.customerId);
              const eq = equipment.find(e => e.id === order.equipmentId);
              return (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors text-xs font-bold">
                  <td className="p-4 text-slate-400">#{order.orderNumber}</td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-slate-900 uppercase">{cust?.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{eq?.brand} {eq?.model}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="p-4 text-right text-slate-900">R$ {order.total.toFixed(2)}</td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[9px] uppercase font-black border ${STATUS_COLORS[order.status]}`}>{order.status}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <RowBtn onClick={() => { setCurrentOrder(order); setIsViewMode(true); setIsModalOpen(true); }} color="bg-slate-100 text-slate-400"><Eye size={14}/></RowBtn>
                      <RowBtn onClick={() => { setCurrentOrder(order); setIsViewMode(false); setIsModalOpen(true); }} color="bg-blue-500 text-white"><Edit2 size={14}/></RowBtn>
                      <RowBtn onClick={() => handlePrint(order)} color="bg-amber-500 text-white"><Printer size={14}/></RowBtn>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-10 border border-white/20 relative">
            <div className="flex justify-between items-center mb-8 pb-4 border-b">
               <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">
                 {isViewMode ? 'Visualizar' : currentOrder.id ? 'Editar' : 'Nova'} Ordem de Serviço {currentOrder.orderNumber ? `#${currentOrder.orderNumber}` : ''}
               </h3>
               <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"><X size={24}/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">Selecione o Cliente</label>
                  <div className="flex gap-2">
                    <select disabled={isViewMode} className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500" value={currentOrder.customerId || ''} onChange={e => setCurrentOrder({...currentOrder, customerId: e.target.value})}>
                      <option value="">Selecione...</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {!isViewMode && (
                      <button onClick={() => setIsAddingCustomer(true)} type="button" title="Cadastrar Novo Cliente" className="p-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 active:scale-95 transition-all shadow-md">
                        <UserPlus size={20}/>
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase text-slate-400 block px-1">Equipamento</label>
                    {!isViewMode && (
                      <button onClick={() => setIsNewEquip(!isNewEquip)} className={`text-[10px] font-black uppercase px-3 py-1 rounded-full transition-all ${isNewEquip ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {isNewEquip ? 'Cancelar Novo' : '+ Equipamento Novo'}
                      </button>
                    )}
                  </div>

                  {!isNewEquip ? (
                    <select disabled={isViewMode} className="w-full bg-white p-4 rounded-2xl border border-slate-200 text-sm font-bold" value={currentOrder.equipmentId || ''} onChange={e => setCurrentOrder({...currentOrder, equipmentId: e.target.value})}>
                      <option value="">Selecione Equipamento...</option>
                      {equipment.filter(eq => eq.customerId === currentOrder.customerId).map(eq => <option key={eq.id} value={eq.id}>{eq.brand} {eq.model} ({eq.serialNumber})</option>)}
                    </select>
                  ) : (
                    <div className="space-y-3 animate-in slide-in-from-top-2 p-1">
                       <div className="grid grid-cols-2 gap-2">
                         <div className="col-span-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Tipo de Aparelho</label>
                           <select className="w-full bg-white p-3 rounded-xl border text-sm font-bold outline-none focus:border-amber-500" value={tempEquip.type} onChange={e => setTempEquip({...tempEquip, type: e.target.value})}>
                             {EQUIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                           </select>
                         </div>
                         <input className="w-full bg-white p-3 rounded-xl border text-sm font-bold outline-none focus:border-amber-500" placeholder="Marca (Ex: Apple)" value={tempEquip.brand} onChange={e => setTempEquip({...tempEquip, brand: e.target.value})} />
                         <input className="w-full bg-white p-3 rounded-xl border text-sm font-bold outline-none focus:border-amber-500" placeholder="Modelo (Ex: iPhone 13)" value={tempEquip.model} onChange={e => setTempEquip({...tempEquip, model: e.target.value})} />
                       </div>
                       <input className="w-full bg-white p-3 rounded-xl border text-sm font-bold outline-none focus:border-amber-500" placeholder="Número de Série / IMEI" value={tempEquip.serialNumber} onChange={e => setTempEquip({...tempEquip, serialNumber: e.target.value})} />
                    </div>
                  )}
                  <input disabled={isViewMode} className="w-full bg-white p-3 rounded-xl border text-sm font-bold" placeholder="Acessórios Deixados..." value={currentOrder.accessories || ''} onChange={e => setCurrentOrder({...currentOrder, accessories: e.target.value})} />
                </div>

                <div>
                   <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">Relatado pelo Cliente / Diagnóstico</label>
                   <textarea disabled={isViewMode} className="w-full bg-slate-50 border p-4 rounded-2xl text-sm font-bold h-32 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="O aparelho não liga..." value={currentOrder.problemDescription || ''} onChange={e => setCurrentOrder({...currentOrder, problemDescription: e.target.value})} />
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                  <label className="text-[10px] font-black uppercase text-indigo-400 block mb-2">Controle de Status</label>
                  <select disabled={isViewMode} className="w-full bg-white p-4 rounded-2xl border border-indigo-200 text-sm font-black text-indigo-700" value={currentOrder.status || OrderStatus.ENTRY} onChange={e => setCurrentOrder({...currentOrder, status: e.target.value as OrderStatus})}>
                    {Object.values(OrderStatus).map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>

                <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100">
                   <div className="flex justify-between items-center mb-6">
                      <span className="text-[10px] font-black uppercase text-emerald-600">Total da Ordem</span>
                      <span className="text-3xl font-black text-emerald-900 tracking-tighter">R$ {calculateTotal().toFixed(2)}</span>
                   </div>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase">Mão de Obra</span>
                        <div className="flex items-center bg-white border rounded-xl px-3 focus-within:ring-2 focus-within:ring-emerald-500">
                          <span className="text-slate-400 text-xs font-bold mr-1">R$</span>
                          <input 
                            disabled={isViewMode} 
                            type="text" 
                            className="w-24 p-2 bg-transparent text-right font-black outline-none" 
                            value={formatBRL(currentOrder.laborCost)} 
                            onChange={e => handleCurrencyInput(e.target.value, (val) => setCurrentOrder({...currentOrder, laborCost: val}))} 
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase">Taxa de Diagnóstico</span>
                        <div className="flex items-center bg-white border rounded-xl px-3 focus-within:ring-2 focus-within:ring-emerald-500">
                          <span className="text-slate-400 text-xs font-bold mr-1">R$</span>
                          <input 
                            disabled={isViewMode} 
                            type="text" 
                            className="w-24 p-2 bg-transparent text-right font-black outline-none" 
                            value={formatBRL(currentOrder.diagnosisFee)} 
                            onChange={e => handleCurrencyInput(e.target.value, (val) => setCurrentOrder({...currentOrder, diagnosisFee: val}))} 
                          />
                        </div>
                      </div>
                      <div className="pt-4 border-t border-emerald-100">
                        <p className="text-[9px] font-black text-emerald-400 uppercase mb-2">Pagamento</p>
                        <select disabled={isViewMode} className="w-full bg-white p-3 rounded-xl border border-emerald-200 text-xs font-bold" value={currentOrder.paymentStatus || PaymentStatus.PENDING} onChange={e => setCurrentOrder({...currentOrder, paymentStatus: e.target.value as PaymentStatus})}>
                           <option value={PaymentStatus.PENDING}>Pendente</option>
                           <option value={PaymentStatus.PAID}>Pago</option>
                           <option value={PaymentStatus.PARTIAL}>Parcial</option>
                        </select>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-[10px] font-black text-slate-400 block mb-1">Técnico Responsável</label>
                     <input disabled={isViewMode} className="w-full bg-slate-50 p-3 rounded-xl border text-xs font-bold" value={currentOrder.technician || ''} onChange={e => setCurrentOrder({...currentOrder, technician: e.target.value})} />
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-slate-400 block mb-1">Garantia (Dias)</label>
                     <input disabled={isViewMode} type="number" className="w-full bg-slate-50 p-3 rounded-xl border text-xs font-bold" value={currentOrder.warrantyDays || 90} onChange={e => setCurrentOrder({...currentOrder, warrantyDays: Number(e.target.value)})} />
                   </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end gap-3 pt-8 border-t">
               {!isViewMode ? (
                 <>
                   <button onClick={() => handleSave(false)} className="bg-slate-800 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-slate-200">Salvar O.S.</button>
                   {currentOrder.id && (
                    <button onClick={() => handleSave(true)} className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200">Finalizar e Entregar</button>
                   )}
                 </>
               ) : (
                 <button onClick={() => handlePrint(currentOrder as ServiceOrder)} className="bg-amber-500 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2"><Printer size={18}/> Imprimir Documento</button>
               )}
            </div>

            {isAddingCustomer && (
              <div className="absolute inset-0 bg-slate-900/95 flex items-center justify-center p-6 z-[60] rounded-[32px] animate-in fade-in duration-200">
                <div className="bg-white rounded-[40px] p-8 w-full max-w-md shadow-2xl border border-white/20">
                   <div className="flex justify-between items-center mb-6">
                      <h4 className="text-xl font-black uppercase text-slate-900">Novo Cliente Rápido</h4>
                      <button onClick={() => setIsAddingCustomer(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20}/></button>
                   </div>
                   <div className="space-y-4">
                      <input className="w-full bg-slate-50 border p-4 rounded-2xl text-sm font-bold" placeholder="Nome do Cliente" value={newCust.name} onChange={e => setNewCust({...newCust, name: e.target.value})} />
                      <input className="w-full bg-slate-50 border p-4 rounded-2xl text-sm font-bold" placeholder="WhatsApp (Ex: 11999999999)" value={newCust.phone} onChange={e => setNewCust({...newCust, phone: e.target.value})} />
                      <input className="w-full bg-slate-50 border p-4 rounded-2xl text-sm font-bold" placeholder="CPF/CNPJ" value={newCust.document} onChange={e => setNewCust({...newCust, document: e.target.value})} />
                      <button onClick={handleQuickCustomerSave} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-100 mt-4">Confirmar Cadastro</button>
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

const RowBtn = ({ children, color, onClick }: any) => (
  <button onClick={onClick} className={`p-2 rounded-lg transition-all active:scale-90 hover:brightness-90 flex items-center justify-center ${color}`}>
    {children}
  </button>
);

export default ServiceOrderManager;
