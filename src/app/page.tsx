'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, ReferenceLine, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, Wallet, AlertTriangle, Briefcase, 
  Home, GraduationCap, Plane, Save, RotateCcw, Download, Upload,
  ShoppingCart, Car, Utensils, Heart, Users, Shirt, Trophy, Printer, FileText, Layers,
  CreditCard, DollarSign, Wrench, ShoppingBag
} from 'lucide-react';

// --- Types & Interfaces ---

interface IncomeConfig {
  baseSalaryGross: number; 
  variableBonusGross: number; 
  spotBonusNet: number; 
  salaryIncreasePct: number; 
}

interface ConsultancyConfig {
  isActive: boolean;
  grossMonthly: number; 
  skipAugust: boolean;
}

interface EquityConfig {
  stockPriceUSD: number;
  annualUnits: number; 
  eurUsdRate: number;
  sellOnVest: boolean;
  includeInSavingsRate: boolean; 
}

interface ExpenseConfig {
  // Fixed
  mortgage: number; 
  houseMaintenance: number; 
  utilities: number;
  groceries: number;
  transport: number;
  houseHelp: number; 
  healthcare: number;
  various: number; 
  
  // Lifestyle & Kids
  dining: number; 
  education: number; 
  shopping: number; // Renamed from clothes
  sport: number; 
  activities: number; 
  
  // Travel
  vacationEaster: number; 
  vacationSummer: number; 
  vacationXmas: number; 
}

interface AppState {
  income: IncomeConfig;
  consultancy: ConsultancyConfig;
  equity: EquityConfig;
  expenses: ExpenseConfig;
}

// --- Defaults ---

