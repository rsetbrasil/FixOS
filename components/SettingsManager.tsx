
import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit2, Check, X, ClipboardList, 
  FileText, Save, ShieldCheck, Database, Cloud, 
  RefreshCcw, Terminal, AlertTriangle, ExternalLink, Zap,
  Info, Activity, Copy, DownloadCloud, Play, Building2,
  MessageCircle, Info as InfoIcon
} from 'lucide-react';
import { db } from '../utils/storage';
import { BusinessInfo, OrderStatus } from '../types';

const DEFAULT_URL = "postgresql://neondb_owner:npg_3dkHbBJNQ2Ah@ep-still-frog-ahizpvsg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require";

const SettingsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'geral' | 'cloud' | 'checklist' | 'termos' | 'whatsapp'>('geral');
  const [activeTermTab, setActiveTermTab] = useState<'entry' | 'budget' | 'exit'>('entry');
  const [activeMsgTab, setActiveMsgTab] = useState<string>(OrderStatus.ENTRY);
  
  const [checklist, setChecklist] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const [termsEntry, setTermsEntry] = useState('');
  const [termsBudget, setTermsBudget] = useState('');
  const [termsExit, setTermsExit] = useState('');
  const [statusMessages, setStatusMessages] = useState<Record<string, string>>({});
  const [defaultWarranty, setDefaultWarranty] = useState(90);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    name: '', cnpj: '', phone: '', address: ''
  });

  const [neonUrl, setNeonUrl] = useState(localStorage.getItem('neon_connection_string') || DEFAULT_URL);
  const [dbMode, setDbMode] = useState(localStorage.getItem('db_mode') || 'cloud');
  const [setupStatus, setSetupStatus] = useState<{success?: boolean, msg?: string} | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const [cl, te, tb, tx, dw, bi, msgs] = await Promise.all([
        db.getChecklist(),
        db.getTermsEntry(),
        db.getTermsBudget(),
        db.getTermsExit(),
        db.getDefaultWarranty(),
        db.getBusinessInfo(),
        db.getStatusMessages()
      ]);
      setChecklist(cl || []);
      setTermsEntry(te || '');
      setTermsBudget(tb || '');
      setTermsExit(tx || '');
      setDefaultWarranty(dw || 90);
      setBusinessInfo(bi);
      setStatusMessages(msgs || {});
    };
    loadSettings();
  }, [dbMode]);

  const handleSaveNeon = () => {
    localStorage.setItem('neon_connection_string', neonUrl);
    localStorage.setItem('db_mode', dbMode);
    setSetupStatus({ success: true, msg: "Configurações salvas! Reiniciando..." });
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleSaveBusinessInfo = async () => {
    setIsSaving(true);
    try {
      await db.saveBusinessInfo(businessInfo);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      alert("Erro ao salvar dados da empresa.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAllTerms = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        db.saveTermsEntry(termsEntry),
        db.saveTermsBudget(termsBudget),
        db.saveTermsExit(termsExit),
        db.saveDefaultWarranty(defaultWarranty)
      ]);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      alert("Erro ao salvar termos.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMessages = async () => {
    setIsSaving(true);
    try {
      await db.saveStatusMessages(statusMessages);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      alert("Erro ao salvar mensagens.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddChecklist = async () => {
    if (!newItem.trim()) return;
    const updated = [...checklist, newItem.trim()];
    setChecklist(updated);
    await db.saveChecklist(updated);
    setNewItem('');
  };

  const handleDeleteChecklist = async (idx: number) => {
    const updated = checklist.filter((_, i) => i !== idx);
    setChecklist(updated);
    await db.saveChecklist(updated);
  };

  const inputClass = "w-full border border-slate-200 p-4 rounded-2xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-700";

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Menu Superior de Configurações */}
      <div className="flex bg-white p-2 rounded-[32px] shadow-sm border border-slate-100 overflow-x-auto gap-2">
        <button onClick={() => setActiveTab('geral')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'geral' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}><Building2 size={16}/> Empresa</button>
        <button onClick={() => setActiveTab('whatsapp')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'whatsapp' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-400 hover:bg-slate-50'}`}><MessageCircle size={16}/> Mensagens WhatsApp</button>
        <button onClick={() => setActiveTab('termos')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'termos' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}><FileText size={16}/> Termos Legais</button>
        <button onClick={() => setActiveTab('checklist')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'checklist' ? 'bg-amber-600 text-white shadow-lg shadow-amber-100' : 'text-slate-400 hover:bg-slate-50'}`}><ClipboardList size={16}/> Checklist</button>
        <button onClick={() => setActiveTab('cloud')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'cloud' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:bg-slate-50'}`}><Cloud size={16}/> Cloud Sync</button>
      </div>

      {activeTab === 'geral' && (
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Dados da Empresa</h2>
            <button onClick={handleSaveBusinessInfo} disabled={isSaving} className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black transition-all shadow-xl uppercase text-xs tracking-widest ${isSaved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'} disabled:opacity-50`}>
              {isSaved ? <Check size={18} /> : <Save size={18} />} {isSaved ? 'SALVO!' : 'SALVAR'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome Fantasia</label><input className={inputClass} value={businessInfo.name} onChange={e => setBusinessInfo({...businessInfo, name: e.target.value})}/></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">CNPJ / CPF</label><input className={inputClass} value={businessInfo.cnpj} onChange={e => setBusinessInfo({...businessInfo, cnpj: e.target.value})}/></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Telefone / WhatsApp</label><input className={inputClass} value={businessInfo.phone} onChange={e => setBusinessInfo({...businessInfo, phone: e.target.value})}/></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Endereço Completo</label><input className={inputClass} value={businessInfo.address} onChange={e => setBusinessInfo({...businessInfo, address: e.target.value})}/></div>
          </div>
        </div>
      )}

      {activeTab === 'whatsapp' && (
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10">
          <div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-50">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Mensagens Automáticas</h2>
              <p className="text-sm text-slate-500 font-medium">Defina o que o cliente recebe via WhatsApp em cada etapa.</p>
            </div>
            <button onClick={handleSaveMessages} disabled={isSaving} className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black transition-all shadow-xl uppercase text-xs tracking-widest ${isSaved ? 'bg-emerald-600 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
              <Save size={18}/> {isSaved ? 'SALVO!' : 'SALVAR TEMPLATES'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 space-y-2">
               {Object.values(OrderStatus).map(status => (
                 <button key={status} onClick={() => setActiveMsgTab(status)} className={`w-full text-left p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeMsgTab === status ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}>
                   {status}
                 </button>
               ))}
            </div>

            <div className="lg:col-span-8 space-y-6">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="flex items-center gap-2 mb-4 text-emerald-600">
                  <InfoIcon size={14}/>
                  <span className="text-[10px] font-black uppercase tracking-widest">Tags Inteligentes (Clique para copiar)</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-6">
                  {['{{cliente}}', '{{os}}', '{{aparelho}}', '{{status}}', '{{valor}}', '{{ocorrencias}}'].map(tag => (
                    <button key={tag} onClick={() => { navigator.clipboard.writeText(tag); alert(`Tag ${tag} copiada!`); }} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-mono font-black text-slate-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                      {tag}
                    </button>
                  ))}
                </div>
                <textarea
                  className="w-full h-64 bg-white border border-slate-200 p-8 rounded-[32px] outline-none focus:ring-4 focus:ring-emerald-500/10 text-sm font-medium leading-relaxed text-slate-700 shadow-inner"
                  placeholder="Escreva sua mensagem aqui..."
                  value={statusMessages[activeMsgTab] || ''}
                  onChange={(e) => setStatusMessages({...statusMessages, [activeMsgTab]: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'checklist' && (
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10">
          <div className="flex items-center gap-4 mb-8"><h2 className="text-2xl font-black text-slate-900 tracking-tight">Checklist de Entrada</h2></div>
          <div className="flex gap-4 mb-8"><input placeholder="Novo item..." className={inputClass} value={newItem} onChange={(e) => setNewItem(e.target.value)}/><button onClick={handleAddChecklist} className="bg-amber-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-100">Add</button></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{checklist.map((item, idx) => (<div key={idx} className="flex justify-between items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl group transition-all"><span className="text-sm font-bold text-slate-700">{item}</span><button onClick={() => handleDeleteChecklist(idx)} className="text-slate-300 hover:text-red-500 transition-all"><X size={18} /></button></div>))}</div>
        </div>
      )}

      {activeTab === 'termos' && (
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10">
          <div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-50">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Termos de Responsabilidade</h2>
            <button onClick={handleSaveAllTerms} disabled={isSaving} className={`px-10 py-4 rounded-2xl font-black shadow-xl uppercase text-xs tracking-widest transition-all ${isSaved ? 'bg-emerald-600' : 'bg-blue-600'} text-white`}>
              {isSaved ? 'SALVO!' : 'SALVAR TERMOS'}
            </button>
          </div>
          <div className="flex gap-2 mb-8 bg-slate-50 p-2 rounded-2xl">
            {['entry', 'budget', 'exit'].map(tab => (
              <button key={tab} onClick={() => setActiveTermTab(tab as any)} className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTermTab === tab ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>
                {tab === 'entry' ? 'Entrada' : tab === 'budget' ? 'Orçamento' : 'Saída'}
              </button>
            ))}
          </div>
          <textarea spellCheck={false} className="w-full h-80 border-none bg-slate-50/50 p-8 rounded-3xl outline-none focus:ring-4 focus:ring-blue-500/10 font-mono text-sm leading-relaxed text-slate-700 shadow-inner whitespace-pre overflow-x-auto" value={activeTermTab === 'entry' ? termsEntry : activeTermTab === 'budget' ? termsBudget : termsExit} onChange={(e) => { if (activeTermTab === 'entry') setTermsEntry(e.target.value); if (activeTermTab === 'budget') setTermsBudget(e.target.value); if (activeTermTab === 'exit') setTermsExit(e.target.value); }}/>
        </div>
      )}

      {activeTab === 'cloud' && (
        <div className="bg-slate-900 text-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-800 p-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <h2 className="text-2xl font-black tracking-tight">Cloud PostgreSQL Sync</h2>
            <div className="flex bg-slate-800 p-1.5 rounded-2xl">
              <button onClick={() => setDbMode('local')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${dbMode === 'local' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400'}`}>Local</button>
              <button onClick={() => setDbMode('cloud')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${dbMode === 'cloud' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400'}`}>Cloud</button>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-slate-800/50 p-8 rounded-[32px] border border-slate-700/50">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Neon Connection String</label>
              <div className="flex flex-col md:flex-row gap-4">
                <input type="password" className="flex-1 bg-slate-950 border border-slate-700 p-4 rounded-2xl text-sm font-mono text-emerald-400 outline-none" value={neonUrl} onChange={(e) => setNeonUrl(e.target.value)}/>
                <button onClick={handleSaveNeon} className="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsManager;
