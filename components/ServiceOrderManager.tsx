
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Eye, Search,
  X, Printer, Smartphone, User, ClipboardList, CheckSquare,
  MessageSquare, CheckCircle, Send, UserPlus,
  Trash, Zap, DollarSign, Check, MessageCircle, Download, FileText,
  PackagePlus, CreditCard, Banknote, QrCode, Wrench, Package,
  AlertCircle, TrendingDown, Camera, Image as ImageIcon, RefreshCcw,
  Clock, Info, AlertTriangle, History, MapPin, Hash, PackageCheck,
  Loader2
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
  
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [isQuickEquipmentOpen, setIsQuickEquipmentOpen] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({ name: '', phone: '', document: '', zipCode: '', address: '' });
  const [quickEquipment, setQuickEquipment] = useState({ brand: '', model: '', type: 'Celular', serialNumber: '', accessories: '' });
  const [isCepLoading, setIsCepLoading] = useState(false);

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      const baseChecklist = ["Liga", "Tela Íntegra", "Câmeras", "Bateria", "WiFi/Rede", "Carregamento", "Botões", "Carcaça"];
      setDefaultChecklist(cl && cl.length > 0 ? cl : baseChecklist);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCepLookup = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    setQuickCustomer(prev => ({ ...prev, zipCode: cep }));

    if (cleanCep.length === 8) {
      setIsCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          const addressString = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
          setQuickCustomer(prev => ({ ...prev, address: addressString }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      } finally {
        setIsCepLoading(false);
      }
    }
  };

  const handleOpenNewOS = () => {
    const checklistInitial: Record<string, boolean> = {};
    defaultChecklist.forEach(item => checklistInitial[item] = false);
    setCurrentOrder({ 
      status: OrderStatus.ENTRY, 
      laborCost: 0, 
      diagnosisFee: 0, 
      items: [], 
      photos: [], 
      problemDescription: '', 
      technicalReport: '', 
      accessories: '',
      checklist: checklistInitial,
      occurrences: [],
      history: []
    });
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleDeleteOS = async (id: string) => {
    if (confirm("Deseja realmente excluir esta Ordem de Serviço? Esta ação é irreversível e apagará os dados deste registro.")) {
      await db.deleteOrder(id);
      await loadAllData();
    }
  };

  const handleQuickCustomerSave = async () => {
    if (!quickCustomer.name || !quickCustomer.phone) return alert("Preencha ao menos Nome e Telefone.");
    const id = Math.random().toString(36).substr(2, 9);
    const newCust: Customer = { ...quickCustomer, id, email: '' };
    await db.updateCustomer(newCust);
    const updatedCustomers = await db.getCustomers();
    setCustomers(updatedCustomers);
    setCurrentOrder(prev => ({ ...prev, customerId: id }));
    setIsQuickCustomerOpen(false);
    setQuickCustomer({ name: '', phone: '', document: '', zipCode: '', address: '' });
  };

  const handleQuickEquipmentSave = async () => {
    if (!currentOrder.customerId) return alert("Selecione o cliente primeiro.");
    if (!quickEquipment.model || !quickEquipment.brand) return alert("Preencha Marca e Modelo.");
    const id = Math.random().toString(36).substr(2, 9);
    const newEq: Equipment = { 
        id, 
        customerId: currentOrder.customerId,
        type: quickEquipment.type,
        brand: quickEquipment.brand,
        model: quickEquipment.model,
        serialNumber: quickEquipment.serialNumber
    };
    await db.addEquipment(newEq);
    const updatedEq = await db.getEquipment();
    setEquipment(updatedEq);
    setCurrentOrder(prev => ({ 
        ...prev, 
        equipmentId: id,
        accessories: quickEquipment.accessories || prev.accessories || ''
    }));
    setIsQuickEquipmentOpen(false);
    setQuickEquipment({ brand: '', model: '', type: 'Celular', serialNumber: '', accessories: '' });
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

  const handleSendWhatsApp = async (order: Partial<ServiceOrder>) => {
    const cust = customers.find(c => c.id === order.customerId);
    const eq = equipment.find(e => e.id === order.equipmentId);
    if (!cust || !cust.phone) return alert("Cliente sem telefone.");
    const phone = cust.phone.replace(/\D/g, '');
    const message = `Olá ${cust.name}, sua O.S. #${order.orderNumber} (${eq?.brand} ${eq?.model}) está com status: ${order.status}. Valor: R$ ${order.total?.toFixed(2)}`;
    window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleGenerateAIReport = async () => {
    if (!currentOrder.problemDescription) return alert("Descreva o problema.");
    setIsGeneratingReport(true);
    try {
      const suggestion = await generateTechnicalReport(currentOrder.problemDescription);
      setCurrentOrder(prev => ({ ...prev, technicalReport: suggestion }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentOrder(prev => ({ ...prev, photos: [...(prev.photos || []), reader.result as string] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSave = async (isClosing?: boolean) => {
    if (!currentOrder.customerId || !currentOrder.equipmentId) return alert("Preencha cliente e aparelho.");
    const maxOS = orders.length > 0 ? Math.max(...orders.map(o => o.orderNumber)) : 1000;
    const status = isClosing ? OrderStatus.DELIVERED : (currentOrder.status || OrderStatus.ENTRY);
    const itemsTotal = (currentOrder.items || []).reduce((a, b) => a + (b.priceAtTime * b.quantity), 0);
    const total = (Number(currentOrder.laborCost) || 0) + (Number(currentOrder.diagnosisFee) || 0) + itemsTotal;

    const orderToSave: ServiceOrder = {
      ...currentOrder,
      id: currentOrder.id || Math.random().toString(36).substr(2, 9),
      orderNumber: currentOrder.orderNumber || (maxOS + 1),
      status,
      total,
      createdAt: currentOrder.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [...(currentOrder.history || []), { status, timestamp: new Date().toISOString(), note: "O.S. Atualizada" }]
    } as ServiceOrder;

    await db.updateOrder(orderToSave);
    await loadAllData();
    setIsModalOpen(false);
    alert("O.S. Salva com sucesso!");
  };

  const handlePrintOS = (order: Partial<ServiceOrder>) => {
    const cust = customers.find(c => c.id === order.customerId);
    const eq = equipment.find(e => e.id === order.equipmentId);
    const biz = businessInfo || { name: 'FIXOS ASSISTÊNCIA', address: 'Rua das Tecnologias, 101 - Centro', phone: '(11) 99999-8493', cnpj: '00.000.000/0001-00' };
    
    const itemsHtml = (order.items || []).map(item => {
        const prod = products.find(p => p.id === item.productId);
        return `
            <tr>
                <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px; font-weight: 500;">${prod?.name || 'Item desconhecido'}</td>
                <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 10px; font-weight: 500;">${item.quantity}</td>
                <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 10px; font-weight: 500;">R$ ${item.priceAtTime.toFixed(2)}</td>
                <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 10px; font-weight: 500;">R$ ${(item.quantity * item.priceAtTime).toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    const photosHtml = (order.photos || []).map(photo => `
        <div style="width: 155px; height: 110px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: #f8fafc;">
            <img src="${photo}" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
    `).join('');

    const win = window.open('', '_blank');
    win?.document.write(`
      <html>
        <head>
          <title>Impressão O.S. #${order.orderNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #0f172a; line-height: 1.3; font-size: 12px; margin: 0; background: white; -webkit-print-color-adjust: exact; }
            
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #0f172a; padding-bottom: 15px; margin-bottom: 25px; align-items: flex-end; }
            .biz-header h1 { font-weight: 900; font-size: 24px; text-transform: uppercase; margin: 0 0 5px 0; letter-spacing: -0.02em; }
            .biz-info { font-size: 10px; font-weight: 700; color: #64748b; line-height: 1.4; }
            
            .os-header-info { text-align: right; }
            .os-number { font-weight: 900; font-size: 24px; margin: 0 0 5px 0; }
            .os-meta { font-size: 10px; font-weight: 700; color: #475569; }

            .section { border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 15px; overflow: hidden; }
            .section-title { background: #f8fafc; padding: 6px 12px; font-weight: 900; font-size: 9px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; letter-spacing: 0.05em; }
            .section-content { padding: 12px; font-size: 11px; font-weight: 800; }
            .label-muted { color: #64748b; font-weight: 600; font-size: 10px; margin-right: 5px; text-transform: none; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 0; }
            th { text-align: left; font-size: 9px; font-weight: 900; text-transform: uppercase; color: #475569; background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 10px 8px; }
            
            .totals-container { text-align: right; padding: 15px 12px; }
            .fee-line { font-size: 10px; color: #64748b; font-weight: 800; margin-bottom: 6px; }
            .grand-total { font-size: 20px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin-top: 5px; }

            .photo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 12px; }
            
            .signatures { display: flex; justify-content: space-around; margin-top: 80px; }
            .sig-box { border-top: 2px solid #0f172a; width: 260px; text-align: center; padding-top: 10px; font-weight: 900; font-size: 10px; text-transform: uppercase; }
            .sig-sub { font-size: 9px; color: #64748b; margin-top: 3px; font-weight: 700; text-transform: uppercase; }

            .warranty-note { font-size: 9px; font-weight: 700; color: #475569; text-transform: uppercase; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 10px; }

            @media print {
                body { padding: 20px; }
                .header { border-bottom-width: 4px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="biz-header">
              <h1>${biz.name}</h1>
              <div class="biz-info">
                ${biz.cnpj}<br>
                ${biz.address}<br>
                Whats: ${biz.phone}
              </div>
            </div>
            <div class="os-header-info">
              <h1 class="os-number">O.S. #${order.orderNumber}</h1>
              <div class="os-meta">
                Data: ${new Date(order.createdAt || '').toLocaleDateString('pt-BR')} | Status: <b>${order.status}</b>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Cliente</div>
            <div class="section-content">
              <div style="font-size: 14px; margin-bottom: 4px; text-transform: uppercase;">${cust?.name || 'CONSUMIDOR FINAL'}</div>
              <div><span class="label-muted">Doc:</span> ${cust?.document || '---'} | <span class="label-muted">Tel:</span> ${cust?.phone || '---'}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Equipamento</div>
            <div class="section-content">
              <div style="font-size: 14px; margin-bottom: 4px; text-transform: uppercase;">${eq?.brand} ${eq?.model}</div>
              <div><span class="label-muted">Série:</span> ${eq?.serialNumber || '---'} | <span class="label-muted">Tipo:</span> ${eq?.type || 'Aparelho'}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Relato do Problema</div>
            <div class="section-content">${order.problemDescription || 'Nenhuma observação registrada.'}</div>
          </div>

          <div class="section">
            <div class="section-title">Laudo de Execução</div>
            <div class="section-content">${order.technicalReport || 'Sem laudo técnico registrado.'}</div>
          </div>

          <div class="section">
            <div class="section-title">Peças e Serviços</div>
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th style="text-align: center;">Qtd</th>
                  <th style="text-align: right;">Unit.</th>
                  <th style="text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml || '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #94a3b8; font-weight: 500;">Nenhum item lançado</td></tr>'}
              </tbody>
            </table>
            <div class="totals-container">
              <div class="fee-line">M.O.: R$ ${Number(order.laborCost).toFixed(2)} | Diag.: R$ ${Number(order.diagnosisFee).toFixed(2)}</div>
              <div class="grand-total">Valor Total: R$ ${Number(order.total).toFixed(2)}</div>
            </div>
          </div>

          ${order.photos?.length ? `
          <div class="section">
            <div class="section-title">Anexos Fotográficos</div>
            <div class="photo-grid">
              ${photosHtml}
            </div>
          </div>` : ''}

          <div class="section">
            <div class="section-title">Termos e Condições</div>
            <div class="section-content">
              <div class="warranty-note">
                GARANTIA DE ${order.warrantyDays || 90} DIAS SOBRE OS SERVIÇOS EXECUTADOS. NÃO COBRIMOS DANOS CAUSADOS POR MAU USO, QUEDAS OU LÍQUIDOS.
                APARELHOS NÃO RETIRADOS EM 90 DIAS SERÃO DESCARTADOS PARA CUSTEIO DE TAXAS.
              </div>
            </div>
          </div>

          <div class="signatures">
            <div class="sig-box">
              Assinatura do Cliente
              <div class="sig-sub">${cust?.name || ''}</div>
            </div>
            <div class="sig-box">
              Responsável Técnico
              <div class="sig-sub">${biz.name}</div>
            </div>
          </div>

          <script>
            window.onload = () => { 
                setTimeout(() => { 
                    window.print(); 
                    window.close(); 
                }, 800); 
            }
          </script>
        </body>
      </html>
    `);
    win?.document.close();
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center">
        <button onClick={handleOpenNewOS} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 uppercase tracking-widest shadow-lg active:scale-95 transition-all">
          <Plus size={18} /> Nova O.S.
        </button>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input placeholder="Buscar por O.S., Cliente ou Serial..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <tr><th className="p-5">O.S.</th><th className="p-5">Cliente / Aparelho</th><th className="p-5 text-right">Valor</th><th className="p-5 text-center">Status</th><th className="p-5 text-center">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.filter(o => 
                o.orderNumber.toString().includes(searchTerm) || 
                customers.find(c => c.id === o.customerId)?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                equipment.find(e => e.id === o.equipmentId)?.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())
            ).map(order => {
              const cust = customers.find(c => c.id === order.customerId);
              const eq = equipment.find(e => e.id === order.equipmentId);
              return (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors text-xs font-bold">
                  <td className="p-5 text-slate-400">#{order.orderNumber}</td>
                  <td className="p-5">
                    <div className="flex flex-col">
                      <span className="text-slate-900 uppercase font-black">{cust?.name || '---'}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{eq?.brand} {eq?.model} {eq?.serialNumber ? `(${eq.serialNumber})` : ''}</span>
                    </div>
                  </td>
                  <td className="p-5 text-right text-slate-900 font-black">R$ {Number(order.total).toFixed(2)}</td>
                  <td className="p-5 text-center"><span className={`px-3 py-1 rounded-full text-[9px] uppercase font-black border ${STATUS_COLORS[order.status]}`}>{order.status}</span></td>
                  <td className="p-5 text-center flex justify-center gap-2">
                    <button title="Visualizar" onClick={() => { setCurrentOrder(order); setIsViewMode(true); setIsModalOpen(true); }} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"><Eye size={14}/></button>
                    <button title="Editar" onClick={() => { setCurrentOrder(order); setIsViewMode(false); setIsModalOpen(true); }} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"><Edit2 size={14}/></button>
                    <button title="WhatsApp" onClick={() => handleSendWhatsApp(order)} className="p-2 bg-emerald-500 text-white rounded-lg shadow-sm hover:bg-emerald-600 transition-colors"><MessageCircle size={14}/></button>
                    <button title="Imprimir" onClick={() => handlePrintOS(order)} className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors"><Printer size={14}/></button>
                    <button title="Excluir" onClick={() => handleDeleteOS(order.id)} className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"><Trash2 size={14}/></button>
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
                <div className="flex items-center gap-4">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">O.S. #{currentOrder.orderNumber || 'NOVA'}</h3>
                  <button onClick={() => handleSendWhatsApp(currentOrder)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all active:scale-95"><MessageCircle size={14}/> Notificar</button>
                  <button onClick={() => handlePrintOS(currentOrder)} className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-slate-200 transition-all active:scale-95"><Printer size={14}/> Imprimir</button>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full hover:text-red-500 transition-colors"><X size={24}/></button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</label>
                          {!isViewMode && <button onClick={() => setIsQuickCustomerOpen(true)} className="text-[10px] font-black text-indigo-600 flex items-center gap-1 uppercase"><UserPlus size={12}/> Novo</button>}
                       </div>
                       <select disabled={isViewMode} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-bold shadow-sm" value={currentOrder.customerId || ''} onChange={e => setCurrentOrder({...currentOrder, customerId: e.target.value, equipmentId: ''})}>
                          <option value="">Selecione o Cliente...</option>
                          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipamento</label>
                          {!isViewMode && <button onClick={() => setIsQuickEquipmentOpen(true)} className="text-[10px] font-black text-indigo-600 flex items-center gap-1 uppercase"><Smartphone size={12}/> Novo</button>}
                       </div>
                       <select disabled={isViewMode} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-bold shadow-sm" value={currentOrder.equipmentId || ''} onChange={e => setCurrentOrder({...currentOrder, equipmentId: e.target.value})}>
                          <option value="">Selecione o Aparelho...</option>
                          {equipment.filter(eq => eq.customerId === currentOrder.customerId).map(eq => <option key={eq.id} value={eq.id}>{eq.brand} {eq.model}</option>)}
                       </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Acessórios Deixados</label>
                        <input disabled={isViewMode} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-bold shadow-sm" placeholder="Ex: Capinha, Carregador, Cabo..." value={currentOrder.accessories || ''} onChange={e => setCurrentOrder({...currentOrder, accessories: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Prioridade</label>
                        <select disabled={isViewMode} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-bold shadow-sm" value={currentOrder.priority || 'Média'} onChange={e => setCurrentOrder({...currentOrder, priority: e.target.value as any})}>
                            <option value="Baixa">Baixa</option>
                            <option value="Média">Média</option>
                            <option value="Alta">Alta</option>
                            <option value="Urgente">Urgente 🔥</option>
                        </select>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 p-8 rounded-[32px] border border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-6 tracking-widest">Checklist de Entrada</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {defaultChecklist.map(item => (
                        <button key={item} disabled={isViewMode} onClick={() => setCurrentOrder(prev => ({...prev, checklist: {...(prev.checklist || {}), [item]: !prev.checklist?.[item]}}))} className={`p-4 rounded-2xl border text-[10px] font-black uppercase flex items-center justify-between transition-all ${currentOrder.checklist?.[item] ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}>
                          {item} {currentOrder.checklist?.[item] && <CheckCircle size={14}/>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-50/50 p-8 rounded-[32px] border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fotos do Aparelho</label>
                      {!isViewMode && <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black text-indigo-600 flex items-center gap-1 uppercase tracking-widest border-b border-indigo-200"><Camera size={14}/> Adicionar Fotos</button>}
                      <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {(currentOrder.photos || []).map((photo, idx) => (
                        <div key={idx} className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-white shadow-md group">
                          <img src={photo} className="w-full h-full object-cover" />
                          {!isViewMode && <button onClick={() => setCurrentOrder(prev => ({...prev, photos: (prev.photos || []).filter((_, i) => i !== idx)}))} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12}/></button>}
                        </div>
                      ))}
                      {(currentOrder.photos || []).length === 0 && <p className="text-[10px] text-slate-400 font-black uppercase py-4">Nenhuma foto anexada.</p>}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Relato do Defeito</label>
                       <textarea disabled={isViewMode} className="w-full bg-slate-50 border border-slate-200 p-6 rounded-[24px] text-sm font-bold shadow-inner h-32" value={currentOrder.problemDescription || ''} onChange={e => setCurrentOrder({...currentOrder, problemDescription: e.target.value})} />
                    </div>
                    <div className="bg-slate-50/50 p-8 rounded-[32px] border border-slate-100 space-y-6">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Linha do Tempo / Ocorrências</label>
                      {!isViewMode && (
                        <div className="flex gap-3">
                          <input placeholder="Adicionar nova nota técnica..." className="flex-1 bg-white border p-4 rounded-2xl text-xs font-bold shadow-sm" value={newOccurrenceText} onChange={e => setNewOccurrenceText(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddOccurrence()}/>
                          <button onClick={handleAddOccurrence} className="bg-slate-900 text-white px-6 rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all"><Send size={14}/></button>
                        </div>
                      )}
                      <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {(currentOrder.occurrences || []).map((occ, idx) => (
                          <div key={occ.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4 animate-in slide-in-from-left-2 duration-300">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl mt-1"><History size={14}/></div>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-700 leading-relaxed">{occ.description}</p>
                              <p className="text-[9px] font-black text-slate-400 uppercase mt-1">{new Date(occ.timestamp).toLocaleString('pt-BR')}</p>
                            </div>
                            {!isViewMode && <button onClick={() => setCurrentOrder(prev => ({...prev, occurrences: (prev.occurrences || []).filter(o => o.id !== occ.id)}))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between px-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Laudo Técnico de Reparo</label>
                          {!isViewMode && <button onClick={handleGenerateAIReport} disabled={isGeneratingReport} className="text-[10px] font-black text-indigo-600 flex items-center gap-1 uppercase tracking-widest">{isGeneratingReport ? <RefreshCcw size={12} className="animate-spin"/> : <Zap size={12}/>} Sugestão IA Gemini</button>}
                       </div>
                       <textarea disabled={isViewMode} className="w-full bg-slate-50 border border-slate-200 p-6 rounded-[24px] text-sm font-bold shadow-inner h-40" value={currentOrder.technicalReport || ''} onChange={e => setCurrentOrder({...currentOrder, technicalReport: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl border-4 border-slate-800">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-6 mb-6">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Receita Total</span>
                      <p className="text-4xl font-black tracking-tighter">R$ {((Number(currentOrder.laborCost) || 0) + (Number(currentOrder.diagnosisFee) || 0) + (currentOrder.items || []).reduce((a, b) => a + (b.priceAtTime * b.quantity), 0)).toFixed(2)}</p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1"><Wrench size={10}/> Mão de Obra</span>
                        <input disabled={isViewMode} type="number" className="w-24 p-3 bg-slate-800 text-right font-black outline-none text-white text-sm rounded-xl focus:ring-2 focus:ring-indigo-500" value={currentOrder.laborCost || 0} onChange={e => setCurrentOrder({...currentOrder, laborCost: parseFloat(e.target.value) || 0})} />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1"><AlertCircle size={10}/> Taxa Diagnóstico</span>
                        <input disabled={isViewMode} type="number" className="w-24 p-3 bg-slate-800 text-right font-black outline-none text-white text-sm rounded-xl focus:ring-2 focus:ring-indigo-500" value={currentOrder.diagnosisFee || 0} onChange={e => setCurrentOrder({...currentOrder, diagnosisFee: parseFloat(e.target.value) || 0})} />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Status do Processo</label>
                    <select disabled={isViewMode} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-black text-indigo-700 shadow-sm" value={currentOrder.status || OrderStatus.ENTRY} onChange={e => setCurrentOrder({...currentOrder, status: e.target.value as OrderStatus})}>
                      {Object.values(OrderStatus).map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Informações da Garantia</p>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-[10px] font-bold text-slate-500">Dias:</span>
                            <input disabled={isViewMode} type="number" className="w-16 bg-white border text-right font-black text-xs rounded-lg p-1" value={currentOrder.warrantyDays || 90} onChange={e => setCurrentOrder({...currentOrder, warrantyDays: parseInt(e.target.value) || 0})} />
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-12 flex justify-end gap-4 pt-8 border-t border-slate-100">
                {!isViewMode ? (
                  <>
                    <button onClick={() => handleSave(false)} className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all">Salvar Alterações</button>
                    <button onClick={() => handleSave(true)} className="bg-emerald-600 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-100 active:scale-95 transition-all">Entregar Equipamento</button>
                  </>
                ) : (
                  <button onClick={() => setIsModalOpen(false)} className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95">Fechar Visualização</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isQuickCustomerOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
           <div className="bg-white rounded-[40px] p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 border-4 border-white max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-black mb-6 uppercase tracking-tighter flex items-center gap-2"><UserPlus size={20}/> Cadastro Rápido de Cliente</h3>
              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase px-1">Nome Completo</label>
                    <input className="w-full bg-slate-50 border p-3 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={quickCustomer.name} onChange={e => setQuickCustomer({...quickCustomer, name: e.target.value})}/>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase px-1">WhatsApp</label>
                        <input className="w-full bg-slate-50 border p-3 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={quickCustomer.phone} onChange={e => setQuickCustomer({...quickCustomer, phone: e.target.value})}/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase px-1">CPF/CNPJ (Opcional)</label>
                        <input className="w-full bg-slate-50 border p-3 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={quickCustomer.document} onChange={e => setQuickCustomer({...quickCustomer, document: e.target.value})}/>
                    </div>
                 </div>
                 <div className="space-y-1 relative">
                    <label className="text-[9px] font-black text-slate-400 uppercase px-1 flex items-center gap-2"><MapPin size={10}/> CEP (Busca Auto)</label>
                    <div className="relative">
                      <input 
                        placeholder="00000-000"
                        className="w-full bg-slate-50 border p-3 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                        value={quickCustomer.zipCode} 
                        onChange={e => handleQuickCepLookup(e.target.value)}
                      />
                      {isCepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" size={16} />}
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase px-1">Endereço Completo</label>
                    <textarea rows={2} className="w-full bg-slate-50 border p-3 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 resize-none" value={quickCustomer.address} onChange={e => setQuickCustomer({...quickCustomer, address: e.target.value})}/>
                 </div>
                 <div className="flex gap-2 pt-4">
                    <button onClick={() => setIsQuickCustomerOpen(false)} className="flex-1 py-4 font-black text-slate-400 text-[10px] uppercase">Cancelar</button>
                    <button onClick={handleQuickCustomerSave} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-indigo-100 active:scale-95 transition-all">Salvar Cliente</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isQuickEquipmentOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
           <div className="bg-white rounded-[40px] p-10 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 border-4 border-white">
              <h3 className="text-xl font-black mb-6 uppercase tracking-tighter flex items-center gap-2"><Smartphone size={20}/> Registro de Aparelho</h3>
              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase px-1">Tipo</label>
                        <select className="w-full bg-slate-50 border p-3 rounded-2xl text-sm font-bold" value={quickEquipment.type} onChange={e => setQuickEquipment({...quickEquipment, type: e.target.value})}>
                            <option value="Celular">Celular</option>
                            <option value="Tablet">Tablet</option>
                            <option value="Notebook">Notebook</option>
                            <option value="Monitor">Monitor</option>
                            <option value="Console">Console</option>
                            <option value="Outro">Outro</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase px-1">Marca</label>
                        <input placeholder="Ex: Samsung, Apple" className="w-full bg-slate-50 border p-3 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={quickEquipment.brand} onChange={e => setQuickEquipment({...quickEquipment, brand: e.target.value})}/>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase px-1">Modelo</label>
                        <input placeholder="Ex: iPhone 13 Pro" className="w-full bg-slate-50 border p-3 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={quickEquipment.model} onChange={e => setQuickEquipment({...quickEquipment, model: e.target.value})}/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase px-1">Nº de Série / IMEI</label>
                        <input className="w-full bg-slate-50 border p-3 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase" value={quickEquipment.serialNumber} onChange={e => setQuickEquipment({...quickEquipment, serialNumber: e.target.value})}/>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase px-1">Acessórios que acompanham</label>
                    <input placeholder="Ex: Capinha preta, Carregador Apple 20W..." className="w-full bg-slate-50 border p-3 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={quickEquipment.accessories} onChange={e => setQuickEquipment({...quickEquipment, accessories: e.target.value})}/>
                 </div>
                 <div className="flex gap-2 pt-4">
                    <button onClick={() => setIsQuickEquipmentOpen(false)} className="flex-1 py-4 font-black text-slate-400 text-[10px] uppercase">Cancelar</button>
                    <button onClick={handleQuickEquipmentSave} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-indigo-100 active:scale-95 transition-all">Vincular Aparelho</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrderManager;
