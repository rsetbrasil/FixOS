
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Eye, Search,
  X, Printer, Smartphone, User, ClipboardList, CheckSquare,
  MessageSquare, CheckCircle, Send, UserPlus,
  Trash, Zap, DollarSign, Check, MessageCircle, Download, FileText,
  PackagePlus, CreditCard, Banknote, QrCode, Wrench, Package,
  AlertCircle, TrendingDown, Camera, Image as ImageIcon, RefreshCcw,
  Clock, Info, AlertTriangle
} from 'lucide-react';
import { db } from '../utils/storage';
import { OrderStatus, PaymentStatus, ServiceOrder, Customer, Equipment, Product, Occurrence, BusinessInfo } from '../types';
import { STATUS_COLORS } from '../constants';
import { generateTechnicalReport } from '../services/gemini';

const ServiceOrderManager: React.FC = () => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [defaultChecklist, setDefaultChecklist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Partial<ServiceOrder>>({});
  
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [addingType, setAddingType] = useState<'peça' | 'serviço'>('peça');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [tempPaymentMethod, setTempPaymentMethod] = useState<string>('Dinheiro');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Estados para cadastros rápidos
  const [isQuickCustomerModal, setIsQuickCustomerModal] = useState(false);
  const [isQuickEquipmentModal, setIsQuickEquipmentModal] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({ name: '', phone: '', document: '', address: '' });
  const [quickEquipment, setQuickEquipment] = useState({ brand: '', model: '', serialNumber: '', type: 'Smartphone' });

  // Nova ocorrência
  const [newOccurrenceText, setNewOccurrenceText] = useState('');

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [o, c, e, p, b, cl] = await Promise.all([
        db.getOrders(), db.getCustomers(), db.getEquipment(), db.getProducts(), db.getBusinessInfo(), db.getChecklist()
      ]);
      setOrders(o || []); 
      setCustomers(c || []); 
      setEquipment(e || []); 
      setProducts(p || []); 
      setBusinessInfo(b);
      setDefaultChecklist(cl || []);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNewOS = () => {
    const checklistInitial: Record<string, boolean> = {};
    defaultChecklist.forEach(item => checklistInitial[item] = false);
    
    setCurrentOrder({ 
      status: OrderStatus.ENTRY, 
      laborCost: 0, 
      diagnosisFee: 0, 
      laborCostBase: 0, 
      items: [], 
      photos: [], 
      problemDescription: '', 
      technicalReport: '', 
      technician: '', 
      warrantyDays: 90,
      checklist: checklistInitial,
      occurrences: [],
      history: []
    });
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleQuickCustomerSave = async () => {
    if (!quickCustomer.name || !quickCustomer.phone) return alert("Preencha nome e telefone.");
    const id = Math.random().toString(36).substr(2, 9);
    const newCust: Customer = { 
      id, 
      name: quickCustomer.name, 
      phone: quickCustomer.phone, 
      document: quickCustomer.document, 
      address: quickCustomer.address,
      email: '' 
    };
    await db.updateCustomer(newCust);
    await loadAllData();
    setCurrentOrder(prev => ({ ...prev, customerId: id }));
    setIsQuickCustomerModal(false);
    setQuickCustomer({ name: '', phone: '', document: '', address: '' });
  };

  const handleQuickEquipmentSave = async () => {
    if (!currentOrder.customerId) return alert("Selecione um cliente primeiro.");
    if (!quickEquipment.model) return alert("Preencha o modelo.");
    const id = Math.random().toString(36).substr(2, 9);
    const newEq: Equipment = { id, customerId: currentOrder.customerId as string, ...quickEquipment };
    await db.addEquipment(newEq);
    await loadAllData();
    setCurrentOrder(prev => ({ ...prev, equipmentId: id }));
    setIsQuickEquipmentModal(false);
    setQuickEquipment({ brand: '', model: '', serialNumber: '', type: 'Smartphone' });
  };

  const calculateTotals = (orderData: Partial<ServiceOrder>) => {
    const itemsRevenue = (orderData.items || []).reduce((acc, item) => acc + (Number(item.priceAtTime || 0) * Number(item.quantity || 1)), 0);
    const itemsCost = (orderData.items || []).reduce((acc, item) => acc + (Number(item.costAtTime || 0) * Number(item.quantity || 1)), 0);
    const laborRevenue = Number(orderData.laborCost) || 0;
    const laborCostBase = Number(orderData.laborCostBase) || 0; 
    const diagFee = Number(orderData.diagnosisFee) || 0;

    return { 
      revenue: Number(itemsRevenue + laborRevenue + diagFee) || 0,
      cost: Number(itemsCost + laborCostBase) || 0
    };
  };

  const handleAddItemToOS = (p: Product) => {
    const newItem = {
      productId: p.id,
      quantity: 1,
      priceAtTime: Number(p.price) || 0,
      costAtTime: Number(p.cost) || 0
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

  const handleAddOccurrence = () => {
    if (!newOccurrenceText.trim()) return;
    const occ: Occurrence = {
      id: Math.random().toString(36).substr(2, 9),
      description: newOccurrenceText,
      timestamp: new Date().toISOString(),
      type: 'Informação'
    };
    setCurrentOrder(prev => ({
      ...prev,
      occurrences: [occ, ...(prev.occurrences || [])]
    }));
    setNewOccurrenceText('');
  };

  const handleToggleChecklist = (item: string) => {
    if (isViewMode) return;
    setCurrentOrder(prev => ({
      ...prev,
      checklist: {
        ...(prev.checklist || {}),
        [item]: !prev.checklist?.[item]
      }
    }));
  };

  const handleGenerateAIReport = async () => {
    if (!currentOrder.problemDescription) return alert("Descreva o problema primeiro.");
    setIsGeneratingReport(true);
    try {
      const suggestion = await generateTechnicalReport(currentOrder.problemDescription);
      setCurrentOrder(prev => ({ ...prev, technicalReport: suggestion }));
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSendWhatsApp = async (order: Partial<ServiceOrder>) => {
    const cust = customers.find(c => c.id === order.customerId);
    const eq = equipment.find(e => e.id === order.equipmentId);
    if (!cust || !cust.phone) return alert("Cliente sem telefone.");
    const msgs = await db.getStatusMessages();
    let template = msgs[order.status || OrderStatus.ENTRY] || `Olá, sua O.S. #${order.orderNumber} está no status: ${order.status}`;
    const message = template
      .replace(/{{cliente}}/g, cust.name)
      .replace(/{{os}}/g, (order.orderNumber || '---').toString())
      .replace(/{{aparelho}}/g, `${eq?.brand || ''} ${eq?.model || ''}`)
      .replace(/{{status}}/g, order.status || '')
      .replace(/{{valor}}/g, (order.total || 0).toFixed(2));
    const phone = cust.phone.replace(/\D/g, '');
    window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSave = async (isClosing?: boolean, paymentMethod?: string) => {
    if (!currentOrder.customerId || !currentOrder.equipmentId) return alert("Cliente e Aparelho são obrigatórios.");
    
    const totals = calculateTotals(currentOrder);
    const maxOrderNumber = orders.length > 0 ? Math.max(...orders.map(o => o.orderNumber)) : 1000;
    
    let status = currentOrder.status || OrderStatus.ENTRY;
    let paymentStatus = currentOrder.paymentStatus || PaymentStatus.PENDING;
    
    if (isClosing) { 
      status = OrderStatus.DELIVERED; 
      paymentStatus = PaymentStatus.PAID; 
    }
    
    const fixedId = currentOrder.id || Math.random().toString(36).substr(2, 9);
    
    const orderToSave: ServiceOrder = {
      ...currentOrder,
      id: fixedId,
      status,
      paymentStatus,
      paymentMethod: paymentMethod || currentOrder.paymentMethod || '',
      orderNumber: currentOrder.orderNumber || (maxOrderNumber + 1),
      createdAt: currentOrder.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      total: Number(totals.revenue) || 0,
      totalCost: Number(totals.cost) || 0,
      items: currentOrder.items || [],
      photos: currentOrder.photos || [],
      laborCost: Number(currentOrder.laborCost) || 0,
      laborCostBase: Number(currentOrder.laborCostBase) || 0,
      diagnosisFee: Number(currentOrder.diagnosisFee) || 0,
      technician: currentOrder.technician || '',
      warrantyDays: Number(currentOrder.warrantyDays) || 90,
      history: [...(currentOrder.history || []), { 
        status, 
        timestamp: new Date().toISOString(),
        note: isClosing ? "Finalizado e Entregue" : "O.S. Atualizada"
      }]
    } as ServiceOrder;

    try {
      await db.updateOrder(orderToSave);
      await loadAllData();
      if (isClosing) {
        setIsModalOpen(false);
        setIsPaymentModalOpen(false);
      }
      alert("✅ Ordem de Serviço #" + orderToSave.orderNumber + " salva com sucesso!");
    } catch (err) {
      console.error("Save Error:", err);
      alert("❌ Erro técnico ao salvar. Verifique o console.");
    }
  };

  const handlePrintOS = async (order: Partial<ServiceOrder>) => {
    if (!order.id) return alert("Salve a O.S. antes de imprimir.");
    const cust = customers.find(c => c.id === order.customerId);
    const eq = equipment.find(e => e.id === order.equipmentId);
    const biz = businessInfo || { name: 'FIXOS ASSISTÊNCIA', phone: '', address: '', cnpj: '' };
    
    let terms = "GARANTIA DE 90 DIAS.";
    try {
      if (order.status === OrderStatus.DELIVERED) {
        terms = await db.getTermsExit();
      } else if (order.status === OrderStatus.BUDGET) {
        terms = await db.getTermsBudget();
      } else {
        terms = await db.getTermsEntry();
      }
      if (typeof terms !== 'string') terms = "Garantia de 90 dias conforme CDC.";
    } catch (e) { console.error(e); }

    const win = window.open('', '_blank');
    if (!win) return alert("Pop-up bloqueado.");

    win.document.write(`
      <html>
        <head>
          <title>O.S. #${order.orderNumber}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            @page { size: A4; margin: 0; }
            body { font-family: 'Inter', sans-serif; color: #000; margin: 0; padding: 40px; line-height: 1.3; font-size: 10px; background-color: #fff; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; }
            .biz-details h1 { margin: 0; font-size: 22px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: -1px; }
            .biz-details p { margin: 2px 0; color: #4b5563; font-weight: 500; font-size: 9px; }
            .os-header-info { text-align: right; }
            .os-header-info h2 { font-size: 24px; font-weight: 800; margin: 0; color: #000; }
            .os-header-meta { margin-top: 5px; font-weight: 600; font-size: 9px; color: #4b5563; }
            .os-status-bold { color: #000; font-weight: 800; text-transform: uppercase; }
            .top-separator { border-top: 2px solid #000; margin: 5px 0 20px 0; }
            .side-by-side-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; align-items: stretch; }
            .section-box { border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; display: flex; flex-direction: column; background-color: #fff; }
            .full-width-box { border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; margin-bottom: 12px; background-color: #fff; }
            .box-label { font-size: 8px; font-weight: 800; text-transform: uppercase; color: #6b7280; margin-bottom: 5px; display: block; letter-spacing: 0.5px; }
            .box-content-main { font-weight: 800; font-size: 11px; color: #000; margin-bottom: 4px; text-transform: uppercase; }
            .box-details-text { font-size: 10px; color: #4b5563; line-height: 1.4; }
            .report-text { font-size: 10px; color: #374151; white-space: pre-wrap; margin-top: 5px; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { text-align: left; padding: 10px 8px; background: #f9fafb; font-weight: 800; font-size: 8px; text-transform: uppercase; color: #374151; border-top: 1px solid #000; border-bottom: 1px solid #e5e7eb; }
            td { padding: 12px 8px; border-bottom: 1px solid #f3f4f6; font-size: 10px; color: #000; }
            .summary-area { display: flex; justify-content: flex-end; margin-top: 5px; flex-direction: column; align-items: flex-end; }
            .summary-box { text-align: right; }
            .summary-row-total { font-size: 16px; font-weight: 900; color: #000; margin-top: 5px; }
            .warranty-note { font-size: 8px; font-weight: 800; color: #6b7280; text-transform: uppercase; margin-top: 2px; }
            .legal-terms { margin-top: 30px; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; background: #fafafa; }
            .legal-terms-content { font-size: 9px; line-height: 1.6; color: #4b5563; white-space: pre-wrap; }
            .signatures-container { display: flex; justify-content: space-between; margin-top: 70px; gap: 50px; }
            .sig-item { flex: 1; text-align: center; border-top: 1px solid #000; padding-top: 10px; }
            .sig-title { font-size: 8px; font-weight: 800; text-transform: uppercase; color: #000; }
            .sig-sub { font-size: 9px; font-weight: 600; margin-top: 2px; text-transform: uppercase; color: #4b5563; }
            .print-footer { position: fixed; bottom: 20px; left: 0; right: 0; text-align: center; font-size: 7px; color: #9ca3af; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="biz-details">
              <h1>${biz.name}</h1>
              <p>${biz.cnpj || '---'}</p>
              <p>${biz.address || '---'}</p>
              <p>Whats: <strong>${biz.phone || '---'}</strong></p>
            </div>
            <div class="os-header-info">
              <h2>O.S. #${order.orderNumber}</h2>
              <div class="os-header-meta">
                DATA: ${new Date(order.createdAt || '').toLocaleDateString('pt-BR')}<br>
                STATUS: <span class="os-status-bold">${order.status}</span>
              </div>
            </div>
          </div>
          <div class="top-separator"></div>
          <div class="side-by-side-grid">
            <div class="section-box">
              <span class="box-label">Cliente</span>
              <div class="box-content-main">${cust?.name}</div>
              <div class="box-details-text">Doc: ${cust?.document || '---'}<br>Tel: ${cust?.phone}</div>
            </div>
            <div class="section-box">
              <span class="box-label">Equipamento</span>
              <div class="box-content-main">${eq?.brand} ${eq?.model}</div>
              <div class="box-details-text">Série: ${eq?.serialNumber || '---'}<br>Tipo: ${eq?.type}</div>
            </div>
          </div>
          <div class="full-width-box">
            <span class="box-label">Observações Técnicas / Relato do Problema</span>
            <div class="report-text">${order.problemDescription || 'Nenhuma observação registrada.'}</div>
          </div>
          <div class="full-width-box">
            <span class="box-label">Laudo Técnico / Reparo Executado</span>
            <div class="report-text">${order.technicalReport || 'Aguardando laudo técnico detalhado.'}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Descrição dos Itens e Serviços</th>
                <th style="text-align: center; width: 40px;">Qtd</th>
                <th style="text-align: right; width: 80px;">V. Unit</th>
                <th style="text-align: right; width: 80px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map(i => `
                <tr>
                  <td style="font-weight: 600;">${products.find(p => p.id === i.productId)?.name || 'Item'}</td>
                  <td style="text-align: center;">${i.quantity}</td>
                  <td style="text-align: right;">R$ ${Number(i.priceAtTime).toFixed(2)}</td>
                  <td style="text-align: right; font-weight: 700;">R$ ${(i.quantity * i.priceAtTime).toFixed(2)}</td>
                </tr>
              `).join('')}
              ${order.laborCost && order.laborCost > 0 ? `<tr><td style="font-weight: 600;">Mão de Obra</td><td style="text-align: center;">1</td><td style="text-align: right;">R$ ${Number(order.laborCost).toFixed(2)}</td><td style="text-align: right; font-weight: 700;">R$ ${Number(order.laborCost).toFixed(2)}</td></tr>` : ''}
              ${order.diagnosisFee && order.diagnosisFee > 0 ? `<tr><td style="font-weight: 600;">Taxa de Diagnóstico</td><td style="text-align: center;">1</td><td style="text-align: right;">R$ ${Number(order.diagnosisFee).toFixed(2)}</td><td style="text-align: right; font-weight: 700;">R$ ${Number(order.diagnosisFee).toFixed(2)}</td></tr>` : ''}
            </tbody>
          </table>
          <div class="summary-area">
            <div class="summary-box">
              <div class="summary-row-total">VALOR TOTAL: R$ ${Number(order.total).toFixed(2)}</div>
              <div class="warranty-note">GARANTIA: ${order.warrantyDays || 90} DIAS</div>
            </div>
          </div>
          <div class="legal-terms">
            <span class="box-label">Termos e Condições</span>
            <div class="legal-terms-content">${terms}</div>
          </div>
          <div class="signatures-container">
            <div class="sig-item">
              <div class="sig-title">Assinatura do Cliente</div>
              <div class="sig-sub">${cust?.name}</div>
            </div>
            <div class="sig-item">
              <div class="sig-title">Responsável Técnico</div>
              <div class="sig-sub">${order.technician || biz.name}</div>
            </div>
          </div>
          <div class="print-footer">Gerado via FixOS ERP</div>
        </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const totals = calculateTotals(currentOrder);
  const filteredProductsForModal = products.filter(p => addingType === 'serviço' ? p.category === 'Serviços' : p.category !== 'Serviços');

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center">
        <button onClick={handleOpenNewOS} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 uppercase tracking-widest shadow-lg active:scale-95 transition-all">
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
                      <span className="text-slate-900 uppercase">{cust?.name || 'Cliente Removido'}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{eq?.brand} {eq?.model}</span>
                    </div>
                  </td>
                  <td className="p-5 text-right text-slate-900 font-black">R$ {Number(order.total).toFixed(2)}</td>
                  <td className="p-5 text-center">
                    <span className={`px-3 py-1 rounded-full text-[9px] uppercase font-black border ${STATUS_COLORS[order.status]}`}>{order.status}</span>
                  </td>
                  <td className="p-5 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setCurrentOrder(order); setIsViewMode(true); setIsModalOpen(true); }} className="p-2 bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600"><Eye size={14}/></button>
                      <button onClick={() => { setCurrentOrder(order); setIsViewMode(false); setIsModalOpen(true); }} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"><Edit2 size={14}/></button>
                      <button onClick={() => handlePrintOS(order)} className="p-2 bg-slate-800 text-white rounded-lg"><Printer size={14}/></button>
                      <button onClick={() => handleSendWhatsApp(order as ServiceOrder)} className="p-2 bg-emerald-500 text-white rounded-lg"><MessageCircle size={14}/></button>
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
          <div className="bg-white rounded-[40px] w-full max-w-7xl shadow-2xl relative my-auto animate-in zoom-in-95 duration-200">
            <div className="p-10">
              <div className="flex justify-between items-center mb-10 pb-4 border-b">
                <div className="flex items-center gap-6">
                  <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tighter">O.S. #{currentOrder.orderNumber || 'NOVA'}</h3>
                  <button onClick={() => handleSendWhatsApp(currentOrder)} className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 shadow-md">
                    <MessageCircle size={14}/> Notificar Cliente
                  </button>
                  <button onClick={() => handlePrintOS(currentOrder)} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 shadow-md">
                    <Printer size={14}/> Imprimir
                  </button>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-red-50 hover:text-red-500"><X size={24}/></button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-8">
                  {/* CLIENTE E EQUIPAMENTO */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cliente</label>
                        {!isViewMode && (
                          <button onClick={() => setIsQuickCustomerModal(true)} className="text-[10px] font-black text-indigo-600 flex items-center gap-1 hover:underline">
                            <UserPlus size={10}/> Cadastrar
                          </button>
                        )}
                      </div>
                      <select disabled={isViewMode} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm font-bold outline-none" value={currentOrder.customerId || ''} onChange={e => setCurrentOrder({...currentOrder, customerId: e.target.value})}>
                        <option value="">Selecione o Cliente...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Aparelho</label>
                        {!isViewMode && (
                          <button onClick={() => setIsQuickEquipmentModal(true)} disabled={!currentOrder.customerId} className="text-[10px] font-black text-indigo-600 flex items-center gap-1 hover:underline disabled:opacity-30">
                            <Plus size={10}/> Novo Aparelho
                          </button>
                        )}
                      </div>
                      <select disabled={isViewMode} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm font-bold outline-none" value={currentOrder.equipmentId || ''} onChange={e => setCurrentOrder({...currentOrder, equipmentId: e.target.value})}>
                        <option value="">Selecione o Aparelho...</option>
                        {equipment.filter(eq => eq.customerId === currentOrder.customerId).map(eq => <option key={eq.id} value={eq.id}>{eq.brand} {eq.model}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* CHECKLIST */}
                  <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-200">
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-6 tracking-widest">Checklist de Entrada</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {defaultChecklist.map(item => (
                        <button 
                          key={item}
                          disabled={isViewMode}
                          onClick={() => handleToggleChecklist(item)}
                          className={`p-3 rounded-2xl border text-[10px] font-black uppercase flex items-center justify-between transition-all ${currentOrder.checklist?.[item] ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-200'}`}
                        >
                          {item}
                          {currentOrder.checklist?.[item] ? <CheckCircle size={14}/> : <div className="w-3 h-3 rounded-full border-2 border-slate-200" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ITENS E SERVIÇOS */}
                  <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                      <label className="text-[10px] font-black uppercase text-slate-400 block tracking-widest">Itens e Serviços</label>
                      {!isViewMode && (
                        <div className="flex gap-3">
                          <button onClick={() => { setAddingType('peça'); setIsAddingItem(true); }} className="flex items-center gap-2 text-[10px] font-black text-indigo-600 bg-white border border-indigo-100 px-4 py-2 rounded-xl">
                            <Package size={14}/> + Peça
                          </button>
                          <button onClick={() => { setAddingType('serviço'); setIsAddingItem(true); }} className="flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-white border border-emerald-100 px-4 py-2 rounded-xl">
                            <Wrench size={14}/> + Serviço
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {(currentOrder.items || []).map((item, idx) => {
                        const p = products.find(prod => prod.id === item.productId);
                        return (
                          <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center text-xs shadow-sm">
                            <div className="flex items-center gap-4">
                              <div className="p-3 rounded-xl bg-slate-50 text-slate-600"><Package size={16}/></div>
                              <p className="font-black text-slate-900">{p?.name}</p>
                            </div>
                            <div className="flex items-center gap-6">
                              <p className="text-slate-900 font-black">R$ {Number(item.priceAtTime).toFixed(2)}</p>
                              {!isViewMode && <button onClick={() => handleRemoveItemFromOS(idx)} className="p-2 text-slate-300 hover:text-red-500"><Trash size={16}/></button>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* RELATÓRIOS */}
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1 tracking-widest">Relato do Defeito</label>
                      <textarea disabled={isViewMode} className="w-full bg-slate-50 border border-slate-200 p-6 rounded-[24px] text-sm font-bold h-24" placeholder="O que o cliente relatou..." value={currentOrder.problemDescription || ''} onChange={e => setCurrentOrder({...currentOrder, problemDescription: e.target.value})} />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2 px-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 block tracking-widest">Laudo Técnico</label>
                        {!isViewMode && <button onClick={handleGenerateAIReport} disabled={isGeneratingReport} className="text-[10px] font-black text-indigo-600 flex items-center gap-1">{isGeneratingReport ? <RefreshCcw size={10} className="animate-spin" /> : <Zap size={10} />} IA Gemini</button>}
                      </div>
                      <textarea disabled={isViewMode} className="w-full bg-slate-50 border border-slate-200 p-6 rounded-[24px] text-sm font-bold h-32" placeholder="Descreva o conserto..." value={currentOrder.technicalReport || ''} onChange={e => setCurrentOrder({...currentOrder, technicalReport: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                  {/* FINANCEIRO RÁPIDO */}
                  <div className="bg-slate-900 p-8 rounded-[32px] text-white space-y-8 shadow-2xl">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-6">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Receita Total</span>
                      <p className="text-3xl font-black tracking-tighter">R$ {totals.revenue.toFixed(2)}</p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mão de Obra</span>
                        <input disabled={isViewMode} type="number" className="w-24 p-2 bg-slate-800 text-right font-black outline-none text-white text-xs rounded-lg" value={currentOrder.laborCost || 0} onChange={e => setCurrentOrder({...currentOrder, laborCost: parseFloat(e.target.value) || 0})} />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Taxa Diagnóstico</span>
                        <input disabled={isViewMode} type="number" className="w-24 p-2 bg-slate-800 text-right font-black outline-none text-white text-xs rounded-lg" value={currentOrder.diagnosisFee || 0} onChange={e => setCurrentOrder({...currentOrder, diagnosisFee: parseFloat(e.target.value) || 0})} />
                      </div>
                    </div>
                  </div>

                  {/* STATUS */}
                  <div className="bg-white p-6 rounded-[24px] border border-slate-200 space-y-4 shadow-sm">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Status do Processo</label>
                    <select disabled={isViewMode} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-black text-indigo-700" value={currentOrder.status || OrderStatus.ENTRY} onChange={e => setCurrentOrder({...currentOrder, status: e.target.value as OrderStatus})}>
                      {Object.values(OrderStatus).map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>

                  {/* OCORRÊNCIAS / LINHA DO TEMPO */}
                  <div className="bg-white p-6 rounded-[32px] border border-slate-200 flex flex-col h-[400px]">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock size={16} className="text-indigo-600" />
                      <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Ocorrências</label>
                    </div>
                    
                    {!isViewMode && (
                      <div className="flex gap-2 mb-4">
                        <input 
                          className="flex-1 bg-slate-50 border p-3 rounded-xl text-[10px] font-bold outline-none" 
                          placeholder="Registrar nova ocorrência..." 
                          value={newOccurrenceText}
                          onChange={e => setNewOccurrenceText(e.target.value)}
                        />
                        <button onClick={handleAddOccurrence} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700"><Plus size={16}/></button>
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                      {(currentOrder.occurrences || []).map((occ, idx) => (
                        <div key={idx} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex gap-3 items-start relative overflow-hidden group">
                          <div className="mt-1">
                            {occ.type === 'Problema' ? <AlertTriangle size={14} className="text-red-500" /> : <Info size={14} className="text-indigo-500" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-slate-700 leading-relaxed">{occ.description}</p>
                            <p className="text-[8px] font-black text-slate-400 uppercase mt-1">{new Date(occ.timestamp).toLocaleString('pt-BR')}</p>
                          </div>
                          {!isViewMode && (
                            <button onClick={() => setCurrentOrder(prev => ({ ...prev, occurrences: (prev.occurrences || []).filter(o => o.id !== occ.id) }))} className="absolute -right-8 group-hover:right-2 p-1 text-slate-300 hover:text-red-500 transition-all"><Trash size={12}/></button>
                          )}
                        </div>
                      ))}
                      {(currentOrder.occurrences || []).length === 0 && <p className="text-[10px] text-center text-slate-300 font-black uppercase mt-10">Nenhum registro</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex justify-end gap-3 pt-8 border-t border-slate-100">
                {!isViewMode ? (
                  <>
                    <button onClick={() => handleSave(false)} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Salvar O.S.</button>
                    <button onClick={() => setIsPaymentModalOpen(true)} className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Entregar e Faturar</button>
                  </>
                ) : (
                  <button onClick={() => setIsModalOpen(false)} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase">Fechar</button>
                )}
              </div>
            </div>

            {/* Modal Cadastro Rápido Cliente */}
            {isQuickCustomerModal && (
              <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center p-6 z-[110] rounded-[40px]">
                <div className="bg-white rounded-[32px] p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                  <h4 className="text-xl font-black uppercase text-slate-900 mb-6 tracking-tighter">Novo Cliente</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1 px-1 tracking-widest">Nome Completo</label>
                      <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Nome do Cliente" value={quickCustomer.name} onChange={e => setQuickCustomer({...quickCustomer, name: e.target.value})}/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1 px-1 tracking-widest">WhatsApp</label>
                        <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="(00) 00000-0000" value={quickCustomer.phone} onChange={e => setQuickCustomer({...quickCustomer, phone: e.target.value})}/>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1 px-1 tracking-widest">CPF / CNPJ</label>
                        <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="000.000.000-00" value={quickCustomer.document} onChange={e => setQuickCustomer({...quickCustomer, document: e.target.value})}/>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1 px-1 tracking-widest">Endereço</label>
                      <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Rua, Número, Bairro, Cidade" value={quickCustomer.address} onChange={e => setQuickCustomer({...quickCustomer, address: e.target.value})}/>
                    </div>
                  </div>
                  <button onClick={handleQuickCustomerSave} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-xs mt-8 shadow-xl">Salvar Cliente</button>
                  <button onClick={() => setIsQuickCustomerModal(false)} className="mt-4 text-slate-400 text-[10px] font-black uppercase w-full text-center">Cancelar</button>
                </div>
              </div>
            )}

            {/* Modal Cadastro Rápido Equipamento */}
            {isQuickEquipmentModal && (
              <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center p-6 z-[110] rounded-[40px]">
                <div className="bg-white rounded-[32px] p-10 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                  <h4 className="text-xl font-black uppercase text-slate-900 mb-6 tracking-tighter">Novo Aparelho</h4>
                  <div className="space-y-4">
                    <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Marca (Ex: Samsung)" value={quickEquipment.brand} onChange={e => setQuickEquipment({...quickEquipment, brand: e.target.value})}/>
                    <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Modelo (Ex: Galaxy S23)" value={quickEquipment.model} onChange={e => setQuickEquipment({...quickEquipment, model: e.target.value})}/>
                    <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold uppercase" placeholder="Serial / IMEI" value={quickEquipment.serialNumber} onChange={e => setQuickEquipment({...quickEquipment, serialNumber: e.target.value})}/>
                  </div>
                  <button onClick={handleQuickEquipmentSave} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-xs mt-8 shadow-xl">Salvar Aparelho</button>
                  <button onClick={() => setIsQuickEquipmentModal(false)} className="mt-4 text-slate-400 text-[10px] font-black uppercase w-full text-center">Cancelar</button>
                </div>
              </div>
            )}

            {isPaymentModalOpen && (
              <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center p-6 z-[100] rounded-[40px]">
                <div className="bg-white rounded-[32px] p-10 w-full max-w-sm shadow-2xl text-center">
                   <h4 className="text-xl font-black uppercase text-slate-900 mb-6 tracking-tighter">Finalizar Recebimento</h4>
                   <div className="bg-emerald-50 p-8 rounded-3xl mb-8 border border-emerald-100">
                      <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Total a Pagar</p>
                      <p className="text-4xl font-black text-emerald-900">R$ {totals.revenue.toFixed(2)}</p>
                   </div>
                   <div className="space-y-3">
                      {['Dinheiro', 'Pix', 'Cartão'].map(m => (
                        <button key={m} onClick={() => setTempPaymentMethod(m)} className={`w-full p-4 rounded-2xl border font-black text-xs uppercase transition-all ${tempPaymentMethod === m ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-500'}`}>{m}</button>
                      ))}
                   </div>
                   <button onClick={() => handleSave(true, tempPaymentMethod)} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-xs mt-8 shadow-2xl">Confirmar Pagamento</button>
                   <button onClick={() => setIsPaymentModalOpen(false)} className="mt-4 text-slate-400 text-[10px] font-black uppercase">Cancelar</button>
                </div>
              </div>
            )}

            {isAddingItem && (
              <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center p-6 z-[90] rounded-[40px]">
                <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl">
                   <div className="flex justify-between items-center mb-6 pb-4 border-b">
                      <h4 className="text-lg font-black uppercase">Adicionar {addingType}</h4>
                      <button onClick={() => setIsAddingItem(false)} className="p-2 text-slate-400 hover:text-red-500"><X size={20}/></button>
                   </div>
                   <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                     {filteredProductsForModal.map(p => (
                       <button key={p.id} onClick={() => handleAddItemToOS(p)} className="w-full bg-slate-50 p-4 rounded-2xl border flex justify-between items-center hover:bg-white transition-all text-xs font-black">
                         <span>{p.name}</span>
                         <span className="text-indigo-600">R$ {Number(p.price).toFixed(2)}</span>
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