const DEFAULT_STATE: AppState = {
  income: {
    baseSalaryGross: 160000, 
    variableBonusGross: 57000, 
    spotBonusNet: 3000,
    salaryIncreasePct: 0,
  },
  consultancy: {
    isActive: true,
    grossMonthly: 3161,
    skipAugust: true,
  },
  equity: {
    stockPriceUSD: 180,
    annualUnits: 296, 
    eurUsdRate: 1.08,
    sellOnVest: false,
    includeInSavingsRate: false, 
  },
  expenses: {
    mortgage: 2800,
    houseMaintenance: 300, 
    utilities: 600,
    groceries: 1500,
    transport: 500,
    houseHelp: 800,
    healthcare: 300,
    various: 200, 
    
    dining: 800,
    education: 1200, 
    shopping: 400, 
    sport: 300,   
    activities: 400, 

    vacationEaster: 1500,
    vacationSummer: 6000,
    vacationXmas: 3000,
  }
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Vesting Profile based on 2025 Logic
const VESTING_WEIGHTS = [
  15, // Jan
  15, // Feb
  30, // Mar (Q1 Peak)
  20, // Apr
  21, // May
  42, // Jun (H1 Major)
  20, // Jul
  20, // Aug
  31, // Sep (Q3 Peak)
  20, // Oct
  20, // Nov
  42  // Dec (H2 Major)
];
const TOTAL_WEIGHT = VESTING_WEIGHTS.reduce((a, b) => a + b, 0);

// Chart Colors
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f43f5e', '#8b5cf6'];

// --- Helper Functions ---

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

// Italian Fiscal Engine (Simplified for High Earners)
const calculateItalianNetAnnual = (annualGross: number) => {
  // 1. INPS (Social Security)
  const inpsCap = 119650;
  const inpsLiable = Math.min(annualGross, inpsCap);
  const inps = inpsLiable * 0.0919;

  const taxableIncome = annualGross - inps;

  // 2. IRPEF (2024/25 Brackets)
  let irpef = 0;
  if (taxableIncome <= 28000) {
    irpef = taxableIncome * 0.23;
  } else if (taxableIncome <= 50000) {
    irpef = (28000 * 0.23) + ((taxableIncome - 28000) * 0.35);
  } else {
    irpef = (28000 * 0.23) + (22000 * 0.35) + ((taxableIncome - 50000) * 0.43);
  }

  // 3. Regional/Municipal Add-ons
  const localTax = taxableIncome * 0.025;

  return annualGross - inps - irpef - localTax;
};

// --- The Financial Engine ---

const calculateProjections = (state: AppState) => {
  const { income, consultancy, equity, expenses } = state;
  
  let cumulativeCash = 0;
  let cumulativeWealth = 0;
  let totalTaxBuffer = 0;
  let totalEquityValue = 0;

  // 1. Calculate Monthly Net from Gross Annual
  const adjustedGrossBase = income.baseSalaryGross * (1 + income.salaryIncreasePct / 100);
  const annualBaseNet = calculateItalianNetAnnual(adjustedGrossBase);
  const monthlyBaseNet = annualBaseNet / 14; 

  // 2. Calculate Bonus Net (Marginal Impact)
  const totalGrossForBonus = adjustedGrossBase + income.variableBonusGross;
  const totalNetWithBonus = calculateItalianNetAnnual(totalGrossForBonus);
  const variableBonusNet = totalNetWithBonus - annualBaseNet;

  const projection = MONTHS.map((month, index) => {
    // 1. Income Logic
    let monthlyIncome = monthlyBaseNet;
    if (index === 5) monthlyIncome += monthlyBaseNet; // June (14th)
    if (index === 11) monthlyIncome += monthlyBaseNet; // Dec (13th)

    if (index === 2) monthlyIncome += variableBonusNet; 
    if (index === 11) monthlyIncome += income.spotBonusNet; 

    // 2. Consultancy Logic 
    let consultancyNet = 0;
    let taxDebt = 0;
    
    const isWorkingMonth = !(consultancy.skipAugust && index === 7);
    
    if (consultancy.isActive && isWorkingMonth) {
      consultancyNet = consultancy.grossMonthly * 0.80; 
      taxDebt = consultancy.grossMonthly * (0.43 - 0.20); 
    }

    // 3. Equity Logic
    const monthlyWeight = VESTING_WEIGHTS[index];
    const monthlyUnits = (equity.annualUnits * (monthlyWeight / TOTAL_WEIGHT));
    const vestedValueEUR = (monthlyUnits * equity.stockPriceUSD) / equity.eurUsdRate;
    
    let equityCashFlow = 0;
    let portfolioGrowth = 0;

    if (equity.sellOnVest) {
      equityCashFlow = vestedValueEUR;
    } else {
      portfolioGrowth = vestedValueEUR;
    }

    // 4. Expense Logic
    let monthlyExpenses = 
      expenses.mortgage + 
      expenses.houseMaintenance +
      expenses.utilities +
      expenses.groceries +
      expenses.transport +
      expenses.houseHelp +
      expenses.healthcare +
      expenses.various +
      expenses.dining +
      expenses.education + 
      expenses.shopping +
      expenses.sport +
      expenses.activities;

    // Seasonality
    if (index === 3) monthlyExpenses += expenses.vacationEaster; // April
    if (index === 6 || index === 7) monthlyExpenses += (expenses.vacationSummer / 2);
    if (index === 11) monthlyExpenses += expenses.vacationXmas;

    // 5. Totals
    const totalCashIn = monthlyIncome + consultancyNet + equityCashFlow;
    const netLiquidChange = totalCashIn - monthlyExpenses;
    
    totalTaxBuffer += taxDebt;
    totalEquityValue += vestedValueEUR; 
    
    cumulativeCash += netLiquidChange; 
    cumulativeWealth += (netLiquidChange + portfolioGrowth);

    return {
      name: month,
      salary: monthlyIncome,
      consultancy: consultancyNet,
      equityCash: equityCashFlow,
      totalIncome: totalCashIn,
      expenses: monthlyExpenses,
      netFlow: netLiquidChange,
      taxDebtAccrual: taxDebt,
      cumulativeCash: cumulativeCash,
      cumulativeTaxDebt: totalTaxBuffer,
      portfolioValue: portfolioGrowth,
      vestedValueEUR: vestedValueEUR,
      cumulativeWealth: cumulativeWealth,
    };
  });

  return { projection, totalEquityValue };
};

// --- Components ---

const InputGroup = ({ label, value, onChange, type = "currency", icon: Icon }: any) => (
  <div className="mb-4">
    <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
      {Icon && <Icon size={12} className="text-slate-400" />}
      {label}
    </label>
    <div className="relative">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono shadow-sm"
      />
      <span className="absolute right-3 top-2 text-xs text-slate-400">
        {type === "currency" ? "€" : type === "usd" ? "$" : type === "pct" ? "%" : type === "units" ? "Un" : ""}
      </span>
    </div>
  </div>
);

const Card = ({ title, value, subtext, icon: Icon, alert = false, highlight = false, secondary = false }: any) => (
  <div className={`px-4 py-3 rounded-xl border transition-all duration-300 shadow-sm flex flex-col justify-between min-h-[100px] ${
    alert 
      ? 'bg-amber-50 border-amber-200 text-amber-900' 
      : highlight 
        ? 'bg-emerald-50 border-emerald-100 text-slate-900'
        : secondary
          ? 'bg-rose-50 border-rose-100 text-slate-900'
          : 'bg-white border-slate-200 text-slate-800'
  }`}>
    <div className="flex justify-between items-start">
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${secondary ? 'text-rose-700/70' : alert ? 'text-amber-700/70' : 'text-slate-500'}`}>{title}</p>
        <h3 className="text-2xl font-bold tracking-tight tabular-nums leading-none">{value}</h3>
      </div>
      <div className={`p-1.5 rounded-lg ${
        alert ? 'bg-amber-100/50 text-amber-600' 
        : highlight ? 'bg-emerald-100/50 text-emerald-600' 
        : secondary ? 'bg-rose-100/50 text-rose-600'
        : 'bg-slate-100 text-slate-400'
      }`}>
        <Icon size={16} />
      </div>
    </div>
    {subtext && <p className={`text-[11px] mt-2 font-medium ${alert ? 'text-amber-800/60' : secondary ? 'text-rose-800/60' : highlight ? 'text-emerald-900/40' : 'text-slate-400'}`}>{subtext}</p>}
  </div>
);

const ToggleControl = ({ label, checked, onChange }: any) => (
  <div className="flex items-center justify-between mb-4 p-2 bg-slate-50 rounded-lg border border-slate-200">
    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
    <button 
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  </div>
);

// --- Main Application ---

export default function FinanceDashboard() {
  const [state, setState] = useState<AppState>(() => {
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('finance_dashboard_2026_v13');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error(e); }
      }
    }
    return DEFAULT_STATE;
  });

  useEffect(() => {
    localStorage.setItem('finance_dashboard_2026_v13', JSON.stringify(state));
  }, [state]);

  const { projection, totalEquityValue } = useMemo(() => calculateProjections(state), [state]);
  
  const totals = useMemo(() => {
    const totalCashIncome = projection.reduce((acc, curr) => acc + curr.totalIncome, 0);
    const totalExpenses = projection.reduce((acc, curr) => acc + curr.expenses, 0);
    const taxDebt = projection[11].cumulativeTaxDebt;
    const netLiquidity = projection[11].cumulativeCash; 
    
    // Dynamic Savings Rate Calculation
    // Base: Salary + Consultancy
    const baseCashIncome = projection.reduce((acc, curr) => acc + curr.salary + curr.consultancy, 0);
    
    const equityIncome = state.equity.includeInSavingsRate ? totalEquityValue : 0;
    
    const effectiveIncome = baseCashIncome + equityIncome;
    const effectiveSavings = effectiveIncome - totalExpenses;
    
    const dynamicSavingsRate = effectiveIncome > 0 
      ? (effectiveSavings / effectiveIncome) * 100 
      : 0;

    // Categorization for Pie Chart
    const pieData = [
      { name: 'Fixed (Home/Bills)', value: (state.expenses.mortgage + state.expenses.utilities + state.expenses.houseMaintenance) * 12 },
      { name: 'Living (Food/Help)', value: (state.expenses.groceries + state.expenses.transport + state.expenses.houseHelp + state.expenses.healthcare + state.expenses.various) * 12 },
      { name: 'Lifestyle (Fun/Shop)', value: (state.expenses.dining + state.expenses.shopping + state.expenses.sport) * 12 },
      { name: 'Kids (Edu/Activity)', value: (state.expenses.education + state.expenses.activities) * 12 },
      { name: 'Travel', value: state.expenses.vacationEaster + state.expenses.vacationSummer + state.expenses.vacationXmas },
    ];

    return { totalCashIncome, totalExpenses, taxDebt, netLiquidity, dynamicSavingsRate, pieData };
  }, [projection, totalEquityValue, state.equity.includeInSavingsRate, state.expenses]);

  const resetToDefaults = () => setState(DEFAULT_STATE);
  
  // --- File Handlers ---
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `finplan_2026_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileObj = event.target.files && event.target.files[0];
    if (!fileObj) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        try {
          const parsed = JSON.parse(text);
          if (parsed.income && parsed.expenses) {
             setState(parsed);
          } else {
             alert("Invalid configuration file format.");
          }
        } catch (error) {
          console.error("Invalid JSON file");
          alert("Failed to load file: Invalid JSON.");
        }
      }
    };
    reader.readAsText(fileObj);
    event.target.value = ''; 
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.focus();
      setTimeout(() => {
        window.print();
      }, 200);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100">
      <style>{`
        @media print {
          aside, button, .no-print { display: none !important; }
          main { width: 100% !important; padding: 0 !important; overflow: visible !important; }
          .print-full-width { grid-column: span 3 !important; }
          body { background: white; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div className="flex flex-col lg:flex-row min-h-screen">
        
        {/* --- Sidebar --- */}
        <aside className="w-full lg:w-96 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 overflow-y-auto z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="text-blue-600" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900">FinPlan 2026</h1>
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-widest">Milan HQ • Family Office</p>
          </div>

          <div className="p-6 space-y-2 flex-1">
            
            {/* INCOMES */}
            <div className="bg-emerald-50/50 -mx-6 px-6 py-4 mb-6 border-y border-emerald-100/50">
              <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-4">Inflow Engines</h3>
              
              <InputGroup 
                label="Salary (Annual Gross)" 
                value={state.income.baseSalaryGross} 
                onChange={(val: number) => setState(s => ({ ...s, income: { ...s.income, baseSalaryGross: val } }))}
              />
              <InputGroup 
                label="Bonus (Annual Gross)" 
                value={state.income.variableBonusGross} 
                onChange={(val: number) => setState(s => ({ ...s, income: { ...s.income, variableBonusGross: val } }))}
              />
              
              <div className="mt-6 pt-4 border-t border-emerald-200/50"></div>
              
              <h4 className="text-[10px] font-bold text-emerald-800/70 uppercase tracking-widest mb-3">Equity</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <InputGroup 
                  label="Stock Quantity" 
                  type="units"
                  value={state.equity.annualUnits} 
                  onChange={(val: number) => setState(s => ({ ...s, equity: { ...s.equity, annualUnits: val } }))}
                />
                <InputGroup 
                  label="Stock Price" 
                  type="usd"
                  value={state.equity.stockPriceUSD} 
                  onChange={(val: number) => setState(s => ({ ...s, equity: { ...s.equity, stockPriceUSD: val } }))}
                />
              </div>
               <ToggleControl 
                label="Sell On Vest (Cash Flow)" 
                checked={state.equity.sellOnVest}
                onChange={(val: boolean) => setState(s => ({ ...s, equity: { ...s.equity, sellOnVest: val } }))}
              />
              <ToggleControl 
                label="Include in Savings KPI" 
                checked={state.equity.includeInSavingsRate}
                onChange={(val: boolean) => setState(s => ({ ...s, equity: { ...s.equity, includeInSavingsRate: val } }))}
              />

              <div className="mt-6 pt-4 border-t border-emerald-200/50"></div>
              <div className="flex justify-between items-center mb-2">
                 <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Additional Income</span>
                 <ToggleControl 
                  label="" 
                  checked={state.consultancy.isActive}
                  onChange={(val: boolean) => setState(s => ({ ...s, consultancy: { ...s.consultancy, isActive: val } }))}
                />
              </div>
              
              {state.consultancy.isActive && (
                <>
                  <InputGroup 
                    label="Gross Monthly" 
                    value={state.consultancy.grossMonthly} 
                    onChange={(val: number) => setState(s => ({ ...s, consultancy: { ...s.consultancy, grossMonthly: val } }))}
                  />
                  <ToggleControl 
                    label="Skip August" 
                    checked={state.consultancy.skipAugust}
                    onChange={(val: boolean) => setState(s => ({ ...s, consultancy: { ...s.consultancy, skipAugust: val } }))}
                  />
                </>
              )}
            </div>

            {/* COSTS - Updated Color and Title */}
            <div className="bg-rose-100/40 -mx-6 px-6 py-4 border-y border-rose-200/50">
              <h3 className="text-xs font-bold text-rose-800 uppercase tracking-widest mb-4">Monthly Outflow Engines</h3>

              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Mortgage" icon={Home} value={state.expenses.mortgage} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, mortgage: v}}))} />
                <InputGroup label="Utilities" value={state.expenses.utilities} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, utilities: v}}))} />
                <InputGroup label="Groceries" value={state.expenses.groceries} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, groceries: v}}))} />
                <InputGroup label="Transport" icon={Car} value={state.expenses.transport} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, transport: v}}))} />
                <InputGroup label="Housekeeping" icon={Users} value={state.expenses.houseHelp} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, houseHelp: v}}))} />
                <InputGroup label="Medical" icon={Heart} value={state.expenses.healthcare} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, healthcare: v}}))} />
                <InputGroup label="Shopping" icon={ShoppingBag} value={state.expenses.shopping} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, shopping: v}}))} />
                <InputGroup label="Sport" icon={Trophy} value={state.expenses.sport} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, sport: v}}))} />
                <InputGroup label="House" icon={Wrench} value={state.expenses.houseMaintenance} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, houseMaintenance: v}}))} />
                <InputGroup label="Dining/Fun" icon={Utensils} value={state.expenses.dining} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, dining: v}}))} />
                <InputGroup label="Education" icon={GraduationCap} value={state.expenses.education} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, education: v}}))} />
                <InputGroup label="Various" icon={Layers} value={state.expenses.various} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, various: v}}))} />
              </div>

              <div className="mt-4 pt-4 border-t border-rose-200/50"></div>
              
              <h4 className="text-[10px] font-bold text-rose-800/70 uppercase tracking-widest mb-3">Travel</h4>

              <div className="grid grid-cols-1 gap-2">
                <InputGroup label="Easter (Apr)" icon={Plane} value={state.expenses.vacationEaster} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, vacationEaster: v}}))} />
                <InputGroup label="Summer (Jul+Aug)" icon={Plane} value={state.expenses.vacationSummer} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, vacationSummer: v}}))} />
                <InputGroup label="Xmas (Dec)" icon={Plane} value={state.expenses.vacationXmas} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, vacationXmas: v}}))} />
              </div>
            </div>

          </div>

          <div className="p-6 border-t border-slate-200 grid grid-cols-2 gap-2 bg-slate-50">
             <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept=".json"
            />
            <button onClick={resetToDefaults} className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm transition-all shadow-sm">
              <RotateCcw size={14} /> Reset
            </button>
            <button onClick={handleExport} className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-sm transition-all shadow-sm">
              <Save size={14} /> Save
            </button>
             <button onClick={handleImportClick} className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-sm transition-all shadow-sm">
              <Upload size={14} /> Load
            </button>
            <button onClick={handlePrint} className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 text-sm transition-all shadow-sm">
              <Printer size={14} /> Print / Save PDF
            </button>
          </div>
        </aside>

        {/* --- Main Dashboard --- */}
        <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
          
          <div className="mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Financial Planner</h2>
              <p className="text-sm text-slate-500">Projected cash flow based on Milan fiscal rules.</p>
            </div>
            <div className="no-print">
               <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">Last Update: {new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {/* KPI Grid - Compacted */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
            <Card 
              title="Annual Cash In" 
              value={formatCurrency(totals.totalCashIncome)} 
              subtext="Net Salary + Bonus + Consult." 
              icon={Briefcase} 
              highlight={true}
            />
            <Card 
              title="Annual Costs" 
              value={formatCurrency(totals.totalExpenses)} 
              subtext="Total Annual Outflow" 
              icon={CreditCard} 
              secondary={true}
            />
            <Card 
              title="Net Liquidity" 
              value={formatCurrency(totals.netLiquidity)} 
              subtext="Accumulated Cash (No Equity)" 
              icon={Wallet} 
              highlight={true}
            />
             <Card 
              title="Google Equity" 
              value={formatCurrency(totalEquityValue)} 
              subtext="Gross Asset Value (EUR)" 
              icon={DollarSign} 
              highlight={true}
            />
            <Card 
              title="Cash In Monthly" 
              value={formatCurrency(totals.totalCashIncome / 12)} 
              subtext="Average Monthly Net" 
              icon={Briefcase} 
              highlight={true}
            />
             <Card 
              title="Costs Monthly" 
              value={formatCurrency(totals.totalExpenses / 12)} 
              subtext="Average Burn Rate" 
              icon={CreditCard} 
              secondary={true}
            />
            <Card 
              title={state.equity.includeInSavingsRate ? "Total Savings Rate" : "Cash Savings Rate"}
              value={`${totals.dynamicSavingsRate.toFixed(1)}%`} 
              subtext={state.equity.includeInSavingsRate ? "Incl. Equity" : "Excl. Equity"}
              icon={TrendingUp} 
            />
            <Card 
              title="Tax Trap (SEFO)" 
              value={formatCurrency(totals.taxDebt)} 
              subtext="Saved for IRPEF Adj." 
              icon={AlertTriangle} 
              alert={totals.taxDebt > 1000}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-10">
            {/* 1. Cash Flow Waves */}
            <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm print-full-width">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">Cash Flow Waves</h3>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Income</div>
                </div>
              </div>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={projection} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#94a3b8" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      dy={10}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => `€${val / 1000}k`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                      formatter={(value: any) => formatCurrency(value)}
                    />
                    <ReferenceLine y={0} stroke="#cbd5e1" />
                    <Line type="monotone" dataKey="totalIncome" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

             {/* 2. Burn Rate Composition (New Insight 1) */}
             <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Cost Breakdown</h3>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={totals.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {totals.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 3. Wealth Evolution (New Insight 2) */}
          <div className="grid grid-cols-1 gap-8 mb-10">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm print-full-width">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">Liquidity vs. Net Worth Growth</h3>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Total Net Worth (Cash + Equity)</div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Liquid Cash</div>
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projection} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `€${val / 1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b' }}
                      itemStyle={{ fontSize: '12px' }}
                      formatter={(value: any) => formatCurrency(value)}
                    />
                    <Area type="monotone" dataKey="cumulativeWealth" stroke="#3b82f6" fillOpacity={1} fill="url(#colorNetWorth)" strokeWidth={2} />
                    <Area type="monotone" dataKey="cumulativeCash" stroke="#10b981" fillOpacity={1} fill="url(#colorCash)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-10 shadow-sm print-full-width">
             <div className="p-6 border-b border-slate-100 bg-slate-50/50">
               <h3 className="text-lg font-bold text-slate-800">Monthly Breakdown</h3>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-sm text-left text-slate-600">
                 <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                   <tr>
                     <th className="px-6 py-4 font-bold">Month</th>
                     <th className="px-6 py-4 font-bold text-emerald-600">Income</th>
                     <th className="px-6 py-4 font-bold text-emerald-800/60">Equity (Gross)</th>
                     <th className="px-6 py-4 font-bold text-rose-600">Expenses</th>
                     <th className="px-6 py-4 font-bold text-blue-600">Net Flow</th>
                     <th className="px-6 py-4 font-bold text-amber-600">Tax Debt</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {projection.map((row, i) => (
                     <tr key={i} className="hover:bg-slate-50 transition-colors">
                       <td className="px-6 py-4 font-medium text-slate-900">{row.name}</td>
                       <td className="px-6 py-4 text-emerald-600 font-mono font-medium">{formatCurrency(row.totalIncome)}</td>
                       <td className="px-6 py-4 text-emerald-800/60 font-mono">{formatCurrency(row.vestedValueEUR)}</td>
                       <td className="px-6 py-4 text-rose-600 font-mono font-medium">{formatCurrency(row.expenses)}</td>
                       <td className={`px-6 py-4 font-mono font-bold ${row.netFlow > 0 ? 'text-slate-700' : 'text-rose-600'}`}>
                         {formatCurrency(row.netFlow)}
                       </td>
                       <td className="px-6 py-4 text-amber-600 font-mono">
                         {row.taxDebtAccrual > 0 ? formatCurrency(row.taxDebtAccrual) : '-'}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>

        </main>
      </div>
    </div>
  );
}