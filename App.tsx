
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import CustomerManager from './components/CustomerManager';
import ServiceOrderManager from './components/ServiceOrderManager';
import SettingsManager from './components/SettingsManager';
import ProductManager from './components/ProductManager';
import EquipmentManager from './components/EquipmentManager';
import SalesManager from './components/SalesManager';
import FinancialManager from './components/FinancialManager';
import AccountsManager from './components/AccountsManager';
import { db } from './utils/storage';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    db.initializeTables().catch(err => console.error("Falha ao sincronizar tabelas:", err));
    const handleError = (event: ErrorEvent) => { console.error("Erro capturado:", event.error); };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const renderContent = () => {
    try {
      switch (activeTab) {
        case 'dashboard': return <Dashboard />;
        case 'customers': return <CustomerManager />;
        case 'orders': return <ServiceOrderManager />;
        case 'accounts': return <AccountsManager />;
        case 'finance': return <FinancialManager />;
        case 'settings': return <SettingsManager />;
        case 'products': return <ProductManager mode="products" />;
        case 'services': return <ProductManager mode="services" />;
        case 'equipment': return <EquipmentManager />;
        case 'sales': return <SalesManager />;
        case 'suppliers':
          return (
            <div className="bg-white p-12 rounded-[40px] text-center shadow-sm border border-gray-100 animate-in fade-in">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17h4V5H2v12h3m15 0h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Módulo de Fornecedores</h3>
              <p className="text-gray-500 font-medium max-w-sm mx-auto">Em breve: Gerenciamento completo de compras, notas fiscais e logística de peças.</p>
            </div>
          );
        default: return <Dashboard />;
      }
    } catch (err) {
      return (
        <div className="p-10 bg-red-50 border border-red-200 rounded-[40px] text-center">
          <h2 className="text-xl font-black text-red-600 mb-4">Ocorreu um erro ao carregar este módulo</h2>
          <button onClick={() => window.location.reload()} className="px-12 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-200">Recarregar Sistema</button>
        </div>
      );
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default App;
