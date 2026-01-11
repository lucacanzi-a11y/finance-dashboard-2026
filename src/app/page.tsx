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
  CreditCard, DollarSign, Wrench, ShoppingBag, Building2, Coins, CandlestickChart, Plus, Trash2,
  Landmark, ArrowRight, PieChart as PieChartIcon, BarChart3, SlidersHorizontal
} from 'lucide-react';

// --- Types & Interfaces ---

// --- TAB 1: CASH FLOW TYPES ---
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

// --- TAB 2: NET WORTH TYPES ---
interface Asset {
  id: string;
  name: string;
  category: 'Real Estate' | 'ETF/Stocks' | 'Crypto' | 'Private Equity' | 'Cash/Liquidity' | 'Pension';
  valueSoY: number; // Start of Year Value
  expectedGrowthPct: number; // Annual Growth %
}

// --- TAB 3: INVESTMENTS TYPES ---
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
  // New: Monthly adjustments
  adjustments: {
    income: number[]; // Array of 12 values
    expenses: number[]; // Array of 12 values
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

    let consultancyNet = 0;
    let taxDebt = 0;
    const isWorkingMonth = !(consultancy.skipAugust && index === 7);
    if (consultancy.isActive && isWorkingMonth) {
      consultancyNet = consultancy.grossMonthly * 0.80; 
      taxDebt = consultancy.grossMonthly * (0.43 - 0.20); 
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
    // If user enters a value (>0) in the adjustment field, it REPLACES the forecast entirely.
    const actualIncome = adjustments.income[index] || 0;
    const actualExpense = adjustments.expenses[index] || 0;

    const forecastTotalCashIn = monthlyIncome + consultancyNet + equityCashFlow;
    const totalCashIn = actualIncome > 0 ? actualIncome : forecastTotalCashIn;

    const forecastTotalExpenses = monthlyExpenses;
    const totalExpenses = actualExpense > 0 ? actualExpense : forecastTotalExpenses;

    const netLiquidChange = totalCashIn - totalExpenses;
    
    totalTaxBuffer += taxDebt; // Tax trap remains calculated on forecast logic for safety, or should we manual? Keeping forecast for safety.
    totalEquityValue += vestedValueEUR; 
    cumulativeCash += netLiquidChange; 
    cumulativeWealth += (netLiquidChange + portfolioGrowth);

    return {
      name: month,
      salary: monthlyIncome,
      consultancy: consultancyNet,
      equityCash: equityCashFlow,
      adjIncome: actualIncome, // Stored for display
      totalIncome: totalCashIn,
      expenses: totalExpenses,
      adjExpense: actualExpense, // Stored for display
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
  <div className="mb-4">
    <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
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
        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono shadow-sm placeholder:text-slate-300"
      />
      <span className="absolute right-3 top-2 text-xs text-slate-400">
        {type === "currency" ? "€" : type === "usd" ? "$" : type === "pct" ? "%" : type === "units" ? "Un" : ""}
      </span>
    </div>
  </div>
);

const AssetRow = ({ asset, onChange, onRemove }: { asset: Asset, onChange: (a: Asset) => void, onRemove: () => void }) => (
  <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 shadow-sm group hover:border-blue-300 transition-colors">
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Asset Name</label>
        <button onClick={onRemove} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Remove Asset">
          <Trash2 size={14} />
        </button>
      </div>
      <input 
        type="text" 
        value={asset.name} 
        onChange={(e) => onChange({ ...asset, name: e.target.value })}
        className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-300 shadow-sm"
        placeholder="e.g. Main House"
      />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="text-[10px] text-slate-400 uppercase font-medium mb-1 block">Value (Jan 1)</label>
        <div className="relative">
          <input 
            type="text" 
            inputMode="decimal"
            value={formatInputDisplay(asset.valueSoY)}
            onChange={(e) => onChange({ ...asset, valueSoY: parseInputToNumber(e.target.value) })}
            className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-500 placeholder:text-slate-300" 
            placeholder="0"
          />
          <span className="absolute right-2 top-1.5 text-xs text-slate-400">€</span>
        </div>
      </div>
      <div>
        <label className="text-[10px] text-slate-400 uppercase font-medium mb-1 block">Growth %</label>
        <div className="relative">
          <input 
            type="text"
            inputMode="decimal"
            value={formatInputDisplay(asset.expectedGrowthPct)}
            onChange={(e) => onChange({ ...asset, expectedGrowthPct: parseInputToNumber(e.target.value) })}
            className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-500" 
            placeholder="0"
          />
          <span className="absolute right-2 top-1.5 text-xs text-slate-400">%</span>
        </div>
      </div>
    </div>
    <div className="mt-2">
      <label className="text-[10px] text-slate-400 uppercase font-medium mb-1 block">Category</label>
      <select 
        value={asset.category}
        onChange={(e) => onChange({ ...asset, category: e.target.value as any })}
        className="w-full text-xs p-2 bg-white border border-slate-200 rounded text-slate-600 focus:outline-none focus:border-blue-500"
      >
        <option value="Real Estate">Real Estate</option>
        <option value="ETF/Stocks">ETF/Stocks</option>
        <option value="Crypto">Crypto</option>
        <option value="Private Equity">Private Equity</option>
        <option value="Cash/Liquidity">Cash/Liquidity</option>
        <option value="Pension">Pension</option>
      </select>
    </div>
  </div>
);

const Card = ({ title, value, subtext, icon: Icon, alert = false, highlight = false, secondary = false, neutral = false }: any) => (
  <div className={`px-4 py-3 rounded-xl border transition-all duration-300 shadow-sm flex flex-col justify-between min-h-[100px] ${
    alert ? 'bg-amber-50 border-amber-200 text-amber-900' : 
    highlight ? 'bg-emerald-50 border-emerald-100 text-slate-900' : 
    secondary ? 'bg-rose-50 border-rose-100 text-slate-900' : 
    neutral ? 'bg-slate-50 border-slate-200 text-slate-900' :
    'bg-white border-slate-200 text-slate-800'
  }`}>
    <div className="flex justify-between items-start">
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${secondary ? 'text-rose-700/70' : alert ? 'text-amber-700/70' : 'text-slate-500'}`}>{title}</p>
        <h3 className="text-2xl font-bold tracking-tight tabular-nums leading-none">{value}</h3>
      </div>
      <div className={`p-1.5 rounded-lg ${
        alert ? 'bg-amber-100/50 text-amber-600' : 
        highlight ? 'bg-emerald-100/50 text-emerald-600' : 
        secondary ? 'bg-rose-100/50 text-rose-600' : 
        neutral ? 'bg-slate-200/50 text-slate-600' :
        'bg-slate-100 text-slate-400'
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
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('finance_dashboard_2026_v17');
      if (saved) {
        try { 
          // Merge default state to ensure new 'adjustments' field exists if loading old data
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_STATE, ...parsed, adjustments: parsed.adjustments || DEFAULT_STATE.adjustments }; 
        } catch (e) { console.error(e); }
      }
    }
    return DEFAULT_STATE;
  });

  useEffect(() => {
    localStorage.setItem('finance_dashboard_2026_v17', JSON.stringify(state));
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

  // Adjustment Handlers
  const handleAdjustmentChange = (type: 'income' | 'expenses', index: number, value: number) => {
    setState(prev => {
      const newAdj = [...prev.adjustments[type]];
      newAdj[index] = value;
      return { ...prev, adjustments: { ...prev.adjustments, [type]: newAdj } };
    });
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
        <aside className="w-full lg:w-96 bg-white border-r border-slate-200 flex flex-col lg:h-screen lg:sticky top-0 lg:overflow-y-auto z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="text-blue-600" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900">FinPlan 2026</h1>
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-widest">Milan HQ • Family Office</p>
          </div>

          <div className="px-6 pt-4 pb-0">
            <div className="flex p-1 bg-slate-100 rounded-lg">
              <button onClick={() => setState(s => ({ ...s, activeTab: 'cashflow' }))} className={`flex-1 text-[10px] font-bold py-2 rounded-md transition-all ${state.activeTab === 'cashflow' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>CASH FLOW</button>
              <button onClick={() => setState(s => ({ ...s, activeTab: 'networth' }))} className={`flex-1 text-[10px] font-bold py-2 rounded-md transition-all ${state.activeTab === 'networth' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>ASSETS</button>
              <button onClick={() => setState(s => ({ ...s, activeTab: 'investments' }))} className={`flex-1 text-[10px] font-bold py-2 rounded-md transition-all ${state.activeTab === 'investments' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>PORTFOLIO</button>
            </div>
          </div>

          {state.activeTab === 'cashflow' && (
            <div className="p-6 space-y-2 flex-1 animate-in slide-in-from-left-4 duration-300">
              {/* Cash Flow Inputs */}
              <div className="bg-emerald-50/50 -mx-6 px-6 py-4 mb-6 border-y border-emerald-100/50">
                <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-4">Inflow Engines</h3>
                <InputGroup label="Salary (Annual Gross)" value={state.income.baseSalaryGross} onChange={(val: number) => setState(s => ({ ...s, income: { ...s.income, baseSalaryGross: val } }))} />
                <InputGroup label="Bonus (Annual Gross)" value={state.income.variableBonusGross} onChange={(val: number) => setState(s => ({ ...s, income: { ...s.income, variableBonusGross: val } }))} />
                <div className="mt-6 pt-4 border-t border-emerald-200/50"></div>
                <h4 className="text-[10px] font-bold text-emerald-800/70 uppercase tracking-widest mb-3">Equity</h4>
                <div className="grid grid-cols-2 gap-3">
                  <InputGroup label="Stock Quantity" type="units" value={state.equity.annualUnits} onChange={(val: number) => setState(s => ({ ...s, equity: { ...s.equity, annualUnits: val } }))} />
                  <InputGroup label="Stock Price" type="usd" value={state.equity.stockPriceUSD} onChange={(val: number) => setState(s => ({ ...s, equity: { ...s.equity, stockPriceUSD: val } }))} />
                </div>
                <ToggleControl label="Sell On Vest (Cash Flow)" checked={state.equity.sellOnVest} onChange={(val: boolean) => setState(s => ({ ...s, equity: { ...s.equity, sellOnVest: val } }))} />
                <ToggleControl label="Include in Savings KPI" checked={state.equity.includeInSavingsRate} onChange={(val: boolean) => setState(s => ({ ...s, equity: { ...s.equity, includeInSavingsRate: val } }))} />
                <div className="mt-6 pt-4 border-t border-emerald-200/50"></div>
                <div className="flex justify-between items-center mb-2">
                   <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Additional Income</span>
                   <ToggleControl label="" checked={state.consultancy.isActive} onChange={(val: boolean) => setState(s => ({ ...s, consultancy: { ...s.consultancy, isActive: val } }))} />
                </div>
                {state.consultancy.isActive && (
                  <>
                    <InputGroup label="Gross Monthly" value={state.consultancy.grossMonthly} onChange={(val: number) => setState(s => ({ ...s, consultancy: { ...s.consultancy, grossMonthly: val } }))} />
                    <ToggleControl label="Skip August" checked={state.consultancy.skipAugust} onChange={(val: boolean) => setState(s => ({ ...s, consultancy: { ...s.consultancy, skipAugust: val } }))} />
                  </>
                )}
              </div>
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
          )}

          {state.activeTab === 'networth' && (
            <div className="p-6 flex-1 animate-in slide-in-from-right-4 duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-bold text-blue-700 uppercase tracking-widest">Asset Inventory (SoY)</h3>
                <button onClick={handleAddAsset} className="text-xs flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100">
                  <Plus size={12} /> Add
                </button>
              </div>
              <div className="space-y-4">
                {state.assets.map(asset => (
                  <AssetRow 
                    key={asset.id} 
                    asset={asset} 
                    onChange={handleUpdateAsset} 
                    onRemove={() => handleRemoveAsset(asset.id)} 
                  />
                ))}
              </div>
            </div>
          )}

          {state.activeTab === 'investments' && (
            <div className="p-6 flex-1 animate-in slide-in-from-right-4 duration-300">
              <div className="text-xs text-slate-500 mb-6">
                Manage your portfolio positions. Prices are entered manually for Jan 1 (SoY) and Dec 31 (EoY) projections.
              </div>
            </div>
          )}

          <div className="p-6 border-t border-slate-200 grid grid-cols-2 gap-2 bg-slate-50">
            <button onClick={resetToDefaults} className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm transition-all shadow-sm">
              <RotateCcw size={14} /> Reset
            </button>
            <button onClick={handlePrint} className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 text-sm transition-all shadow-sm">
              <Printer size={14} /> Print / Save PDF
            </button>
          </div>
        </aside>

        {/* --- Main Dashboard --- */}
        <main className="flex-1 p-6 lg:p-12 lg:overflow-y-auto">
          
          <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">
                {state.activeTab === 'cashflow' ? 'Cash Flow Manager' : state.activeTab === 'networth' ? 'Net Worth & Assets' : 'Investment Portfolio'}
              </h2>
              <p className="text-sm text-slate-500">
                {state.activeTab === 'cashflow' 
                  ? 'Projected cash flow based on Milan fiscal rules.' 
                  : state.activeTab === 'networth' 
                  ? 'Balance sheet evolution from Jan 1st to Dec 31st.'
                  : 'Detailed tracking of your financial instruments.'}
              </p>
            </div>
            <div className="no-print">
               <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">Last Update: {new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {state.activeTab === 'cashflow' && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              {/* --- CASH FLOW VIEW --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
                <Card title="Annual Cash In" value={formatCurrency(cashFlowTotals.totalCashIncome)} subtext="Net Salary + Bonus + Consult." icon={Briefcase} highlight={true} />
                <Card title="Annual Costs" value={formatCurrency(cashFlowTotals.totalExpenses)} subtext="Total Annual Outflow" icon={CreditCard} secondary={true} />
                <Card title="Cash Savings" value={formatCurrency(cashFlowTotals.netLiquidity)} subtext="Accumulated Cash (No Equity)" icon={Wallet} highlight={true} />
                <Card title={state.equity.includeInSavingsRate ? "Total Savings Rate" : "Cash Savings Rate"} value={`${cashFlowTotals.dynamicSavingsRate.toFixed(1)}%`} subtext={state.equity.includeInSavingsRate ? "Incl. Equity" : "Excl. Equity"} icon={TrendingUp} />
                <Card title="Equity Savings" value={formatCurrency(totalEquityValue)} subtext="Gross Asset Value (EUR)" icon={DollarSign} highlight={true} />
                <Card title="Cash In Monthly" value={formatCurrency(cashFlowTotals.totalCashIncome / 12)} subtext="Average Monthly Net" icon={Briefcase} highlight={true} />
                <Card title="Costs Monthly" value={formatCurrency(cashFlowTotals.totalExpenses / 12)} subtext="Average Burn Rate" icon={CreditCard} secondary={true} />
                {state.consultancy.isActive && (
                  <Card title="Tax Trap" value={formatCurrency(cashFlowTotals.taxDebt)} subtext="Saved for IRPEF Adj." icon={AlertTriangle} alert={cashFlowTotals.taxDebt > 1000} />
                )}
              </div>

              {/* MONTHLY ADJUSTMENTS SECTION */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <SlidersHorizontal size={20} className="text-slate-600" />
                  <h3 className="text-lg font-bold text-slate-800">Monthly Actuals (Overrides)</h3>
                </div>
                <div className="overflow-x-auto pb-2">
                  <div className="flex gap-4 min-w-max">
                    {MONTHS.map((month, index) => (
                      <div key={month} className="w-24 shrink-0">
                        <div className="text-xs font-bold text-center mb-2 text-slate-500 uppercase">{month}</div>
                        <div className="space-y-2">
                          <input 
                            type="text"
                            inputMode="decimal"
                            value={formatInputDisplay(state.adjustments.income[index])}
                            onChange={(e) => handleAdjustmentChange('income', index, parseInputToNumber(e.target.value))}
                            placeholder="Inc"
                            className="w-full text-xs p-2 border border-emerald-200 bg-emerald-50/30 rounded text-center focus:outline-none focus:border-emerald-500 placeholder:text-slate-300"
                          />
                          <input 
                            type="text"
                            inputMode="decimal"
                            value={formatInputDisplay(state.adjustments.expenses[index])}
                            onChange={(e) => handleAdjustmentChange('expenses', index, parseInputToNumber(e.target.value))}
                            placeholder="Exp"
                            className="w-full text-xs p-2 border border-rose-200 bg-rose-50/30 rounded text-center focus:outline-none focus:border-rose-500 placeholder:text-slate-300"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-10">
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
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `€${val / 1000}k`} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontSize: '12px', fontWeight: 600 }} formatter={(value: any) => formatCurrency(value)} />
                        <ReferenceLine y={0} stroke="#cbd5e1" />
                        <Line type="monotone" dataKey="totalIncome" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Cost Breakdown</h3>
                  <div className="h-[350px]">
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
                        <th className="px-6 py-4 font-bold text-slate-500">Actual In</th>
                        <th className="px-6 py-4 font-bold text-rose-600">Expenses</th>
                        <th className="px-6 py-4 font-bold text-slate-500">Actual Out</th>
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
                          <td className="px-6 py-4 text-slate-500 font-mono">{row.adjIncome !== 0 ? formatCurrency(row.adjIncome) : '-'}</td>
                          <td className="px-6 py-4 text-rose-600 font-mono font-medium">{formatCurrency(row.expenses)}</td>
                          <td className="px-6 py-4 text-slate-500 font-mono">{row.adjExpense !== 0 ? formatCurrency(row.adjExpense) : '-'}</td>
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
            </div>
          )}

          {state.activeTab === 'networth' && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              {/* --- NET WORTH VIEW --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                <Card title="Start of Year" value={formatCompact(netWorthTotals.totalSoY)} subtext="Jan 1st Assets" icon={Landmark} neutral={true} />
                <Card title="+ Capital Gain" value={formatCurrency(netWorthTotals.totalMarketGrowth)} subtext="Market Growth" icon={TrendingUp} highlight={true} />
                <Card title="+ Cash Savings" value={formatCurrency(cashFlowTotals.netLiquidity)} subtext="From Cash Flow Tab" icon={Wallet} highlight={true} />
                <Card title="End of Year" value={formatCompact(netWorthTotals.totalEoY)} subtext="Dec 31st Projection" icon={Building2} neutral={true} />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-10">
                <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm print-full-width">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Wealth Bridge (SoY → EoY)</h3>
                  </div>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={netWorthTotals.bridgeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `€${val / 1000}k`} />
                        <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '8px' }} formatter={(value: any) => formatCurrency(value)} />
                        <Bar dataKey="change" stackId="a" fill="#3b82f6">
                          {netWorthTotals.bridgeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                        <Bar dataKey="start" stackId="a" fill="transparent" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">EoY Allocation</h3>
                  <div className="h-[350px]">
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
            </div>
          )}

          {state.activeTab === 'investments' && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              {/* --- INVESTMENTS VIEW --- */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">Portfolio Holdings</h3>
                <button onClick={handleAddPortfolioItem} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                  <Plus size={16} /> Add Holding
                </button>
              </div>

              {/* Portfolio KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                <Card title="Total Invested" value={formatCompact(portfolioTotals.totalInvested)} subtext="Cost Basis" icon={Layers} neutral={true} />
                <Card title="Market Value (EoY)" value={formatCurrency(portfolioTotals.totalValueEoY)} subtext="Projected Dec 31" icon={BarChart3} highlight={true} />
                <Card title="Unrealized P/L" value={formatCurrency(portfolioTotals.totalValueEoY - portfolioTotals.totalInvested)} subtext="Since Inception" icon={TrendingUp} highlight={(portfolioTotals.totalValueEoY - portfolioTotals.totalInvested) >= 0} alert={(portfolioTotals.totalValueEoY - portfolioTotals.totalInvested) < 0} />
                <Card title="YTD Performance" value={formatCurrency(portfolioTotals.totalValueEoY - portfolioTotals.totalValueSoY)} subtext="Jan 1 - Dec 31 Growth" icon={ArrowRight} neutral={true} />
              </div>

              {/* Portfolio Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-10 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-2 py-3 font-bold">Ticker / Name</th>
                        <th className="px-2 py-3 font-bold">Type</th>
                        <th className="px-2 py-3 font-bold text-right">Qty</th>
                        <th className="px-2 py-3 font-bold text-right">Avg Price</th>
                        <th className="px-2 py-3 font-bold text-right">Price Jan 1</th>
                        <th className="px-2 py-3 font-bold text-right">Price Dec 31</th>
                        <th className="px-2 py-3 font-bold text-right">Value (EoY)</th>
                        <th className="px-2 py-3 font-bold text-right">Total P/L</th>
                        <th className="px-2 py-3 font-bold text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {portfolioTotals.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-2 py-2">
                            <input 
                              type="text" 
                              value={item.ticker} 
                              onChange={(e) => handleUpdatePortfolioItem({ ...item, ticker: e.target.value })}
                              className="bg-transparent font-bold text-slate-700 w-full focus:outline-none focus:border-b focus:border-blue-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <select 
                              value={item.type} 
                              onChange={(e) => handleUpdatePortfolioItem({ ...item, type: e.target.value as any })}
                              className="bg-transparent text-slate-600 focus:outline-none text-xs"
                            >
                              <option value="Stock">Stock</option>
                              <option value="ETF">ETF</option>
                              <option value="Crypto">Crypto</option>
                              <option value="Fund">Fund</option>
                              <option value="Bond">Bond</option>
                            </select>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <input 
                              type="text" 
                              inputMode="decimal"
                              value={formatInputDisplay(item.quantity)} 
                              onChange={(e) => handleUpdatePortfolioItem({ ...item, quantity: parseInputToNumber(e.target.value) })}
                              className="bg-transparent text-right w-20 focus:outline-none focus:border-b focus:border-blue-500"
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <input 
                              type="text" 
                              inputMode="decimal"
                              value={formatInputDisplay(item.avgPrice)} 
                              onChange={(e) => handleUpdatePortfolioItem({ ...item, avgPrice: parseInputToNumber(e.target.value) })}
                              className="bg-transparent text-right w-24 focus:outline-none focus:border-b focus:border-blue-500"
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <input 
                              type="text" 
                              inputMode="decimal"
                              value={formatInputDisplay(item.priceSoY)} 
                              onChange={(e) => handleUpdatePortfolioItem({ ...item, priceSoY: parseInputToNumber(e.target.value) })}
                              className="bg-transparent text-right w-24 focus:outline-none focus:border-b focus:border-blue-500 text-slate-500"
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <input 
                              type="text" 
                              inputMode="decimal"
                              value={formatInputDisplay(item.priceEoY)} 
                              onChange={(e) => handleUpdatePortfolioItem({ ...item, priceEoY: parseInputToNumber(e.target.value) })}
                              className="bg-transparent text-right w-24 focus:outline-none focus:border-b focus:border-blue-500 font-semibold text-slate-700"
                            />
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-slate-700">
                            {formatCurrency(item.valueEoY)}
                          </td>
                          <td className={`px-2 py-2 text-right font-mono text-xs ${item.plTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            <div>{formatCurrency(item.plTotal)}</div>
                            <div>{item.plTotalPct.toFixed(2)}%</div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button onClick={() => handleRemovePortfolioItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                 {/* Allocation Chart */}
                 <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Portfolio Allocation</h3>
                  <div className="h-[300px]">
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
                </div>

                {/* Performance Chart */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Performance View</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={portfolioTotals.performanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `€${val / 1000}k`} />
                        <Tooltip 
                          cursor={{ fill: '#f1f5f9' }}
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '8px' }}
                          formatter={(value: any) => formatCurrency(value)}
                        />
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
            </div>
          )}

        </main>
      </div>
    </div>
  );
}