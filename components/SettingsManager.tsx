
import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit2, Check, X, ClipboardList, 
  FileText, Save, ShieldCheck, Database, Cloud, 
  RefreshCcw, Terminal, AlertTriangle, ExternalLink, Zap,
  Info, Activity, Copy, DownloadCloud, Play, Building2
} from 'lucide-react';
import { db } from '../utils/storage';
import { BusinessInfo } from '../types';

const DEFAULT_URL = "postgresql://neondb_owner:npg_3dkHbBJNQ2Ah@ep-still-frog-ahizpvsg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require";

const SettingsManager: React.FC = () => {
  const [activeTermTab, setActiveTermTab] = useState<'entry' | 'budget' | 'exit'>('entry');
  const [checklist, setChecklist] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const [termsEntry, setTermsEntry] = useState('');
  const [termsBudget, setTermsBudget] = useState('');
  const [termsExit, setTermsExit] = useState('');
  const [defaultWarranty, setDefaultWarranty] = useState(90);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Business Info
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    name: '', cnpj: '', phone: '', address: ''
  });

  // Neon Config
  const [neonUrl, setNeonUrl] = useState(localStorage.getItem('neon_connection_string') || DEFAULT_URL);
  const [dbMode, setDbMode] = useState(localStorage.getItem('db_mode') || 'cloud');
  const [setupStatus, setSetupStatus] = useState<{success?: boolean, msg?: string} | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const [cl, te, tb, tx, dw, bi] = await Promise.all([
        db.getChecklist(),
        db.getTermsEntry(),
        db.getTermsBudget(),
        db.getTermsExit(),
        db.getDefaultWarranty(),
        db.getBusinessInfo()
      ]);
      setChecklist(cl || []);
      setTermsEntry(te || '');
      setTermsBudget(tb || '');
      setTermsExit(tx || '');
      setDefaultWarranty(dw || 90);
      setBusinessInfo(bi);
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
      // Importante: Manter o valor puro da string (com \n e espaços)
      await Promise.all([
        db.saveTermsEntry(termsEntry),
        db.saveTermsBudget(termsBudget),
        db.saveTermsExit(termsExit),
        db.saveDefaultWarranty(defaultWarranty)
      ]);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error("Erro ao salvar termos:", err);
      alert("Erro ao salvar termos no banco de dados.");
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

  const handleInitializeTables = async () => {
    setSetupStatus({ msg: "Executando setup de tabelas..." });
    const result = await db.initializeTables();
    setSetupStatus({ success: result.success, msg: result.msg });
  };

  const inputClass = "w-full border border-slate-200 p-4 rounded-2xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-700";

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Dados da Empresa / Cabeçalho */}
      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Building2 size={28} /></div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Dados da Empresa</h2>
              <p className="text-sm text-slate-500 font-medium">Informações que aparecerão nas impressões e O.S.</p>
            </div>
          </div>
          <button
            onClick={handleSaveBusinessInfo}
            disabled={isSaving}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black transition-all shadow-xl uppercase text-xs tracking-widest ${isSaved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'} disabled:opacity-50`}
          >
            {isSaved ? <Check size={18} /> : <Save size={18} />}
            {isSaved ? 'SALVO!' : isSaving ? 'SALVANDO...' : 'SALVAR CABEÇALHO'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome Fantasia</label>
            <input 
              className={inputClass}
              value={businessInfo.name}
              onChange={e => setBusinessInfo({...businessInfo, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">CNPJ / CPF</label>
            <input 
              className={inputClass}
              value={businessInfo.cnpj}
              onChange={e => setBusinessInfo({...businessInfo, cnpj: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Telefone / WhatsApp</label>
            <input 
              className={inputClass}
              value={businessInfo.phone}
              onChange={e => setBusinessInfo({...businessInfo, phone: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Endereço Completo</label>
            <input 
              className={inputClass}
              value={businessInfo.address}
              onChange={e => setBusinessInfo({...businessInfo, address: e.target.value})}
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-900 text-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-800">
        <div className="p-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-3xl shadow-inner border border-emerald-500/30">
                <Cloud size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Cloud & Sincronização</h2>
                <p className="text-slate-400 text-sm font-medium">Controle de conexão Neon PostgreSQL.</p>
              </div>
            </div>
            <div className="flex bg-slate-800 p-1.5 rounded-2xl">
              <button onClick={() => setDbMode('local')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${dbMode === 'local' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400'}`}>Local</button>
              <button onClick={() => setDbMode('cloud')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${dbMode === 'cloud' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400'}`}>Cloud</button>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-slate-800/50 p-8 rounded-[32px] border border-slate-700/50">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Neon Connection String</label>
              <div className="flex flex-col md:flex-row gap-4">
                <input 
                  type="password"
                  className="flex-1 bg-slate-950 border border-slate-700 p-4 rounded-2xl text-sm font-mono text-emerald-400 outline-none"
                  value={neonUrl}
                  onChange={(e) => setNeonUrl(e.target.value)}
                />
                <button onClick={handleSaveNeon} className="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Salvar</button>
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={handleInitializeTables} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all">Setup de Tabelas</button>
                <button onClick={() => db.initializeTables()} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all">Sincronizar Estrutura</button>
              </div>
              {setupStatus && (
                <div className={`mt-4 p-4 rounded-xl text-xs font-bold ${setupStatus.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {setupStatus.msg}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><ClipboardList size={28} /></div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Checklist Técnico</h2>
        </div>
        <div className="flex gap-4 mb-8">
          <input
            placeholder="Novo item para o checklist..."
            className={inputClass}
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
          />
          <button onClick={handleAddChecklist} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">Add</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {checklist.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl group transition-all">
              <span className="text-sm font-bold text-slate-700">{item}</span>
              <button onClick={() => handleDeleteChecklist(idx)} className="text-slate-300 hover:text-red-500 transition-all"><X size={18} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10">
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 pb-6 border-b border-slate-50 gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><FileText size={28} /></div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Termos de Responsabilidade</h2>
          </div>
          <button 
            onClick={handleSaveAllTerms} 
            disabled={isSaving}
            className={`px-10 py-4 rounded-2xl font-black shadow-lg uppercase text-xs tracking-widest transition-all ${isSaved ? 'bg-emerald-600' : 'bg-indigo-600'} text-white disabled:opacity-50`}
          >
            {isSaved ? <Check className="inline mr-2" size={16}/> : <Save className="inline mr-2" size={16}/>}
            {isSaved ? 'SALVO!' : isSaving ? 'SALVANDO...' : 'SALVAR TERMOS'}
          </button>
        </div>
        <div className="flex gap-2 mb-8 bg-slate-50 p-2 rounded-2xl">
          {['entry', 'budget', 'exit'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTermTab(tab as any)}
              className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTermTab === tab ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}
            >
              {tab === 'entry' ? 'Entrada' : tab === 'budget' ? 'Orçamento' : 'Saída'}
            </button>
          ))}
        </div>
        <textarea
          spellCheck={false}
          className="w-full h-80 border-none bg-slate-50/50 p-8 rounded-3xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm leading-relaxed text-slate-700 shadow-inner whitespace-pre overflow-x-auto"
          value={activeTermTab === 'entry' ? termsEntry : activeTermTab === 'budget' ? termsBudget : termsExit}
          onChange={(e) => {
            if (activeTermTab === 'entry') setTermsEntry(e.target.value);
            if (activeTermTab === 'budget') setTermsBudget(e.target.value);
            if (activeTermTab === 'exit') setTermsExit(e.target.value);
          }}
        />
      </div>
    </div>
  );
};

export default SettingsManager;
