import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Percent, 
  Activity, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Smartphone, 
  RefreshCw, 
  Database,
  Search,
  Pizza,
  Layers,
  Sparkles,
  Info,
  Lock,
  Eye,
  EyeOff,
  User,
  MessageSquare,
  Send,
  Bot,
  Upload
} from 'lucide-react';
import { getSupabase, isSupabaseConfigured, getLocalOrders } from '../supabaseClient';
import { Order, MenuItem } from '../types';
import { ActiveOrderHistory } from './ActiveOrderHistory';

// High-fidelity fallback inventory items in case Supabase inventory table is empty
const DEFAULT_INVENTORY = [
  { ingredient: "Mozzarella Cheese", current_stock: 14.5, unit: "kg", reorder_threshold: 20.0 },
  { ingredient: "Thin Crust Pre-Bakes", current_stock: 45, unit: "pcs", reorder_threshold: 30.0 },
  { ingredient: "Cheese Burst Pre-Bakes", current_stock: 8, unit: "pcs", reorder_threshold: 15.0 },
  { ingredient: "Whole Wheat Pre-Bakes", current_stock: 32, unit: "pcs", reorder_threshold: 20.0 },
  { ingredient: "San Marzano Pizza Sauce", current_stock: 25.0, unit: "litres", reorder_threshold: 10.0 },
  { ingredient: "Pepperoni Slices", current_stock: 3.2, unit: "kg", reorder_threshold: 5.0 },
  { ingredient: "Paneer Tikka Cubes", current_stock: 12.0, unit: "kg", reorder_threshold: 8.0 },
  { ingredient: "Black Olives", current_stock: 4.8, unit: "kg", reorder_threshold: 5.0 },
  { ingredient: "Sweet Corn", current_stock: 15.0, unit: "kg", reorder_threshold: 10.0 },
  { ingredient: "Button Mushrooms", current_stock: 2.1, unit: "kg", reorder_threshold: 4.0 }
];

