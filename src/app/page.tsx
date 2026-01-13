'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, ReferenceLine, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Wallet, AlertTriangle, Briefcase, 
  Home, GraduationCap, Plane, Save, RotateCcw, Download, Upload,
  ShoppingCart, Car, Utensils, Heart, Users, Shirt, Trophy, Printer, FileText, Layers,
  CreditCard, DollarSign, Wrench, ShoppingBag, Building2, Coins, CandlestickChart, Plus, Trash2,
  Landmark, ArrowRight, PieChart as PieChartIcon, BarChart3, SlidersHorizontal, LayoutDashboard,
  Edit3, ChevronDown, ChevronUp
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
  shopping: number; 
  sport: number; 
  activities: number; 
  
  // Travel
  vacationEaster: number; 
  vacationSummer: number; 
  vacationXmas: number; 
}

interface Asset {
  id: string;
  name: string;
  category: 'Real Estate' | 'ETF/Stocks' | 'Crypto' | 'Private Equity' | 'Cash/Liquidity' | 'Pension';
  valueSoY: number; 
  expectedGrowthPct: number; 
}

interface PortfolioItem {
  id: string;
  ticker: string; 
  type: 'Stock' | 'ETF' | 'Crypto' | 'Fund' | 'Bond';
  quantity: number;
  avgPrice: number; 
  priceSoY: number; 
  priceEoY: number; 
}

interface AppState {
  activeTab: 'cashflow' | 'networth' | 'investments';
  income: IncomeConfig;
  consultancy: ConsultancyConfig;
  equity: EquityConfig;
  expenses: ExpenseConfig;
  assets: Asset[];
  portfolio: PortfolioItem[];
  adjustments: {
    income: number[]; 
    expenses: number[]; 
  };
}

// --- Defaults ---

const DEFAULT_STATE: AppState = {
  activeTab: 'cashflow',
  income: {
    baseSalaryGross: 0, 
    variableBonusGross: 0, 
    spotBonusNet: 0,
    salaryIncreasePct: 0,
  },
  consultancy: {
    isActive: true,
    grossMonthly: 0,
    skipAugust: true,
  },
  equity: {
    stockPriceUSD: 0,
    annualUnits: 0, 
    eurUsdRate: 1.08,
    sellOnVest: false,
    includeInSavingsRate: false, 
  },
  expenses: {
    mortgage: 0,
    houseMaintenance: 0, 
    utilities: 0,
    groceries: 0,
    transport: 0,
    houseHelp: 0,
    healthcare: 0,
    various: 0, 
    dining: 0,
    education: 0, 
    shopping: 0, 
    sport: 0,   
    activities: 0, 
    vacationEaster: 0,
    vacationSummer: 0,
    vacationXmas: 0,
  },
  assets: [
    { id: '1', name: 'Main House', category: 'Real Estate', valueSoY: 0, expectedGrowthPct: 2 },
    { id: '2', name: 'Angel Investments', category: 'Private Equity', valueSoY: 0, expectedGrowthPct: 0 },
  ],
  portfolio: [
    { id: '1', ticker: 'VWCE', type: 'ETF', quantity: 0, avgPrice: 0, priceSoY: 0, priceEoY: 0 },
    { id: '2', ticker: 'BTC', type: 'Crypto', quantity: 0, avgPrice: 0, priceSoY: 0, priceEoY: 0 },
  ],
  adjustments: {
    income: Array(12).fill(0),
    expenses: Array(12).fill(0),
  }
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const VESTING_WEIGHTS = [15, 15, 30, 20, 21, 42, 20, 20, 31, 20, 20, 42];
const TOTAL_WEIGHT = VESTING_WEIGHTS.reduce((a, b) => a + b, 0);

// Chart Colors
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f43f5e', '#8b5cf6', '#6366f1'];
const ASSET_COLORS = {
  'Real Estate': '#f59e0b',
  'ETF/Stocks': '#3b82f6',
  'Crypto': '#8b5cf6',
  'Private Equity': '#ec4899',
  'Cash/Liquidity': '#10b981',
  'Pension': '#64748b'
};
const PORTFOLIO_COLORS = {
  'Stock': '#3b82f6',
  'ETF': '#10b981',
  'Crypto': '#f59e0b',
  'Fund': '#8b5cf6',
  'Bond': '#64748b'
};

// --- Helper Functions ---

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

const formatCompact = (val: number) => 
  new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(val);

const formatInputDisplay = (val: number): string => {
  if (val === 0) return '';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val);
};

const parseInputToNumber = (val: string): number => {
  const cleanVal = val.replace(/,/g, '');
  const num = parseFloat(cleanVal);
  return isNaN(num) ? 0 : num;
};

// Italian Fiscal Engine
const calculateItalianNetAnnual = (annualGross: number) => {
  const inpsCap = 119650;
  const inpsLiable = Math.min(annualGross, inpsCap);
  const inps = inpsLiable * 0.0919;
  const taxableIncome = annualGross - inps;
  
  let irpef = 0;
  if (taxableIncome <= 28000) {
    irpef = taxableIncome * 0.23;
  } else if (taxableIncome <= 50000) {
    irpef = (28000 * 0.23) + ((taxableIncome - 28000) * 0.35);
  } else {
    irpef = (28000 * 0.23) + (22000 * 0.35) + ((taxableIncome - 50000) * 0.43);
  }
  const localTax = taxableIncome * 0.025;
  return annualGross - inps - irpef - localTax;
};

// --- Engines ---

const calculateCashFlow = (state: AppState) => {
  const { income, consultancy, equity, expenses, adjustments } = state;
  
  let cumulativeCash = 0;
  let cumulativeWealth = 0;
  let totalTaxBuffer = 0;
  let totalEquityValue = 0;

  const adjustedGrossBase = income.baseSalaryGross * (1 + income.salaryIncreasePct / 100);
  const annualBaseNet = calculateItalianNetAnnual(adjustedGrossBase);
  const monthlyBaseNet = annualBaseNet / 14; 

  const totalGrossForBonus = adjustedGrossBase + income.variableBonusGross;
  const totalNetWithBonus = calculateItalianNetAnnual(totalGrossForBonus);
  const variableBonusNet = totalNetWithBonus - annualBaseNet;

  const projection = MONTHS.map((month, index) => {
    // 1. FORECAST CALCULATIONS
    let monthlyIncome = monthlyBaseNet;
    if (index === 5) monthlyIncome += monthlyBaseNet; 
    if (index === 11) monthlyIncome += monthlyBaseNet; 

    if (index === 2) monthlyIncome += variableBonusNet; 
    if (index === 11) monthlyIncome += income.spotBonusNet; 

    // COCOCO LOGIC (Based on SEFO5 PDF)
    let consultancyNet = 0;
    let taxDebt = 0;
    const isWorkingMonth = !(consultancy.skipAugust && index === 7);
    if (consultancy.isActive && isWorkingMonth) {
      consultancyNet = consultancy.grossMonthly * 0.65; // ~65% Netto Busta
      taxDebt = consultancy.grossMonthly * 0.15; // 15% Conguaglio
    }

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

    let monthlyExpenses = 
      expenses.mortgage + expenses.houseMaintenance + expenses.utilities +
      expenses.groceries + expenses.transport + expenses.houseHelp +
      expenses.healthcare + expenses.various + expenses.dining +
      expenses.education + expenses.shopping + expenses.sport + expenses.activities;

    if (index === 3) monthlyExpenses += expenses.vacationEaster;
    if (index === 6 || index === 7) monthlyExpenses += (expenses.vacationSummer / 2);
    if (index === 11) monthlyExpenses += expenses.vacationXmas;

    // 2. ACTUALS OVERRIDE LOGIC
    const actualIncome = adjustments.income[index] || 0;
    const actualExpense = adjustments.expenses[index] || 0;

    const forecastTotalCashIn = monthlyIncome + consultancyNet + equityCashFlow;
    // IF Actual > 0, use Actual, else Forecast
    const totalCashIn = actualIncome > 0 ? actualIncome : forecastTotalCashIn;

    const forecastTotalExpenses = monthlyExpenses;
    const totalExpenses = actualExpense > 0 ? actualExpense : forecastTotalExpenses;

    const netLiquidChange = totalCashIn - totalExpenses;
    
    totalTaxBuffer += taxDebt; 
    totalEquityValue += vestedValueEUR; 
    cumulativeCash += netLiquidChange; 
    cumulativeWealth += (netLiquidChange + portfolioGrowth);

    return {
      name: month,
      salary: monthlyIncome,
      consultancy: consultancyNet,
      equityCash: equityCashFlow,
      adjIncome: actualIncome, 
      forecastIncome: forecastTotalCashIn,
      totalIncome: totalCashIn,
      expenses: totalExpenses,
      forecastExpenses: forecastTotalExpenses,
      adjExpense: actualExpense, 
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

const calculateNetWorth = (state: AppState, cashSavingsFromFlow: number) => {
  const assetsEoY = state.assets.map(asset => {
    const growthAmount = asset.valueSoY * (asset.expectedGrowthPct / 100);
    return {
      ...asset,
      growthAmount,
      valueEoY: asset.valueSoY + growthAmount
    };
  });

  const totalSoY = state.assets.reduce((sum, a) => sum + a.valueSoY, 0);
  const totalMarketGrowth = assetsEoY.reduce((sum, a) => sum + a.growthAmount, 0);
  const totalEoY = totalSoY + totalMarketGrowth + cashSavingsFromFlow;

  const bridgeData = [
    { name: 'Jan 1 (SoY)', start: 0, change: totalSoY, total: totalSoY, fill: '#64748b' },
    { name: 'Market Growth', start: totalSoY, change: totalMarketGrowth, total: totalSoY + totalMarketGrowth, fill: '#3b82f6' },
    { name: 'Cash Savings', start: totalSoY + totalMarketGrowth, change: cashSavingsFromFlow, total: totalEoY, fill: '#10b981' },
    { name: 'Dec 31 (EoY)', start: 0, change: totalEoY, total: totalEoY, fill: '#0f172a' },
  ];

  const allocationData = state.assets.reduce((acc, asset) => {
    const existing = acc.find(x => x.name === asset.category);
    if (existing) {
      existing.value += asset.valueSoY;
    } else {
      acc.push({ name: asset.category, value: asset.valueSoY });
    }
    return acc;
  }, [] as { name: string, value: number }[]);

  if (cashSavingsFromFlow > 0) {
    const cashCat = allocationData.find(x => x.name === 'Cash/Liquidity');
    if (cashCat) cashCat.value += cashSavingsFromFlow;
    else allocationData.push({ name: 'Cash/Liquidity', value: cashSavingsFromFlow });
  }

  return { assetsEoY, totalSoY, totalMarketGrowth, totalEoY, bridgeData, allocationData };
};

const calculatePortfolio = (state: AppState) => {
  let totalInvested = 0;
  let totalValueSoY = 0;
  let totalValueEoY = 0;

  const items = state.portfolio.map(item => {
    const invested = item.quantity * item.avgPrice;
    const valueSoY = item.quantity * item.priceSoY;
    const valueEoY = item.quantity * item.priceEoY;
    
    totalInvested += invested;
    totalValueSoY += valueSoY;
    totalValueEoY += valueEoY;

    return {
      ...item,
      invested,
      valueSoY,
      valueEoY,
      plTotal: valueEoY - invested,
      plTotalPct: invested > 0 ? ((valueEoY - invested) / invested) * 100 : 0,
      plYtd: valueEoY - valueSoY,
      plYtdPct: valueSoY > 0 ? ((valueEoY - valueSoY) / valueSoY) * 100 : 0,
    };
  });

  const allocationData = items.reduce((acc, item) => {
    const existing = acc.find(x => x.name === item.type);
    if (existing) existing.value += item.valueEoY;
    else acc.push({ name: item.type, value: item.valueEoY });
    return acc;
  }, [] as { name: string, value: number }[]);

  const performanceData = [
    { name: 'Invested', value: totalInvested, fill: '#64748b' },
    { name: 'Jan 1 Value', value: totalValueSoY, fill: '#3b82f6' },
    { name: 'Dec 31 Value', value: totalValueEoY, fill: '#10b981' },
  ];

  return { items, totalInvested, totalValueSoY, totalValueEoY, allocationData, performanceData };
};

// --- Components ---

const InputGroup = ({ label, value, onChange, type = "currency", icon: Icon }: any) => (
  <div className="mb-2">
    <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
      {Icon && <Icon size={12} className="text-slate-400" />}
      {label}
    </label>
    <div className="relative">
      <input
        type="text" 
        inputMode="decimal" 
        value={formatInputDisplay(value)}
        onChange={(e) => onChange(parseInputToNumber(e.target.value))}
        placeholder="add value"
        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 transition-all font-mono shadow-sm placeholder:text-slate-300"
      />
    </div>
  </div>
);

const AssetRow = ({ asset, onChange, onRemove }: { asset: Asset, onChange: (a: Asset) => void, onRemove: () => void }) => (
  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
    <div className="mb-2 flex items-center justify-between">
      <input 
        type="text" 
        value={asset.name} 
        onChange={(e) => onChange({ ...asset, name: e.target.value })}
        className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none placeholder:text-slate-300 w-full"
        placeholder="Asset Name"
      />
      <button onClick={onRemove} className="text-slate-400 hover:text-red-500 transition-colors">
        <Trash2 size={14} />
      </button>
    </div>
    <div className="grid grid-cols-2 gap-2 mb-2">
      <div>
        <label className="text-[10px] text-slate-400 uppercase font-bold">Value (Jan 1)</label>
        <input 
          type="text" 
          inputMode="decimal"
          value={formatInputDisplay(asset.valueSoY)}
          onChange={(e) => onChange({ ...asset, valueSoY: parseInputToNumber(e.target.value) })}
          className="w-full text-xs p-1 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-blue-500" 
          placeholder="0"
        />
      </div>
      <div>
        <label className="text-[10px] text-slate-400 uppercase font-bold">Growth %</label>
        <input 
          type="text"
          inputMode="decimal"
          value={formatInputDisplay(asset.expectedGrowthPct)}
          onChange={(e) => onChange({ ...asset, expectedGrowthPct: parseInputToNumber(e.target.value) })}
          className="w-full text-xs p-1 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-blue-500" 
          placeholder="0"
        />
      </div>
    </div>
    <select 
      value={asset.category}
      onChange={(e) => onChange({ ...asset, category: e.target.value as any })}
      className="w-full text-xs p-1 bg-slate-50 border border-slate-200 rounded text-slate-600 focus:outline-none focus:border-blue-500"
    >
      <option value="Real Estate">Real Estate</option>
      <option value="ETF/Stocks">ETF/Stocks</option>
      <option value="Crypto">Crypto</option>
      <option value="Private Equity">Private Equity</option>
      <option value="Cash/Liquidity">Cash/Liquidity</option>
      <option value="Pension">Pension</option>
    </select>
  </div>
);

const KPICard = ({ title, value, subtext, icon: Icon, alert = false, highlight = false, secondary = false, neutral = false }: any) => (
  <div className={`p-4 rounded-xl border-l-4 shadow-sm mb-3 transition-all ${
    alert ? 'bg-amber-50 border-amber-400' : 
    highlight ? 'bg-emerald-50 border-emerald-400' : 
    secondary ? 'bg-rose-50 border-rose-400' : 
    neutral ? 'bg-white border-slate-300' :
    'bg-white border-blue-400'
  }`}>
    <div className="flex justify-between items-start mb-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
      {Icon && <Icon size={14} className="text-slate-400" />}
    </div>
    <h3 className="text-xl font-bold tracking-tight text-slate-800 tabular-nums">{value}</h3>
    {subtext && <p className="text-[10px] text-slate-400 mt-1">{subtext}</p>}
  </div>
);

const ToggleControl = ({ label, checked, onChange }: any) => (
  <div className="flex items-center justify-between mb-2 p-2 bg-slate-50 rounded border border-slate-200">
    <span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span>
    <button 
      onClick={() => onChange(!checked)}
      className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  </div>
);

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-2 mb-4 mt-6 first:mt-0 pb-2 border-b border-slate-100">
    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
  </div>
);

// --- Main Application ---

export default function FinanceDashboard() {
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  
  const [state, setState] = useState<AppState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('finance_dashboard_2026_v22');
      if (saved) {
        try { 
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_STATE, ...parsed, adjustments: parsed.adjustments || DEFAULT_STATE.adjustments }; 
        } catch (e) { console.error(e); }
      }
    }
    return DEFAULT_STATE;
  });

  useEffect(() => {
    localStorage.setItem('finance_dashboard_2026_v22', JSON.stringify(state));
  }, [state]);

  // Engines
  const { projection, totalEquityValue } = useMemo(() => calculateCashFlow(state), [state]);
  
  const cashFlowTotals = useMemo(() => {
    const totalCashIncome = projection.reduce((acc, curr) => acc + curr.totalIncome, 0);
    const totalExpenses = projection.reduce((acc, curr) => acc + curr.expenses, 0);
    const taxDebt = projection[11].cumulativeTaxDebt;
    const netLiquidity = projection[11].cumulativeCash; 
    
    const baseCashIncome = projection.reduce((acc, curr) => acc + curr.salary + curr.consultancy, 0);
    const equityIncome = state.equity.includeInSavingsRate ? totalEquityValue : 0;
    const effectiveIncome = baseCashIncome + equityIncome;
    const effectiveSavings = effectiveIncome - totalExpenses;
    const dynamicSavingsRate = effectiveIncome > 0 ? (effectiveSavings / effectiveIncome) * 100 : 0;

    const pieData = [
      { name: 'Housing & Utilities', value: (state.expenses.mortgage + state.expenses.utilities + state.expenses.houseMaintenance) * 12 },
      { name: 'Daily Living', value: (state.expenses.groceries + state.expenses.transport + state.expenses.houseHelp + state.expenses.healthcare + state.expenses.various) * 12 },
      { name: 'Lifestyle & Sport', value: (state.expenses.dining + state.expenses.shopping + state.expenses.sport) * 12 },
      { name: 'Education', value: (state.expenses.education + state.expenses.activities) * 12 },
      { name: 'Travel', value: state.expenses.vacationEaster + state.expenses.vacationSummer + state.expenses.vacationXmas },
    ];

    return { totalCashIncome, totalExpenses, taxDebt, netLiquidity, dynamicSavingsRate, pieData };
  }, [projection, totalEquityValue, state.equity.includeInSavingsRate, state.expenses]);

  const netWorthTotals = useMemo(() => {
    return calculateNetWorth(state, cashFlowTotals.netLiquidity);
  }, [state.assets, cashFlowTotals.netLiquidity]);

  const portfolioTotals = useMemo(() => {
    return calculatePortfolio(state);
  }, [state.portfolio]);

  const resetToDefaults = () => setState(DEFAULT_STATE);
  
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.focus();
      setTimeout(() => { window.print(); }, 200);
    }
  };

  // Asset Handlers
  const handleAddAsset = () => {
    setState(prev => ({ ...prev, assets: [...prev.assets, { id: Math.random().toString(36).substr(2, 9), name: 'New Asset', category: 'ETF/Stocks', valueSoY: 0, expectedGrowthPct: 5 }] }));
  };
  const handleUpdateAsset = (updated: Asset) => {
    setState(prev => ({ ...prev, assets: prev.assets.map(a => a.id === updated.id ? updated : a) }));
  };
  const handleRemoveAsset = (id: string) => {
    setState(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }));
  };

  // Portfolio Handlers
  const handleAddPortfolioItem = () => {
    setState(prev => ({ ...prev, portfolio: [...prev.portfolio, { id: Math.random().toString(36).substr(2, 9), ticker: 'NEW', type: 'Stock', quantity: 0, avgPrice: 0, priceSoY: 0, priceEoY: 0 }] }));
  };
  const handleUpdatePortfolioItem = (updated: PortfolioItem) => {
    setState(prev => ({ ...prev, portfolio: prev.portfolio.map(p => p.id === updated.id ? updated : p) }));
  };
  const handleRemovePortfolioItem = (id: string) => {
    setState(prev => ({ ...prev, portfolio: prev.portfolio.filter(p => p.id !== id) }));
  };

  const handleAdjustmentChange = (type: 'income' | 'expenses', index: number, value: number) => {
    setState(prev => {
      const newAdj = [...prev.adjustments[type]];
      newAdj[index] = value;
      return { ...prev, adjustments: { ...prev.adjustments, [type]: newAdj } };
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 flex flex-col lg:flex-row">
      
      {/* --- LEFT SIDEBAR: SCOREBOARD (KPIs) --- */}
      <aside className="w-full lg:w-80 bg-slate-50 border-r border-slate-200 flex flex-col lg:h-screen lg:sticky top-0 lg:overflow-y-auto z-20">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="text-blue-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">FinFamily 2026</h1>
          </div>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Scoreboard</p>
        </div>

        {/* Navigation */}
        <div className="px-6 mb-6">
          <div className="flex p-1 bg-white rounded-lg border border-slate-200 shadow-sm">
            <button onClick={() => setState(s => ({ ...s, activeTab: 'cashflow' }))} className={`flex-1 text-[10px] font-bold py-2 rounded transition-all ${state.activeTab === 'cashflow' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}>CASH FLOW</button>
            <button onClick={() => setState(s => ({ ...s, activeTab: 'networth' }))} className={`flex-1 text-[10px] font-bold py-2 rounded transition-all ${state.activeTab === 'networth' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}>ASSETS</button>
            <button onClick={() => setState(s => ({ ...s, activeTab: 'investments' }))} className={`flex-1 text-[10px] font-bold py-2 rounded transition-all ${state.activeTab === 'investments' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}>PORTFOLIO</button>
          </div>
        </div>

        {/* Dynamic KPI Cards List */}
        <div className="flex-1 px-6 space-y-2 overflow-y-auto">
          {state.activeTab === 'cashflow' && (
            <>
              {/* --- GROUP 1: ANNUAL CASH FLOW --- */}
              <KPICard title="Annual Cash In" value={formatCurrency(cashFlowTotals.totalCashIncome)} subtext="Salary + Bonus + Extra (No Equity)" icon={Briefcase} highlight={true} />
              <KPICard title="Annual Cash Out" value={formatCurrency(cashFlowTotals.totalExpenses)} subtext="Total Burn" icon={CreditCard} secondary={true} />
              <KPICard title="Annual Cash Saving" value={formatCurrency(cashFlowTotals.netLiquidity)} subtext="Net Flow (No Equity)" icon={Wallet} highlight={true} />
              
              <div className="border-t border-slate-200 my-4"></div>
              
              {/* --- GROUP 2: MONTHLY & RATIOS --- */}
              <KPICard title="Avg Monthly In" value={formatCurrency(cashFlowTotals.totalCashIncome / 12)} icon={ArrowRight} highlight={true} />
              <KPICard title="Avg Monthly Out" value={formatCurrency(cashFlowTotals.totalExpenses / 12)} icon={ArrowRight} secondary={true} />
              <KPICard title={state.equity.includeInSavingsRate ? "Total Savings Rate" : "Cash Savings Rate"} value={`${cashFlowTotals.dynamicSavingsRate.toFixed(1)}%`} subtext="Efficiency Ratio" icon={TrendingUp} />

              <div className="border-t border-slate-200 my-4"></div>

              {/* --- GROUP 3: EQUITY --- */}
              <KPICard title="Equity Value" value={formatCurrency(totalEquityValue)} subtext="Gross Equity Value accumulated annually" icon={DollarSign} neutral={true} />

              <div className="border-t border-slate-200 my-4"></div>

              {/* --- GROUP 4: TAX --- */}
              {state.consultancy.isActive && (
                <KPICard title="Tax Trap" value={formatCurrency(cashFlowTotals.taxDebt)} subtext="Set Aside for Taxes" icon={AlertTriangle} alert={cashFlowTotals.taxDebt > 1000} />
              )}
            </>
          )}

          {state.activeTab === 'networth' && (
            <>
              <KPICard title="Start of Year" value={formatCompact(netWorthTotals.totalSoY)} subtext="Jan 1 Assets" icon={Landmark} neutral={true} />
              <KPICard title="End of Year" value={formatCompact(netWorthTotals.totalEoY)} subtext="Dec 31 Projection" icon={Building2} highlight={true} />
              <div className="border-t border-slate-200 my-4"></div>
              <KPICard title="Market Growth" value={formatCurrency(netWorthTotals.totalMarketGrowth)} subtext="Capital Gains" icon={TrendingUp} neutral={true} />
              <KPICard title="Cash Contribution" value={formatCurrency(cashFlowTotals.netLiquidity)} subtext="From Savings" icon={Wallet} neutral={true} />
            </>
          )}

          {state.activeTab === 'investments' && (
            <>
              <KPICard title="Market Value (EoY)" value={formatCurrency(portfolioTotals.totalValueEoY)} subtext="Projected Total" icon={BarChart3} highlight={true} />
              <KPICard title="Total Invested" value={formatCompact(portfolioTotals.totalInvested)} subtext="Cost Basis" icon={Layers} neutral={true} />
              <KPICard title="Unrealized P/L" value={formatCurrency(portfolioTotals.totalValueEoY - portfolioTotals.totalInvested)} subtext="Since Inception" icon={TrendingUp} alert={(portfolioTotals.totalValueEoY - portfolioTotals.totalInvested) < 0} />
              <div className="border-t border-slate-200 my-4"></div>
              <KPICard title="YTD Growth" value={formatCurrency(portfolioTotals.totalValueEoY - portfolioTotals.totalValueSoY)} subtext="This Year Only" icon={ArrowRight} neutral={true} />
            </>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 grid grid-cols-2 gap-2">
            <button onClick={resetToDefaults} className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all shadow-sm">
              <RotateCcw size={12} /> RESET
            </button>
            <button onClick={handlePrint} className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-sm">
              <Printer size={12} /> PDF
            </button>
        </div>
      </aside>

      {/* --- MAIN AREA: WORKSPACE (Inputs & Charts) --- */}
      <main className="flex-1 p-6 lg:p-10 lg:overflow-y-auto bg-white">
        
        {/* INPUT SECTION (Configuration) */}
        <div className="mb-10 animate-in slide-in-from-bottom-4 duration-500">
           {state.activeTab === 'cashflow' && (
             <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div 
                 className="p-6 flex items-center justify-between cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
                 onClick={() => setIsConfigOpen(!isConfigOpen)}
               >
                 <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                   <SlidersHorizontal size={16} /> 2026 In/Out Estimations
                 </h2>
                 {isConfigOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
               </div>
               
               {isConfigOpen && (
                 <div className="p-6 pt-0 border-t border-slate-200 bg-white">
                   <div className="mt-6 space-y-6">
                     
                     {/* IN SECTION */}
                     <div className="bg-emerald-50/40 rounded-xl border border-emerald-100 p-5">
                       <div className="flex items-center gap-2 mb-4 text-emerald-800 border-b border-emerald-200 pb-2">
                         <TrendingUp size={16} />
                         <span className="text-xs font-bold uppercase tracking-widest">Cash In Estimates</span>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           {/* Income Inputs */}
                           <div>
                             <SectionHeader title="Salary & Bonus" />
                             <InputGroup label="Salary (Annual Gross)" value={state.income.baseSalaryGross} onChange={(val: number) => setState(s => ({ ...s, income: { ...s.income, baseSalaryGross: val } }))} />
                             <InputGroup label="Bonus (Annual Gross)" value={state.income.variableBonusGross} onChange={(val: number) => setState(s => ({ ...s, income: { ...s.income, variableBonusGross: val } }))} />
                             <div className="pt-2">
                                <ToggleControl label="Additional Income" checked={state.consultancy.isActive} onChange={(val: boolean) => setState(s => ({ ...s, consultancy: { ...s.consultancy, isActive: val } }))} />
                                {state.consultancy.isActive && (
                                  <>
                                    <InputGroup label="Monthly Gross" value={state.consultancy.grossMonthly} onChange={(val: number) => setState(s => ({ ...s, consultancy: { ...s.consultancy, grossMonthly: val } }))} />
                                    <ToggleControl label="Skip August" checked={state.consultancy.skipAugust} onChange={(val: boolean) => setState(s => ({ ...s, consultancy: { ...s.consultancy, skipAugust: val } }))} />
                                  </>
                                )}
                             </div>
                           </div>
                           {/* Equity Inputs */}
                           <div>
                             <SectionHeader title="Equity (RSU)" />
                             <div className="grid grid-cols-2 gap-2">
                                <InputGroup label="Units" type="units" value={state.equity.annualUnits} onChange={(val: number) => setState(s => ({ ...s, equity: { ...s.equity, annualUnits: val } }))} />
                                <InputGroup label="Price ($)" type="usd" value={state.equity.stockPriceUSD} onChange={(val: number) => setState(s => ({ ...s, equity: { ...s.equity, stockPriceUSD: val } }))} />
                             </div>
                             <div className="pt-2 space-y-1">
                                <ToggleControl label="Sell On Vest" checked={state.equity.sellOnVest} onChange={(val: boolean) => setState(s => ({ ...s, equity: { ...s.equity, sellOnVest: val } }))} />
                                <ToggleControl label="Incl. in Cash Savings" checked={state.equity.includeInSavingsRate} onChange={(val: boolean) => setState(s => ({ ...s, equity: { ...s.equity, includeInSavingsRate: val } }))} />
                             </div>
                           </div>
                       </div>
                     </div>

                     {/* OUT SECTION */}
                     <div className="bg-rose-50/40 rounded-xl border border-rose-100 p-5">
                       <div className="flex items-center gap-2 mb-4 text-rose-800 border-b border-rose-200 pb-2">
                          <TrendingDown size={16} />
                          <span className="text-xs font-bold uppercase tracking-widest">Cash Out Estimates</span>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           {/* Outflow 1 */}
                           <div>
                               <SectionHeader title="Fixed & Living" />
                               <InputGroup label="Mortgage" icon={Home} value={state.expenses.mortgage} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, mortgage: v}}))} />
                               <InputGroup label="Utilities" value={state.expenses.utilities} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, utilities: v}}))} />
                               <InputGroup label="Groceries" value={state.expenses.groceries} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, groceries: v}}))} />
                               <InputGroup label="Transport" icon={Car} value={state.expenses.transport} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, transport: v}}))} />
                               <InputGroup label="Housekeeping" icon={Users} value={state.expenses.houseHelp} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, houseHelp: v}}))} />
                               <InputGroup label="Medical" icon={Heart} value={state.expenses.healthcare} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, healthcare: v}}))} />
                           </div>
                           {/* Outflow 2 */}
                           <div>
                               <SectionHeader title="Lifestyle & Kids" />
                               <div className="grid grid-cols-2 gap-2">
                                  <InputGroup label="Shopping" icon={ShoppingBag} value={state.expenses.shopping} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, shopping: v}}))} />
                                  <InputGroup label="Dining" icon={Utensils} value={state.expenses.dining} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, dining: v}}))} />
                               </div>
                               <InputGroup label="Education" icon={GraduationCap} value={state.expenses.education} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, education: v}}))} />
                               <InputGroup label="Activities" icon={Trophy} value={state.expenses.activities} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, activities: v}}))} />
                               <InputGroup label="Various" icon={Layers} value={state.expenses.various} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, various: v}}))} />
                               
                               <div className="mt-4"></div>
                               <SectionHeader title="Travel" />
                               <div className="grid grid-cols-3 gap-2">
                                  <InputGroup label="Easter" value={state.expenses.vacationEaster} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, vacationEaster: v}}))} />
                                  <InputGroup label="Summer" value={state.expenses.vacationSummer} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, vacationSummer: v}}))} />
                                  <InputGroup label="Xmas" value={state.expenses.vacationXmas} onChange={(v:number) => setState(s => ({...s, expenses: {...s.expenses, vacationXmas: v}}))} />
                               </div>
                           </div>
                       </div>
                     </div>

                   </div>
                 </div>
               )}
             </div>
           )}

           {state.activeTab === 'networth' && (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 shadow-sm">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                       <Building2 size={16} /> Asset Inventory
                    </h2>
                    <button onClick={handleAddAsset} className="text-xs flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 shadow-sm transition-all">
                       <Plus size={14} /> Add Asset
                    </button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {state.assets.map(asset => (
                       <AssetRow key={asset.id} asset={asset} onChange={handleUpdateAsset} onRemove={() => handleRemoveAsset(asset.id)} />
                    ))}
                 </div>
              </div>
           )}

            {state.activeTab === 'investments' && (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 shadow-sm">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                       <Coins size={16} /> Portfolio Holdings
                    </h2>
                    <button onClick={handleAddPortfolioItem} className="text-xs flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 shadow-sm transition-all">
                       <Plus size={14} /> Add Holding
                    </button>
                 </div>
                 {/* This section's inputs are the table rows below, so we keep it simple here */}
                 <p className="text-xs text-slate-500">
                    Enter your positions in the table below to calculate YTD performance and Total P/L.
                 </p>
              </div>
           )}
        </div>

        {/* OUTPUT SECTION (Charts & Tables) */}
        <div>
           {state.activeTab === 'cashflow' && (
             <div className="space-y-8">
               
               {/* Monthly Ledger Table - Moved Above Charts */}
               <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Edit3 size={18} className="text-blue-600" />
                    <h3 className="text-lg font-bold text-slate-800">Actual Cash Flow (monthly ledger)</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-medium bg-white px-2 py-1 rounded border border-slate-200">
                    Edit cells to override forecasts
                  </span>
                </div>
                 <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500">
                      <tr>
                        <th className="px-4 py-4 w-24">Month</th>
                        <th className="px-4 py-4 w-40 text-emerald-700">Cash In (Actual)</th>
                        <th className="px-4 py-4 w-40 text-rose-700">Cash Out (Actual)</th>
                        <th className="px-4 py-4 text-emerald-600/70 text-right hidden md:table-cell">Est. In</th>
                        <th className="px-4 py-4 text-rose-600/70 text-right hidden md:table-cell">Est. Out</th>
                        <th className="px-4 py-4 text-blue-600 text-right">Net Flow</th>
                        <th className="px-4 py-4 text-amber-600 text-right">Tax Trap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {projection.map((row, i) => (
                        <tr key={i} className={`hover:bg-slate-50 transition-colors ${row.adjIncome > 0 || row.adjExpense > 0 ? 'bg-blue-50/30' : ''}`}>
                          <td className="px-4 py-3 font-bold text-slate-800">{row.name}</td>
                          
                          {/* INCOME INPUT */}
                          <td className="px-4 py-2">
                            <div className="relative">
                              <input 
                                type="text"
                                inputMode="decimal"
                                value={formatInputDisplay(row.adjIncome)}
                                onChange={(e) => handleAdjustmentChange('income', i, parseInputToNumber(e.target.value))}
                                className={`w-full text-right p-2 rounded border shadow-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono font-bold placeholder:text-slate-500 ${
                                  row.adjIncome > 0 
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                    : 'bg-white border-slate-300 text-slate-700 hover:border-emerald-400'
                                }`}
                                placeholder={formatCompact(row.forecastIncome)}
                              />
                            </div>
                          </td>

                          {/* EXPENSE INPUT */}
                          <td className="px-4 py-2">
                            <div className="relative">
                              <input 
                                type="text"
                                inputMode="decimal"
                                value={formatInputDisplay(row.adjExpense)}
                                onChange={(e) => handleAdjustmentChange('expenses', i, parseInputToNumber(e.target.value))}
                                className={`w-full text-right p-2 rounded border shadow-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all font-mono font-bold placeholder:text-slate-500 ${
                                  row.adjExpense > 0 
                                    ? 'bg-rose-50 border-rose-200 text-rose-700' 
                                    : 'bg-white border-slate-300 text-slate-700 hover:border-rose-400'
                                }`}
                                placeholder={formatCompact(row.forecastExpenses)}
                              />
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right font-mono text-xs text-slate-400 hidden md:table-cell">{formatCompact(row.forecastIncome)}</td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-slate-400 hidden md:table-cell">{formatCompact(row.forecastExpenses)}</td>
                          
                          <td className={`px-4 py-3 text-right font-mono font-bold ${row.netFlow > 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                            {formatCurrency(row.netFlow)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-amber-600">
                            {row.taxDebtAccrual > 0 ? formatCurrency(row.taxDebtAccrual) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
               </div>

               <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                 <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-[400px]">
                   <h3 className="text-lg font-bold text-slate-800 mb-4">Cash Flow Waves</h3>
                   <ResponsiveContainer width="100%" height="100%">
                     <ComposedChart data={projection} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `€${val/1000}k`} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(val: any) => formatCurrency(val)} />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Bar dataKey="totalIncome" name="Cash In" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="expenses" name="Cash Out" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                        <Line type="monotone" dataKey="netFlow" name="Net Flow" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                     </ComposedChart>
                   </ResponsiveContainer>
                 </div>
                 <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-[400px]">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Cost Breakdown</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={cashFlowTotals.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {cashFlowTotals.pieData.map((entry, index) => (
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
           )}

           {state.activeTab === 'networth' && (
             <div className="space-y-8">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-[400px]">
                     <h3 className="text-lg font-bold text-slate-800 mb-4">Wealth Bridge (SoY → EoY)</h3>
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={netWorthTotals.bridgeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `€${val/1000}k`} />
                          <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: any) => formatCurrency(value)} />
                          <Bar dataKey="change" stackId="a" fill="#3b82f6">
                            {netWorthTotals.bridgeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                          <Bar dataKey="start" stackId="a" fill="transparent" />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-[400px]">
                     <h3 className="text-lg font-bold text-slate-800 mb-4">Asset Allocation</h3>
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={netWorthTotals.allocationData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {netWorthTotals.allocationData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={ASSET_COLORS[entry.name as keyof typeof ASSET_COLORS] || '#94a3b8'} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => formatCurrency(value)} />
                          <Legend />
                        </PieChart>
                     </ResponsiveContainer>
                  </div>
                </div>
             </div>
           )}

           {state.activeTab === 'investments' && (
             <div className="space-y-8">
               <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-bold text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Ticker / Name</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3 text-right">Qty</th>
                          <th className="px-4 py-3 text-right">Avg Price</th>
                          <th className="px-4 py-3 text-right">Price Jan 1</th>
                          <th className="px-4 py-3 text-right">Price Dec 31</th>
                          <th className="px-4 py-3 text-right">Value (EoY)</th>
                          <th className="px-4 py-3 text-right">Total P/L</th>
                          <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {portfolioTotals.items.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2">
                              <input type="text" value={item.ticker} onChange={(e) => handleUpdatePortfolioItem({ ...item, ticker: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500" />
                            </td>
                            <td className="px-4 py-2">
                              <select value={item.type} onChange={(e) => handleUpdatePortfolioItem({ ...item, type: e.target.value as any })} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-600 focus:outline-none focus:border-blue-500">
                                <option value="Stock">Stock</option>
                                <option value="ETF">ETF</option>
                                <option value="Crypto">Crypto</option>
                                <option value="Fund">Fund</option>
                                <option value="Bond">Bond</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 text-right"><input type="text" inputMode="decimal" value={formatInputDisplay(item.quantity)} onChange={(e) => handleUpdatePortfolioItem({ ...item, quantity: parseInputToNumber(e.target.value) })} className="w-20 bg-white border border-slate-200 rounded px-2 py-1 text-right text-sm focus:outline-none focus:border-blue-500" /></td>
                            <td className="px-4 py-2 text-right"><input type="text" inputMode="decimal" value={formatInputDisplay(item.avgPrice)} onChange={(e) => handleUpdatePortfolioItem({ ...item, avgPrice: parseInputToNumber(e.target.value) })} className="w-24 bg-white border border-slate-200 rounded px-2 py-1 text-right text-sm focus:outline-none focus:border-blue-500" /></td>
                            <td className="px-4 py-2 text-right"><input type="text" inputMode="decimal" value={formatInputDisplay(item.priceSoY)} onChange={(e) => handleUpdatePortfolioItem({ ...item, priceSoY: parseInputToNumber(e.target.value) })} className="w-24 bg-white border border-slate-200 rounded px-2 py-1 text-right text-sm text-slate-500 focus:outline-none focus:border-blue-500" /></td>
                            <td className="px-4 py-2 text-right"><input type="text" inputMode="decimal" value={formatInputDisplay(item.priceEoY)} onChange={(e) => handleUpdatePortfolioItem({ ...item, priceEoY: parseInputToNumber(e.target.value) })} className="w-24 bg-white border border-slate-200 rounded px-2 py-1 text-right text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500" /></td>
                            <td className="px-4 py-2 text-right font-mono">{formatCurrency(item.valueEoY)}</td>
                            <td className={`px-4 py-2 text-right font-mono text-xs ${item.plTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              <div>{formatCurrency(item.plTotal)}</div>
                              <div>{item.plTotalPct.toFixed(2)}%</div>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <button onClick={() => handleRemovePortfolioItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-[350px]">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Portfolio Allocation</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={portfolioTotals.allocationData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {portfolioTotals.allocationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PORTFOLIO_COLORS[entry.name as keyof typeof PORTFOLIO_COLORS] || '#94a3b8'} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => formatCurrency(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-[350px]">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Performance View</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={portfolioTotals.performanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `€${val/1000}k`} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none' }} formatter={(value: any) => formatCurrency(value)} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {portfolioTotals.performanceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
               </div>
             </div>
           )}
        </div>
      </main>
    </div>
  );
}