interface AdminDashboardProps {
  onMenuUpdated?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onMenuUpdated }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbMode, setDbMode] = useState<'live' | 'local'>('local');

  // Core aggregated states
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    totalDiscount: 0
  });

  const [trendData, setTrendData] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<{
    pizzas: any[];
    toppings: any[];
    bases: any[];
  }>({ pizzas: [], toppings: [], bases: [] });

  const [paymentData, setPaymentData] = useState<any[]>([]);
  const [peakHoursData, setPeakHoursData] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<Order[]>([]);

  // Section-specific error message states to prevent silent fallback and display errors clearly
  const [ordersErrorMsg, setOrdersErrorMsg] = useState<string | null>(null);
  const [topSellingErrorMsg, setTopSellingErrorMsg] = useState<string | null>(null);
  const [paymentErrorMsg, setPaymentErrorMsg] = useState<string | null>(null);
  const [inventoryErrorMsg, setInventoryErrorMsg] = useState<string | null>(null);

  // Query logs for explanation section
  const [queryLog, setQueryLog] = useState<{
    section: string;
    table: string;
    logic: string;
    status: 'success' | 'fallback' | 'loading';
  }[]>([]);

  // AI Analytics Chatbot State Variables
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatAnswer, setChatAnswer] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const handleAnalyze = async (selectedQuestion?: string) => {
    const q = selectedQuestion || chatQuestion;
    if (!q.trim()) return;
    
    // If selecting a preset, update the input box for clarity
    if (selectedQuestion) {
      setChatQuestion(selectedQuestion);
    }

    setChatLoading(true);
    setChatError(null);
    setChatAnswer(null);

    const supabase = getSupabase();
    if (!supabase) {
      setChatError("Supabase client is not configured. Please configure your live environment to use the Analytics chatbot.");
      setChatLoading(false);
      return;
    }

    try {
      // Aggregate data summary on-the-fly from ordersList
      const revenue = ordersList.reduce((sum, o) => sum + (o.final_total ?? o.total ?? 0), 0);
      const discount = ordersList.reduce((sum, o) => sum + (o.discount_amount ?? o.discount ?? 0), 0);
      const gst = ordersList.reduce((sum, o) => sum + (o.gst_amount ?? o.gst ?? 0), 0);
      const avgVal = ordersList.length > 0 ? revenue / ordersList.length : 0;

      // Group orders by day
      const ordersByDayMap: { [date: string]: { order_count: number; revenue: number } } = {};
      ordersList.forEach(o => {
        const oDate = new Date(o.order_time || o.created_at);
        const dStr = oDate.toISOString().split('T')[0];
        if (!ordersByDayMap[dStr]) {
          ordersByDayMap[dStr] = { order_count: 0, revenue: 0 };
        }
        ordersByDayMap[dStr].order_count += 1;
        ordersByDayMap[dStr].revenue += (o.final_total ?? o.total ?? 0);
      });
      const orders_by_day = Object.entries(ordersByDayMap).map(([date, data]) => ({
        date,
        order_count: data.order_count,
        revenue: data.revenue
      })).sort((a, b) => a.date.localeCompare(b.date));

      // Group orders by day of week
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const ordersByDayOfWeekMap: { [day: string]: { order_count: number; revenue: number } } = {};
      daysOfWeek.forEach(day => {
        ordersByDayOfWeekMap[day] = { order_count: 0, revenue: 0 };
      });
      ordersList.forEach(o => {
        const oDate = new Date(o.order_time || o.created_at);
        const dayName = daysOfWeek[oDate.getDay()];
        if (ordersByDayOfWeekMap[dayName]) {
          ordersByDayOfWeekMap[dayName].order_count += 1;
          ordersByDayOfWeekMap[dayName].revenue += (o.final_total ?? o.total ?? 0);
        }
      });
      const orders_by_day_of_week = daysOfWeek.map(day => ({
        day,
        order_count: ordersByDayOfWeekMap[day].order_count,
        revenue: ordersByDayOfWeekMap[day].revenue
      }));

      // Top items aggregation using real pre-aggregated topItems state to avoid empty metrics in live mode
      const top_items: any[] = [];
      if (topItems.pizzas && topItems.pizzas.length > 0) {
        topItems.pizzas.forEach(p => top_items.push({ item_name: p.name, item_type: 'pizza', times_ordered: p.count }));
      }
      if (topItems.toppings && topItems.toppings.length > 0) {
        topItems.toppings.forEach(t => top_items.push({ item_name: t.name, item_type: 'topping', times_ordered: t.count }));
      }
      if (topItems.bases && topItems.bases.length > 0) {
        topItems.bases.forEach(b => top_items.push({ item_name: b.name, item_type: 'base', times_ordered: b.count }));
      }

      // If top_items is empty (e.g. state not loaded yet), fallback to ordersList scan for offline mode safety
      if (top_items.length === 0) {
        const itemCounts: { [name: string]: { item_name: string; item_type: string; times_ordered: number } } = {};
        ordersList.forEach(o => {
          const qty = o.quantity || 1;
          if (o.pizza_name) {
            if (!itemCounts[o.pizza_name]) itemCounts[o.pizza_name] = { item_name: o.pizza_name, item_type: "pizza", times_ordered: 0 };
            itemCounts[o.pizza_name].times_ordered += qty;
          }
          if (o.topping_name) {
            if (!itemCounts[o.topping_name]) itemCounts[o.topping_name] = { item_name: o.topping_name, item_type: "topping", times_ordered: 0 };
            itemCounts[o.topping_name].times_ordered += qty;
          }
          if (o.base_name) {
            if (!itemCounts[o.base_name]) itemCounts[o.base_name] = { item_name: o.base_name, item_type: "base", times_ordered: 0 };
            itemCounts[o.base_name].times_ordered += qty;
          }
        });
        Object.values(itemCounts).forEach(item => top_items.push(item));
      }
      top_items.sort((a, b) => b.times_ordered - a.times_ordered);

      // Payment mode breakdown from real pre-aggregated payments database state
      const payment_mode_breakdown = paymentData.map(p => ({
        payment_mode: p.name,
        count: p.value,
        total_amount: 0
      }));

      // Fallback for payment mode if state is empty
      if (payment_mode_breakdown.length === 0) {
        const paymentsMap: { [mode: string]: { count: number; total_amount: number } } = {};
        ordersList.forEach(o => {
          const mode = o.payment_mode || "UPI";
          if (!paymentsMap[mode]) {
            paymentsMap[mode] = { count: 0, total_amount: 0 };
          }
          paymentsMap[mode].count += 1;
          paymentsMap[mode].total_amount += (o.final_total ?? o.total ?? 0);
        });
        Object.entries(paymentsMap).forEach(([payment_mode, data]) => {
          payment_mode_breakdown.push({
            payment_mode,
            count: data.count,
            total_amount: data.total_amount
          });
        });
      }

      // Orders by hour
      const hoursMap: { [hour: number]: number } = {};
      for (let h = 0; h < 24; h++) {
        hoursMap[h] = 0;
      }
      ordersList.forEach(o => {
        const oDate = new Date(o.order_time || o.created_at);
        const hour = oDate.getHours();
        hoursMap[hour] = (hoursMap[hour] || 0) + 1;
      });
      const orders_by_hour = Object.entries(hoursMap).map(([hour, count]) => ({
        hour: parseInt(hour),
        order_count: count
      })).sort((a, b) => a.hour - b.hour);

      const summaryData = {
        date_range: "last 30 days",
        total_orders: ordersList.length,
        total_revenue: revenue,
        total_discount_given: discount,
        total_gst_collected: gst,
        average_order_value: avgVal,
        orders_by_day,
        orders_by_day_of_week,
        top_items,
        payment_mode_breakdown,
        orders_by_hour
      };

      const { data, error: functionError } = await supabase.functions.invoke('analyze-sales-data', {
        body: { question: q.trim(), summaryData }
      });

      if (functionError) {
        throw functionError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setChatAnswer(data.answer);
    } catch (err: any) {
      console.error('Failed to analyze question:', err);
      setChatError(err.message || 'An unexpected error occurred. Please verify if the Supabase Edge Function is deployed and has the OPENROUTER_API_KEY configured.');
    } finally {
      setChatLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    setOrdersErrorMsg(null);
    setTopSellingErrorMsg(null);
    setPaymentErrorMsg(null);
    setInventoryErrorMsg(null);

    const supabase = getSupabase();
    const isLive = !!supabase;
    setDbMode(isLive ? 'live' : 'local');

    const logs: typeof queryLog = [];

    try {
      // 1. Fetch Orders Data
      let rawOrders: any[] = [];
      let fetchedFromLive = false;

      if (isLive) {
        logs.push({
          section: "Orders & Metrics",
          table: "orders",
          logic: "select('*') order by order_time desc",
          status: 'loading'
        });

        const { data: dbOrders, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .order('order_time', { ascending: false });

        if (!ordersError && dbOrders) {
          rawOrders = dbOrders;
          fetchedFromLive = true;
          logs[logs.length - 1].status = 'success';
        } else {
          console.error('Live orders fetch failed! Error object:', ordersError);
          setOrdersErrorMsg(ordersError ? ordersError.message : 'Failed to fetch orders from database.');
          logs[logs.length - 1].status = 'fallback';
        }
      } else {
        rawOrders = getLocalOrders();
        logs.push({
          section: "Orders & Metrics",
          table: "localStorage (pizzaflow_orders)",
          logic: "Parsing stored local JSON entries",
          status: 'success'
        });
      }

      setOrdersList(rawOrders);

      // Process Metrics (Today's key metrics)
      const now = new Date();
      const todayStr = now.toDateString(); // "Sat Jul 04 2026"

      const todayOrders = rawOrders.filter(o => {
        const orderDate = new Date(o.order_time || o.created_at);
        return orderDate.toDateString() === todayStr;
      });

      const totalRevenueToday = todayOrders.reduce((sum, o) => sum + (o.final_total ?? o.total ?? 0), 0);
      const totalDiscountToday = todayOrders.reduce((sum, o) => sum + (o.discount_amount ?? o.discount ?? 0), 0);
      const totalOrdersToday = todayOrders.length;
      const avgValueToday = totalOrdersToday > 0 ? totalRevenueToday / totalOrdersToday : 0;

      setMetrics({
        totalRevenue: totalRevenueToday,
        totalOrders: totalOrdersToday,
        avgOrderValue: avgValueToday,
        totalDiscount: totalDiscountToday
      });

      // 2. Daily Trend Chart (Last 7 Days)
      const last7Days: { [key: string]: { date: string; orders: number; revenue: number } } = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayKey = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        last7Days[d.toDateString()] = {
          date: dayKey,
          orders: 0,
          revenue: 0
        };
      }

      rawOrders.forEach(o => {
        const oDate = new Date(o.order_time || o.created_at);
        const dateStr = oDate.toDateString();
        if (last7Days[dateStr]) {
          last7Days[dateStr].orders += 1;
          last7Days[dateStr].revenue += (o.final_total ?? o.total ?? 0);
        }
      });

      setTrendData(Object.values(last7Days));
      logs.push({
        section: "Daily Trend (Last 7 Days)",
        table: isLive ? "orders" : "localStorage (pizzaflow_orders)",
        logic: "Group by DATE(order_time) aggregated client-side",
        status: isLive ? (ordersErrorMsg ? 'fallback' : 'success') : 'success'
      });

      // 3. Top-selling items (pizzas, toppings, bases)
      let itemsData: any[] = [];
      let topSellingLogStatus: 'success' | 'fallback' = 'success';

      if (isLive) {
        logs.push({
          section: "Top Selling Items",
          table: "order_items",
          logic: "select('item_name, item_type')",
          status: 'loading'
        });

        const { data: dbItems, error: itemsError } = await supabase
          .from('order_items')
          .select('item_name, item_type');

        if (!itemsError && dbItems) {
          itemsData = dbItems;
          topSellingLogStatus = 'success';
          logs[logs.length - 1].status = 'success';
        } else {
          console.error('Live top selling items fetch failed! Error object:', itemsError);
          setTopSellingErrorMsg(itemsError ? itemsError.message : 'Failed to fetch top-selling items.');
          topSellingLogStatus = 'fallback';
          logs[logs.length - 1].status = 'fallback';
        }
      } else {
        // Local extraction
        rawOrders.forEach(o => {
          if (o.pizza_name) itemsData.push({ item_name: o.pizza_name, item_type: 'pizza', quantity: o.quantity || 1 });
          if (o.topping_name) itemsData.push({ item_name: o.topping_name, item_type: 'topping', quantity: o.quantity || 1 });
          if (o.base_name) itemsData.push({ item_name: o.base_name, item_type: 'base', quantity: o.quantity || 1 });
        });
        logs.push({
          section: "Top Selling Items",
          table: "localStorage (pizzaflow_orders)",
          logic: "Parsing stored local JSON entries",
          status: 'success'
        });
      }

      // Group items by category and sort descending
      const groupAndCount = (type: string) => {
        const counts: { [key: string]: number } = {};
        itemsData.filter(i => i.item_type === type).forEach(i => {
          counts[i.item_name] = (counts[i.item_name] || 0) + (i.quantity || 1);
        });
        return Object.entries(counts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
      };

      setTopItems({
        pizzas: groupAndCount('pizza').slice(0, 5),
        toppings: groupAndCount('topping').slice(0, 5),
        bases: groupAndCount('base').slice(0, 5)
      });

      // 4. Payment Mode Breakdown
      let paymentCounts: { [key: string]: number } = {};
      let paymentLogStatus: 'success' | 'fallback' = 'success';

      if (isLive) {
        logs.push({
          section: "Payment Mode Breakdown",
          table: "payments",
          logic: "select('payment_mode')",
          status: 'loading'
        });

        const { data: dbPayments, error: paymentsError } = await supabase
          .from('payments')
          .select('payment_mode');

        if (!paymentsError && dbPayments) {
          dbPayments.forEach(p => {
            if (p.payment_mode) {
              paymentCounts[p.payment_mode] = (paymentCounts[p.payment_mode] || 0) + 1;
            }
          });
          paymentLogStatus = 'success';
          logs[logs.length - 1].status = 'success';
        } else {
          console.error('Live payments fetch failed! Error object:', paymentsError);
          setPaymentErrorMsg(paymentsError ? paymentsError.message : 'Failed to fetch payments from database.');
          paymentLogStatus = 'fallback';
          logs[logs.length - 1].status = 'fallback';
        }
      } else {
        rawOrders.forEach(o => {
          if (o.payment_mode) {
            paymentCounts[o.payment_mode] = (paymentCounts[o.payment_mode] || 0) + 1;
          }
        });
        logs.push({
          section: "Payment Mode Breakdown",
          table: "localStorage (pizzaflow_orders)",
          logic: "Parsing stored local JSON entries",
          status: 'success'
        });
      }

      const formattedPayments = Object.entries(paymentCounts).map(([mode, count]) => ({
        name: mode.toUpperCase(),
        value: count
      }));

      setPaymentData(formattedPayments);

      // 5. Peak Hours (Order count by hour of day 0-23)
      const hoursArray = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i.toString().padStart(2, '0')}:00`,
        hourNum: i,
        orders: 0
      }));

      rawOrders.forEach(o => {
        const oDate = new Date(o.order_time || o.created_at);
        const hour = oDate.getHours();
        const found = hoursArray.find(h => h.hourNum === hour);
        if (found) {
          found.orders += 1;
        }
      });

      setPeakHoursData(hoursArray);
      logs.push({
        section: "Peak Hour Demands",
        table: isLive ? "orders" : "localStorage (pizzaflow_orders)",
        logic: "EXTRACT(HOUR FROM order_time) grouped by hour",
        status: isLive ? (ordersErrorMsg ? 'fallback' : 'success') : 'success'
      });

      // 6. Inventory Status
      let inventoryLogStatus: 'success' | 'fallback' = 'success';
      if (isLive) {
        logs.push({
          section: "Inventory Control Status",
          table: "inventory",
          logic: "select('inventory_id, ingredient_name, unit, current_stock, reorder_threshold')",
          status: 'loading'
        });

        const { data: dbInventory, error: invError } = await supabase
          .from('inventory')
          .select('inventory_id, ingredient_name, unit, current_stock, reorder_threshold');

        if (!invError && dbInventory) {
          const mappedInventory = dbInventory.map((item: any) => ({
            inventory_id: item.inventory_id,
            ingredient: item.ingredient_name,
            current_stock: item.current_stock,
            unit: item.unit,
            reorder_threshold: item.reorder_threshold
          }));
          setInventoryList(mappedInventory);
          inventoryLogStatus = 'success';
          logs[logs.length - 1].status = 'success';
        } else {
          console.error('Live inventory fetch failed! Error object:', invError);
          setInventoryErrorMsg(invError ? invError.message : 'Failed to fetch inventory from database.');
          inventoryLogStatus = 'fallback';
          logs[logs.length - 1].status = 'fallback';
          setInventoryList([]); // Empty list to remove any hardcoded/seeded fallback data
        }
      } else {
        setInventoryList(DEFAULT_INVENTORY);
        logs.push({
          section: "Inventory Control Status",
          table: "localStorage (pizzaflow_inventory)",
          logic: "Displaying local ingredient seeds",
          status: 'success'
        });
      }

      setQueryLog(logs);

    } catch (err: any) {
      console.error('Failed to load dashboard statistics:', err);
      setError(err.message || 'An unexpected error occurred while processing analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Menu Bulk-Import State Variables
  const [importStatus, setImportStatus] = useState<{
    base: { successMessage?: string; warnings: string[]; isDragging: boolean; fileName?: string; loading?: boolean };
    pizza: { successMessage?: string; warnings: string[]; isDragging: boolean; fileName?: string; loading?: boolean };
    topping: { successMessage?: string; warnings: string[]; isDragging: boolean; fileName?: string; loading?: boolean };
  }>({
    base: { warnings: [], isDragging: false },
    pizza: { warnings: [], isDragging: false },
    topping: { warnings: [], isDragging: false }
  });

  const handleMenuFileImport = (file: File, category: 'base' | 'pizza' | 'topping') => {
    setImportStatus(prev => ({
      ...prev,
      [category]: { ...prev[category], loading: true, successMessage: undefined, warnings: [], fileName: file.name }
    }));

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/);
      
      let successCount = 0;
      const warnings: string[] = [];
      const upsertPayloads: any[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // skip empty lines silently
        
        const parts = line.split(';');
        if (parts.length < 3) {
          warnings.push(`Line ${i + 1}: Malformed line. Expected ID;Name;Price (found: "${line}")`);
          continue;
        }
        
        const id = parts[0]?.trim() || '';
        const name = parts[1]?.trim() || '';
        const priceStr = parts[2]?.trim() || '';
        
        if (!id || !name || !priceStr) {
          warnings.push(`Line ${i + 1}: Skipped due to missing fields (ID: "${id || 'missing'}", Name: "${name || 'missing'}", Price: "${priceStr || 'missing'}").`);
          continue;
        }
        
        const price = parseFloat(priceStr);
        if (isNaN(price)) {
          warnings.push(`Line ${i + 1} ("${name}"): Skipped due to invalid price "${priceStr}" (not a number).`);
          continue;
        }
        if (price <= 0) {
          warnings.push(`Line ${i + 1} ("${name}"): Skipped due to non-positive price "${priceStr}".`);
          continue;
        }
        
        upsertPayloads.push({
          item_code: id,
          category,
          name,
          price,
          is_active: true
        });
      }
      
      if (upsertPayloads.length === 0) {
        setImportStatus(prev => ({
          ...prev,
          [category]: {
            ...prev[category],
            loading: false,
            warnings: warnings.length > 0 ? warnings : ['The file did not contain any valid menu items.'],
            successMessage: undefined
          }
        }));
        return;
      }
      
      const supabase = getSupabase();
      if (supabase) {
        try {
          const { error: upsertError } = await supabase
            .from('menu_items')
            .upsert(upsertPayloads, { onConflict: 'item_code' });
            
          if (upsertError) {
            throw upsertError;
          }
          successCount = upsertPayloads.length;
        } catch (err: any) {
          console.error('Error upserting menu items to Supabase:', err);
          setImportStatus(prev => ({
            ...prev,
            [category]: {
              ...prev[category],
              loading: false,
              warnings: [...warnings, `Supabase Error: ${err.message || 'Could not save to database.'}`],
              successMessage: undefined
            }
          }));
          return;
        }
      } else {
        // Local/demo fallback
        try {
          const localMenuStr = localStorage.getItem('pizzaflow_menu');
          let localMenu: any[] = localMenuStr ? JSON.parse(localMenuStr) : [];
          
          upsertPayloads.forEach(payload => {
            const index = localMenu.findIndex(item => item.item_code === payload.item_code);
            if (index !== -1) {
              localMenu[index] = { ...localMenu[index], ...payload };
            } else {
              const randomId = category.charAt(0) + (localMenu.length + 1) + '_' + Math.random().toString(36).substring(2, 6);
              localMenu.push({ item_id: randomId, ...payload });
            }
          });
          
          localStorage.setItem('pizzaflow_menu', JSON.stringify(localMenu));
          successCount = upsertPayloads.length;
        } catch (err: any) {
          console.error('Error writing to local localStorage menu:', err);
          setImportStatus(prev => ({
            ...prev,
            [category]: {
              ...prev[category],
              loading: false,
              warnings: [...warnings, 'Local Storage Error: Could not store menu items.'],
              successMessage: undefined
            }
          }));
          return;
        }
      }

      const capCategory = category === 'base' ? 'Base' : category === 'pizza' ? 'Pizza' : 'Topping';
      
      setImportStatus(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          loading: false,
          successMessage: `Successfully loaded ${successCount} active ${capCategory} options!`,
          warnings
        }
      }));

      if (onMenuUpdated) {
        onMenuUpdated();
      }
    };
    
    reader.onerror = () => {
      setImportStatus(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          loading: false,
          warnings: ['Failed to read the file.'],
          successMessage: undefined
        }
      }));
    };
    
    reader.readAsText(file);
  };


  // Colors for Payment modes
  const COLORS = ['#BC6C25', '#606C38', '#4F7A4C', '#D0C9BC'];

  // Low stock calculation
  const lowStockCount = inventoryList.filter(item => item.current_stock < item.reorder_threshold).length;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
      {/* Dashboard Top Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E4D9] pb-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#3D332A] tracking-tight">
            Rajan's Operational Analytics
          </h2>
          <p className="text-xs text-[#8C8375] font-sans">
            Real-time shop telemetry parsed from live sales and stock counts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#FCFAF2] border border-[#E8E4D9] text-[#3D332A] flex items-center gap-1">
            <Database className="h-3.5 w-3.5 text-[#BC6C25]" />
            Mode: {dbMode === 'live' ? 'Live Supabase Sync' : 'Offline Engine Fallback'}
          </span>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="bg-[#FAF9F6] hover:bg-[#F2EFE9] border border-[#D0C9BC] text-[#3D332A] p-2 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex gap-2 items-center">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-3 bg-white border border-[#E8E4D9] rounded-2xl">
          <RefreshCw className="h-8 w-8 animate-spin text-[#BC6C25]" />
          <p className="text-xs font-mono uppercase tracking-wider font-semibold text-[#8C8375]">
            Compiling Supabase Analytics...
          </p>
        </div>
      ) : (
        <>
          {/* SECTION 1: Key Metrics Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue today */}
            <div className="bg-white border border-[#E8E4D9] rounded-xl p-4 shadow-2xs space-y-2">
              <div className="flex justify-between items-center text-[#8C8375]">
                <span className="text-xs font-bold uppercase tracking-wide font-sans">Revenue Today</span>
                <div className="p-1.5 bg-[#FDF8F2] text-[#BC6C25] rounded-lg">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-[#3D332A]">₹{(metrics.totalRevenue ?? 0).toFixed(2)}</p>
                <p className="text-[10px] text-[#4F7A4C] font-semibold flex items-center gap-1 font-sans mt-1">
                  <TrendingUp className="h-3 w-3" />
                  Live UTC Audit Active
                </p>
              </div>
            </div>

            {/* Total Orders today */}
            <div className="bg-white border border-[#E8E4D9] rounded-xl p-4 shadow-2xs space-y-2">
              <div className="flex justify-between items-center text-[#8C8375]">
                <span className="text-xs font-bold uppercase tracking-wide font-sans">Orders Today</span>
                <div className="p-1.5 bg-[#FAF9F6] text-[#3D332A] rounded-lg border border-[#E8E4D9]">
                  <ShoppingBag className="h-4 w-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-[#3D332A]">{metrics.totalOrders ?? 0}</p>
                <p className="text-[10px] text-[#8C8375] font-semibold flex items-center gap-1 font-sans mt-1">
                  Ticket counters synced
                </p>
              </div>
            </div>

            {/* Average Order Value today */}
            <div className="bg-white border border-[#E8E4D9] rounded-xl p-4 shadow-2xs space-y-2">
              <div className="flex justify-between items-center text-[#8C8375]">
                <span className="text-xs font-bold uppercase tracking-wide font-sans">Average Order Value</span>
                <div className="p-1.5 bg-[#EAF2E8] text-[#4F7A4C] rounded-lg">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-[#3D332A]">₹{(metrics.avgOrderValue ?? 0).toFixed(2)}</p>
                <p className="text-[10px] text-[#8C8375] font-semibold flex items-center gap-1 font-sans mt-1">
                  Revenue ÷ order count
                </p>
              </div>
            </div>

            {/* Total Discount Given today */}
            <div className="bg-white border border-[#E8E4D9] rounded-xl p-4 shadow-2xs space-y-2">
              <div className="flex justify-between items-center text-[#8C8375]">
                <span className="text-xs font-bold uppercase tracking-wide font-sans">Total Discount Today</span>
                <div className="p-1.5 bg-[#FFF0F0] text-red-600 rounded-lg">
                  <Percent className="h-4 w-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-[#3D332A]">₹{(metrics.totalDiscount ?? 0).toFixed(2)}</p>
                <p className="text-[10px] text-red-600 font-semibold flex items-center gap-1 font-sans mt-1">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  Volume concessions given
                </p>
              </div>
            </div>
          </div>

          {/* AI ANALYTICS CHATBOT PANEL */}
          <div className="bg-white border border-[#E8E4D9] rounded-2xl p-5 shadow-xs space-y-4 font-sans">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2 border-b border-[#E8E4D9]/40">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#FDF8F2] text-[#BC6C25] rounded-xl border border-[#F5EFE6]">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#3D332A] flex items-center gap-1.5">
                    SliceMatic Intelligence Chatbot
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#EAF2E8] text-[#4F7A4C] flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#4F7A4C] animate-pulse"></span>
                      OpenRouter Secure
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#8C8375]">
                    Ask natural business questions about sales metrics, payment trends, and product performance.
                  </p>
                </div>
              </div>
            </div>

            {/* Row of preset example questions */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-bold text-[#8C8375] tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-[#BC6C25]" /> Click a Preset Question to Analyze
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Which pizza category or specific item is our absolute best-seller?",
                  "Which day of the week generates the highest sales volume?",
                  "What is our most popular payment method, and how much revenue does it bring?",
                  "Are we facing any potential low-stock items in our inventory?",
                  "What is our average order value and how much discount did we give?"
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    disabled={chatLoading}
                    onClick={() => handleAnalyze(preset)}
                    className="text-[11px] font-medium bg-[#FCFAF2] hover:bg-[#F2EFE9] border border-[#E8E4D9] hover:border-[#D0C9BC] text-[#3D332A] px-2.5 py-1.5 rounded-lg transition text-left cursor-pointer disabled:opacity-50"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Input & Analyze Button */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleAnalyze();
              }}
              className="relative flex items-center"
            >
              <div className="absolute left-3.5 text-[#8C8375]">
                <MessageSquare className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={chatQuestion}
                onChange={(e) => setChatQuestion(e.target.value)}
                placeholder="Type your business question here (e.g. 'How did we do this weekend compared to weekdays?')..."
                disabled={chatLoading}
                className="w-full bg-[#FCFAF2] border border-[#E8E4D9] rounded-xl pl-10 pr-28 py-2.5 text-xs text-[#3D332A] font-medium placeholder-[#8C8375]/60 focus:outline-none focus:border-[#BC6C25] focus:ring-1 focus:ring-[#BC6C25] transition disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatQuestion.trim()}
                className="absolute right-1.5 bg-[#BC6C25] hover:bg-[#A05C1E] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed"
              >
                {chatLoading ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
                Analyze
              </button>
            </form>

            {/* Output Panel */}
            {(chatLoading || chatError || chatAnswer) && (
              <div className="border border-[#E8E4D9] rounded-xl overflow-hidden shadow-2xs">
                {chatLoading && (
                  <div className="bg-[#FCFAF2] p-4 flex items-center gap-3">
                    <RefreshCw className="h-4 w-4 animate-spin text-[#BC6C25] shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold text-[#3D332A]">AI Data Analyst Consulting...</p>
                      <p className="text-[10px] text-[#8C8375]">Running secure telemetry cross-referencing on your local & live sales logs.</p>
                    </div>
                  </div>
                )}

                {chatError && (
                  <div className="bg-red-50 p-4 border-l-4 border-red-500 flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-bold text-red-800">Telemetry Analysis Failed</p>
                      <p className="text-[10px] text-red-600 font-mono mt-0.5">{chatError}</p>
                    </div>
                  </div>
                )}

                {chatAnswer && (
                  <div className="bg-[#FCFAF2] p-4 space-y-2">
                    <div className="flex justify-between items-center pb-1.5 border-b border-[#E8E4D9]/40">
                      <span className="text-[9px] uppercase font-mono font-bold text-[#BC6C25] tracking-wider flex items-center gap-1">
                        <Bot className="h-3 w-3" /> Verified AI Analyst Report
                      </span>
                      <span className="text-[9px] text-[#8C8375] font-mono">SliceMatic v1.1</span>
                    </div>
                    <p className="text-xs text-[#3D332A] font-medium leading-relaxed font-sans whitespace-pre-wrap">
                      {chatAnswer}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BULK MENU DATA IMPORT PORTAL */}
          <div className="bg-white border border-[#E8E4D9] rounded-2xl p-5 shadow-xs space-y-4 font-sans">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2 border-b border-[#E8E4D9]/40">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#FAF9F6] text-[#BC6C25] rounded-xl border border-[#E8E4D9]">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#3D332A] flex items-center gap-1.5">
                    Menu Bulk-Import Portal
                  </h3>
                  <p className="text-[11px] text-[#8C8375]">
                    Perform a one-time or repeatable bulk-import of the menu configuration files. Data is written directly to the <strong>menu_items</strong> table.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['base', 'pizza', 'topping'] as const).map((cat) => {
                const status = importStatus[cat];
                const displayName = cat === 'base' ? 'Crust Base' : cat === 'pizza' ? 'Pizza Styles' : 'Premium Toppings';
                const expectedFile = cat === 'base' ? 'Types_of_Base.txt' : cat === 'pizza' ? 'Types_of_pizza.txt' : 'Types_of_toppings.txt';
                
                return (
                  <div 
                    key={cat}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setImportStatus(prev => ({
                        ...prev,
                        [cat]: { ...prev[cat], isDragging: true }
                      }));
                    }}
                    onDragLeave={() => {
                      setImportStatus(prev => ({
                        ...prev,
                        [cat]: { ...prev[cat], isDragging: false }
                      }));
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setImportStatus(prev => ({
                        ...prev,
                        [cat]: { ...prev[cat], isDragging: false }
                      }));
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        handleMenuFileImport(file, cat);
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-4 text-center flex flex-col justify-between min-h-[180px] transition-all duration-200 ${
                      status.isDragging 
                        ? 'border-[#BC6C25] bg-[#FDF8F2]' 
                        : 'border-[#E8E4D9] hover:border-[#BC6C25]/40 bg-[#FAF9F6]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-[#BC6C25] uppercase tracking-wider">{displayName}</span>
                        <span className="text-[9px] px-1.5 py-0.5 font-mono bg-[#E8E4D9]/40 text-stone-600 rounded">
                          {expectedFile}
                        </span>
                      </div>
                      
                      <div className="py-2 flex flex-col items-center justify-center gap-1.5 cursor-pointer" onClick={() => {
                        document.getElementById(`file-input-${cat}`)?.click();
                      }}>
                        <Upload className="h-5 w-5 text-[#8C8375]" />
                        <p className="text-xs font-semibold text-[#3D332A]">
                          Drag & drop file here
                        </p>
                        <p className="text-[10px] text-[#8C8375]">
                          or <span className="text-[#BC6C25] underline">browse local files</span>
                        </p>
                      </div>
                      
                      <input 
                        id={`file-input-${cat}`}
                        type="file" 
                        accept=".txt"
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleMenuFileImport(file, cat);
                          }
                        }}
                      />
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#E8E4D9]/40">
                      {status.loading ? (
                        <div className="flex items-center justify-center gap-1.5 py-1 text-[11px] text-stone-500 font-medium">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#BC6C25]" />
                          Parsing & Writing to database...
                        </div>
                      ) : status.successMessage ? (
                        <div className="space-y-1.5">
                          <div className="bg-[#EAF2E8] text-[#4F7A4C] border border-[#C6DCBF] px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 justify-center">
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#4F7A4C] shrink-0" />
                            <span>{status.successMessage}</span>
                          </div>
                          {status.fileName && (
                            <p className="text-[9px] font-mono text-[#8C8375] text-right">
                              Source: {status.fileName}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-stone-400 italic">No file imported yet</p>
                      )}

                      {status.warnings && status.warnings.length > 0 && (
                        <div className="mt-2 text-[10px] text-left bg-amber-50 text-[#BC6C25] border border-amber-200/60 p-2 rounded-lg max-h-24 overflow-y-auto space-y-1 font-mono leading-relaxed">
                          <div className="font-bold flex items-center gap-1 mb-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-[#BC6C25]" />
                            <span>Parse Warnings:</span>
                          </div>
                          {status.warnings.map((warn, i) => (
                            <div key={i} className="pl-2 border-l border-amber-300">
                              {warn}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bento Dashboard Body Rows */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* SECTION 2: Daily Trend Chart - 7 Columns */}
            <div className="lg:col-span-8 bg-white border border-[#E8E4D9] rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#3D332A] font-sans">
                  7-Day Daily Demand Curve
                </h3>
                <p className="text-[11px] text-[#8C8375]">
                  Daily tracking of registered sales revenue (₹) and transaction tickets.
                </p>
              </div>

              {ordersErrorMsg ? (
                <div className="h-64 flex flex-col items-center justify-center bg-red-50 border border-red-200 rounded-xl text-center p-4">
                  <AlertTriangle className="h-8 w-8 text-red-500 mb-2 shrink-0" />
                  <p className="text-xs text-red-700 font-bold font-sans">Could not load daily demand curve</p>
                  <p className="text-[10px] text-red-500 font-mono mt-1 leading-relaxed max-w-xs">{ordersErrorMsg}</p>
                </div>
              ) : trendData.length === 0 || trendData.every(t => t.orders === 0 && t.revenue === 0) ? (
                <div className="h-64 flex flex-col items-center justify-center bg-[#FAF9F6] rounded-xl text-center p-4">
                  <ShoppingBag className="h-8 w-8 text-[#8C8375]/40 mb-2" />
                  <p className="text-xs text-[#8C8375] font-medium font-sans">No orders recorded in the last 7 days.</p>
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE4" />
                      <XAxis dataKey="date" stroke="#8C8375" fontSize={10} fontStyle="mono" />
                      <YAxis yAxisId="left" stroke="#BC6C25" fontSize={10} />
                      <YAxis yAxisId="right" orientation="right" stroke="#606C38" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#FAF9F6', borderColor: '#E8E4D9', borderRadius: '8px', fontSize: '11px' }}
                        labelStyle={{ fontWeight: 'bold', color: '#3D332A' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                      <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#BC6C25" strokeWidth={2.5} activeDot={{ r: 6 }} />
                      <Line yAxisId="right" type="monotone" dataKey="orders" name="Order Count" stroke="#606C38" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* SECTION 4: Payment Mode Breakdown - 4 Columns */}
            <div className="lg:col-span-4 bg-white border border-[#E8E4D9] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#3D332A] font-sans">
                  Payment Mode Distribution
                </h3>
                <p className="text-[11px] text-[#8C8375]">
                  Proportion of orders paid by Cash, Card, and UPI.
                </p>
              </div>

              {paymentErrorMsg ? (
                <div className="h-52 flex flex-col items-center justify-center bg-red-50 border border-red-200 rounded-xl text-center p-4 my-auto">
                  <AlertTriangle className="h-8 w-8 text-red-500 mb-2 shrink-0" />
                  <p className="text-xs text-red-700 font-bold font-sans">Could not load payments</p>
                  <p className="text-[10px] text-red-500 font-mono mt-1 leading-relaxed max-w-xs">{paymentErrorMsg}</p>
                </div>
              ) : paymentData.length === 0 ? (
                <div className="h-52 flex flex-col items-center justify-center bg-[#FAF9F6] rounded-xl text-center p-4 my-auto">
                  <CreditCard className="h-8 w-8 text-[#8C8375]/40 mb-2" />
                  <p className="text-xs text-[#8C8375] font-medium font-sans">No payment metrics registered.</p>
                </div>
              ) : (
                <div className="h-52 flex flex-col justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {paymentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* SECTION 3: Top-Selling Items - 6 Columns */}
            <div className="lg:col-span-6 bg-white border border-[#E8E4D9] rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#3D332A] font-sans">
                  Top-Selling Menu Hierarchy
                </h3>
                <p className="text-[11px] text-[#8C8375]">
                  Most popular options segmented by category.
                </p>
              </div>

              {topSellingErrorMsg ? (
                <div className="h-32 flex flex-col items-center justify-center bg-red-50 border border-red-200 rounded-xl text-center p-4">
                  <AlertTriangle className="h-8 w-8 text-red-500 mb-2 shrink-0" />
                  <p className="text-xs text-red-700 font-bold font-sans">Could not load top items</p>
                  <p className="text-[10px] text-red-500 font-mono mt-1 leading-relaxed max-w-xs">{topSellingErrorMsg}</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {/* Pizzas */}
                  <div className="space-y-2 bg-[#FCFAF2] p-3 rounded-xl border border-[#E8E4D9]">
                    <p className="text-[10px] uppercase font-bold text-[#BC6C25] tracking-wider flex items-center gap-1 font-sans">
                      <Pizza className="h-3 w-3" /> Top Pizzas
                    </p>
                    {topItems.pizzas.length === 0 ? (
                      <p className="text-[10px] text-[#8C8375] italic">No items yet</p>
                    ) : (
                      <ul className="text-[11px] text-[#3D332A] font-medium space-y-1 divide-y divide-[#E8E4D9]/40">
                        {topItems.pizzas.map((item, idx) => (
                          <li key={idx} className="pt-1 flex justify-between">
                            <span className="truncate max-w-[80px]">{item.name}</span>
                            <span className="font-mono text-[#8C8375] font-bold">x{item.count}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Toppings */}
                  <div className="space-y-2 bg-[#FCFAF2] p-3 rounded-xl border border-[#E8E4D9]">
                    <p className="text-[10px] uppercase font-bold text-[#606C38] tracking-wider flex items-center gap-1 font-sans">
                      <Sparkles className="h-3 w-3" /> Top Toppings
                    </p>
                    {topItems.toppings.length === 0 ? (
                      <p className="text-[10px] text-[#8C8375] italic">No items yet</p>
                    ) : (
                      <ul className="text-[11px] text-[#3D332A] font-medium space-y-1 divide-y divide-[#E8E4D9]/40">
                        {topItems.toppings.map((item, idx) => (
                          <li key={idx} className="pt-1 flex justify-between">
                            <span className="truncate max-w-[80px]">{item.name}</span>
                            <span className="font-mono text-[#8C8375] font-bold">x{item.count}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Bases */}
                  <div className="space-y-2 bg-[#FCFAF2] p-3 rounded-xl border border-[#E8E4D9]">
                    <p className="text-[10px] uppercase font-bold text-[#8C8375] tracking-wider flex items-center gap-1 font-sans">
                      <Layers className="h-3 w-3" /> Top Bases
                    </p>
                    {topItems.bases.length === 0 ? (
                      <p className="text-[10px] text-[#8C8375] italic">No items yet</p>
                    ) : (
                      <ul className="text-[11px] text-[#3D332A] font-medium space-y-1 divide-y divide-[#E8E4D9]/40">
                        {topItems.bases.map((item, idx) => (
                          <li key={idx} className="pt-1 flex justify-between">
                            <span className="truncate max-w-[80px]">{item.name}</span>
                            <span className="font-mono text-[#8C8375] font-bold">x{item.count}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 5: Peak Hours - 6 Columns */}
            <div className="lg:col-span-6 bg-white border border-[#E8E4D9] rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#3D332A] font-sans">
                  Hour-of-Day Traffic Flow
                </h3>
                <p className="text-[11px] text-[#8C8375]">
                  Cumulative transactions plotted across 24 hours to track peak dinner rushes.
                </p>
              </div>

              {ordersErrorMsg ? (
                <div className="h-36 flex flex-col items-center justify-center bg-red-50 border border-red-200 rounded-xl text-center p-4">
                  <AlertTriangle className="h-8 w-8 text-red-500 mb-2 shrink-0" />
                  <p className="text-xs text-red-700 font-bold font-sans">Could not load traffic flow</p>
                  <p className="text-[10px] text-red-500 font-mono mt-1 leading-relaxed max-w-xs">{ordersErrorMsg}</p>
                </div>
              ) : peakHoursData.every(h => h.orders === 0) ? (
                <div className="h-36 flex flex-col items-center justify-center bg-[#FAF9F6] rounded-xl text-center p-4">
                  <Clock className="h-8 w-8 text-[#8C8375]/40 mb-2" />
                  <p className="text-xs text-[#8C8375] font-medium font-sans">No traffic history yet.</p>
                </div>
              ) : (
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakHoursData.filter(h => h.orders > 0 || h.hourNum % 2 === 0)} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE4" vertical={false} />
                      <XAxis dataKey="hour" stroke="#8C8375" fontSize={9} fontStyle="mono" />
                      <YAxis stroke="#8C8375" fontSize={9} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                      <Bar dataKey="orders" name="Orders" fill="#BC6C25" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 6: Inventory Status Section */}
          <div className="bg-white border border-[#E8E4D9] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[#E8E4D9] pb-2">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#3D332A] font-sans flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#BC6C25]" />
                  Inventory Controls & Reorder Dispatch
                </h3>
                <p className="text-[11px] text-[#8C8375]">
                  Calculates real-time ingredient volumes against safety margins.
                </p>
              </div>

              {lowStockCount > 0 ? (
                <div className="bg-red-50 border border-[#FCD7D7] text-red-600 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 animate-pulse font-sans">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  {lowStockCount} LOW STOCK CRITICAL ALERTS
                </div>
              ) : (
                <div className="bg-[#EAF2E8] border border-[#C5DCBF] text-[#4F7A4C] px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 font-sans">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#4F7A4C]" />
                  ALL INGREDIENT VOLUMES NOMINAL
                </div>
              )}
            </div>

            {inventoryErrorMsg ? (
              <div className="h-32 flex flex-col items-center justify-center bg-red-50 border border-red-200 rounded-xl text-center p-4">
                <AlertTriangle className="h-8 w-8 text-red-500 mb-2 shrink-0" />
                <p className="text-xs text-red-700 font-bold font-sans">Could not load inventory status</p>
                <p className="text-[10px] text-red-500 font-mono mt-1 leading-relaxed max-w-xs">{inventoryErrorMsg}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {inventoryList.map((item, idx) => {
                  const isLow = item.current_stock < item.reorder_threshold;
                  return (
                    <div 
                      key={idx}
                      className={`p-3 rounded-xl border transition-all ${
                        isLow 
                          ? 'bg-[#FFF0F0] border-[#FCD7D7] shadow-2xs' 
                          : 'bg-[#FAF9F6] border-[#E8E4D9] hover:border-[#D0C9BC]'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <p className="text-[11px] font-bold text-[#3D332A] truncate" title={item.ingredient}>
                          {item.ingredient}
                        </p>
                        {isLow && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 animate-bounce" />}
                      </div>

                      <div className="mt-2 flex justify-between items-baseline">
                        <p className={`text-base font-mono font-bold ${isLow ? 'text-red-600' : 'text-[#3D332A]'}`}>
                          {item.current_stock}
                          <span className="text-[10px] text-[#8C8375] font-sans font-medium ml-0.5">{item.unit}</span>
                        </p>
                      </div>

                      <div className="mt-1 flex justify-between items-center text-[9px] text-[#8C8375] border-t border-[#E8E4D9]/40 pt-1">
                        <span>Threshold:</span>
                        <span className="font-mono font-bold">{item.reorder_threshold} {item.unit}</span>
                      </div>

                      {isLow && (
                        <span className="mt-1.5 block text-center text-[9px] font-bold text-red-600 bg-red-100 rounded py-0.5 uppercase tracking-wide">
                          Needs Restock
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 7: Recent Orders Table (Retained & Placed cleanly here) */}
          <div className="space-y-3">
            <ActiveOrderHistory orders={ordersList} />
          </div>



          {/* Table Telemetry Proof & Logic Section */}
          <div className="bg-[#FCFAF2] border border-[#E8E4D9] rounded-2xl p-5 shadow-xs space-y-3 font-sans">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#3D332A] flex items-center gap-1.5">
              <Database className="h-4 w-4 text-[#BC6C25]" />
              Rajan's Telemetry Audit Matrix
            </h4>
            <p className="text-[11px] text-[#8C8375] leading-relaxed">
              Every value shown on this admin panel is sourced directly from a database connection. Below is the strict mapping of physical Supabase tables and programmatic querying logic utilized to generate this dashboard:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 text-[11px]">
              {queryLog.map((log, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-[#E8E4D9] flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-[#3D332A]">{log.section}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        log.status === 'success' 
                          ? 'bg-[#EAF2E8] text-[#4F7A4C]' 
                          : 'bg-amber-100 text-[#BC6C25]'
                      }`}>
                        {log.status === 'success' ? 'Live Query Active' : 'Fallback Engaged'}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#8C8375] font-mono mt-0.5">
                      <span className="font-bold text-[#BC6C25]">Source Table:</span> {log.table}
                    </p>
                    <p className="text-[10px] text-stone-600 font-mono mt-1 italic">
                      <span className="font-bold text-[#606C38]">Query Logic:</span> {log.logic}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
