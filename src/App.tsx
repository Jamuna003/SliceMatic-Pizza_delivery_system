import { useState, useEffect, useRef } from 'react';
import {
  Pizza,
  User,
  Phone,
  ShoppingBag,
  CreditCard,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Plus,
  Minus,
  Info,
  ChevronRight,
  ChevronLeft,
  Wifi,
  WifiOff,
  AlertTriangle,
  Receipt,
  RotateCcw,
  LogOut,
  TrendingUp
} from 'lucide-react';

import { MenuItem, Order } from './types';
import {
  fetchMenuItems,
  createOrder,
  getLocalOrders,
  isSupabaseConfigured,
  DEFAULT_MENU_ITEMS,
  getSupabase
} from './supabaseClient';

import { EdgeCaseLab } from './components/EdgeCaseLab';
import { LiveReceipt } from './components/LiveReceipt';
import { ActiveOrderHistory } from './components/ActiveOrderHistory';
import { SupabaseAuth } from './components/SupabaseAuth';
import { AdminDashboard } from './components/AdminDashboard';

export default function App() {
  // Menu items loaded from Supabase or fallback local database
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbStatus, setDbStatus] = useState<'connected' | 'demo'>('demo');

  // Auth State
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'customer' | 'admin'>('customer');

  // Multi-step workflow:
  // 1: Customer Details Intake
  // 2: Base Selection
  // 3: Pizza Selection
  // 4: Topping Selection
  // 5: Quantity Selection
  // 6: Review & Payment Selection
  // 7: Order Success Screen
  const [activeStep, setActiveStep] = useState<number>(1);

  // Form State Values
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  const [selectedBase, setSelectedBase] = useState<MenuItem | null>(null);
  const [baseInput, setBaseInput] = useState<string>('');

  const [selectedPizza, setSelectedPizza] = useState<MenuItem | null>(null);
  const [pizzaInput, setPizzaInput] = useState<string>('');

  const [selectedTopping, setSelectedTopping] = useState<MenuItem | null>(null);
  const [toppingInput, setToppingInput] = useState<string>('');

  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [quantity, setQuantity] = useState<number>(1);

  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card' | 'UPI' | null>(null);

  // Validation Error States (Dedicated Inline Errors)
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [baseError, setBaseError] = useState<string | null>(null);
  const [pizzaError, setPizzaError] = useState<string | null>(null);
  const [toppingError, setToppingError] = useState<string | null>(null);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Order Submission & Historical Record
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);

  // Lab testing helper highlights
  const [activeCaseId, setActiveCaseId] = useState<number | null>(null);

  // Listen to Supabase Auth State Changes
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      // Offline/Demo mode: check if cached mock user exists
      const cached = localStorage.getItem('pizzaflow_mock_user');
      if (cached) {
        try {
          setUser(JSON.parse(cached));
        } catch (e) {
          localStorage.removeItem('pizzaflow_mock_user');
        }
      }
      setAuthLoading(false);
      return;
    }

    // Live Supabase session checks
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('pizzaflow_mock_user');
    setUser(null);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const items = await fetchMenuItems();
      setMenuItems(items);
      setDbStatus(isSupabaseConfigured ? 'connected' : 'demo');
    } catch (err) {
      console.error('Failed to load menu items, using local defaults:', err);
      setMenuItems(DEFAULT_MENU_ITEMS);
      setDbStatus('demo');
    } finally {
      setIsLoading(false);
    }
    setOrderHistory(getLocalOrders());
  };

  // Sync / loading on mount
  useEffect(() => {
    loadData();
  }, [user]);

  const refreshMenu = async () => {
    try {
      const items = await fetchMenuItems();
      setMenuItems(items);
    } catch (err) {
      console.error('Failed to refresh menu items:', err);
    }
  };

  // Filter and group menu items (excluding deactivated ones)
  const activeBases = menuItems.filter(item => item.category === 'base' && item.is_active);
  const activePizzas = menuItems.filter(item => item.category === 'pizza' && item.is_active);
  const activeToppings = menuItems.filter(item => item.category === 'topping' && item.is_active);

  // Custom live time clock state
  const [currentTime, setCurrentTime] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper validation: Name (Edge Case #1: Spaces only, and general validation)
  const handleNameValidate = (value: string): boolean => {
    const trimmed = value.trim();
    if (!value) {
      setNameError('Customer name is required.');
      return false;
    }
    if (!trimmed) {
      setNameError('Name with only spaces is rejected as invalid. Please enter a real name.'); // Edge Case #1
      return false;
    }
    if (trimmed.length < 2) {
      setNameError('Name must be at least 2 characters long.');
      return false;
    }
    if (trimmed.length > 40) {
      setNameError('Name cannot exceed 40 characters.');
      return false;
    }
    const lettersAndSpacesOnly = /^[A-Za-z\s]+$/.test(trimmed);
    if (!lettersAndSpacesOnly) {
      setNameError('Invalid characters. Name must contain letters and spaces only.');
      return false;
    }
    setNameError(null);
    return true;
  };

  // Helper validation: Phone (Edge Case #2: Indian format & Starts with 1)
  const handlePhoneValidate = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) {
      setPhoneError('Customer phone number is required.');
      return false;
    }

    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length !== 10 || trimmed !== digitsOnly) {
      setPhoneError('Phone number must be exactly 10 digits without any spaces or symbols.');
      return false;
    }

    const firstChar = digitsOnly.charAt(0);
    if (firstChar === '1') {
      setPhoneError("Indian format failure: Mobile number cannot start with '1'. It must start with 6, 7, 8, or 9."); // Edge Case #2
      return false;
    }

    if (!['6', '7', '8', '9'].includes(firstChar)) {
      setPhoneError(`Invalid format: Number cannot start with '${firstChar}'. Mobile number must start with 6, 7, 8, or 9.`);
      return false;
    }

    setPhoneError(null);
    return true;
  };

  // Helper validation: Item selections (Edge Case #4: Out of bounds index, Edge Case #5: Typing price instead of index, Edge Case #8: Missing Price field)
  const handleItemSelectValidate = (
    input: string,
    items: MenuItem[],
    categoryLabel: string,
    setError: (err: string | null) => void,
    setSelected: (item: MenuItem | null) => void
  ): boolean => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError(`Please select a ${categoryLabel} by clicking or typing a number/code.`); // Edge Case #6
      setSelected(null);
      return false;
    }

    // A. Match by item_code (e.g., "B1", "P1", etc.)
    const matchedByCode = items.find(item => item.item_code.toUpperCase() === trimmed.toUpperCase());
    if (matchedByCode) {
      const isPriceValid = matchedByCode.price !== null && matchedByCode.price !== undefined && typeof matchedByCode.price === 'number' && !isNaN(matchedByCode.price);
      if (!isPriceValid) {
        setError(`Item ${matchedByCode.item_code} (${matchedByCode.name}) is temporarily unavailable due to a pricing error.`); // Edge Case #8
        setSelected(null);
        return false;
      }
      setSelected(matchedByCode);
      setError(null);
      return true;
    }

    // B. Match by index number (e.g., "1", "2", "3")
    const numVal = Number(trimmed);
    if (isNaN(numVal) || !Number.isInteger(numVal)) {
      setError(`Invalid selection '${trimmed}'. Please enter a whole list number (1 to ${items.length}) or a code (e.g. B1).`); // Edge Case #7/5
      setSelected(null);
      return false;
    }

    // Edge Case #5: Typo where they enter a price (e.g., 299) instead of item index
    if (numVal > items.length) {
      const matchedPrice = items.some(item => {
        const itemPrice = Number(item.price);
        return !isNaN(itemPrice) && itemPrice === numVal;
      });

      if (matchedPrice) {
        setError(`You typed '${numVal}', which matches an item price rather than a valid index. Please enter a valid list index (1 to ${items.length}) or code.`); // Edge Case #5
        setSelected(null);
        return false;
      } else {
        setError(`Selection index ${numVal} is out of bounds. The selection list only contains ${items.length} items.`); // Edge Case #4
        setSelected(null);
        return false;
      }
    }

    // Edge Case #4: 0 or negative
    if (numVal <= 0) {
      setError(`Out of range. List index must be 1 to ${items.length} (Index 0 is invalid).`); // Edge Case #4
      setSelected(null);
      return false;
    }

    const selectedItem = items[numVal - 1];
    if (!selectedItem) {
      setError(`Item index ${numVal} does not exist in the active menu.`);
      setSelected(null);
      return false;
    }

    // Edge Case #8: Null/missing price check
    const isPriceValid = selectedItem.price !== null && selectedItem.price !== undefined && typeof selectedItem.price === 'number' && !isNaN(selectedItem.price);
    if (!isPriceValid) {
      setError(`Item '${selectedItem.name}' is temporarily unavailable due to a price system error.`); // Edge Case #8
      setSelected(null);
      return false;
    }

    setSelected(selectedItem);
    setError(null);
    return true;
  };

  // Helper validation: Quantity (Edge Case #3: 0 and 11 range, Edge Case #7: Decimal or text)
  const handleQuantityValidate = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) {
      setQuantityError('Quantity is required.'); // Edge Case #6
      return false;
    }

    const numVal = Number(trimmed);
    if (isNaN(numVal)) {
      setQuantityError(`Invalid entry '${trimmed}'. Quantity must be a whole integer number (between 1 and 10).`); // Edge Case #7
      return false;
    }

    if (!Number.isInteger(numVal)) {
      setQuantityError(`Decimal values like '${trimmed}' are rejected. Quantity must be a whole number (between 1 and 10).`); // Edge Case #7
      return false;
    }

    if (numVal < 1 || numVal > 10) {
      setQuantityError(`Quantity ${numVal} is out of bounds. Counter orders must be between 1 and 10 inclusive.`); // Edge Case #3
      return false;
    }

    setQuantity(numVal);
    setQuantityError(null);
    return true;
  };

  // Process the Edge Case triggers from the lab
  const handleTriggerCase = (caseId: number) => {
    setActiveCaseId(caseId);

    // Reset error fields to clean states before showing validation
    setNameError(null);
    setPhoneError(null);
    setBaseError(null);
    setPizzaError(null);
    setToppingError(null);
    setQuantityError(null);
    setPaymentError(null);

    switch (caseId) {
      case 1:
        // Name with only spaces
        setCustomerName('     ');
        setCustomerPhone('9876543210');
        setActiveStep(1);
        setTimeout(() => handleNameValidate('     '), 100);
        break;

      case 2:
        // Phone starts with 1
        setCustomerName('Rajesh Kumar');
        setCustomerPhone('1234567890');
        setActiveStep(1);
        setTimeout(() => handlePhoneValidate('1234567890'), 100);
        break;

      case 3:
        // Quantity = 11 (Out of bounds)
        setQuantityInput('11');
        setActiveStep(5);
        setTimeout(() => handleQuantityValidate('11'), 100);
        break;

      case 4:
        // Out of bounds item index in base selection
        setBaseInput('99');
        setActiveStep(2);
        setTimeout(() => {
          handleItemSelectValidate('99', activeBases, 'crust base', setBaseError, setSelectedBase);
        }, 100);
        break;

      case 5:
        // Price instead of index (e.g. 299)
        setBaseInput('299');
        setActiveStep(2);
        setTimeout(() => {
          handleItemSelectValidate('299', activeBases, 'crust base', setBaseError, setSelectedBase);
        }, 100);
        break;

      case 6:
        // Empty inputs at prompt
        if (activeStep === 1) {
          setCustomerName('');
          setCustomerPhone('');
          handleNameValidate('');
          handlePhoneValidate('');
        } else if (activeStep === 2) {
          setBaseInput('');
          handleItemSelectValidate('', activeBases, 'crust base', setBaseError, setSelectedBase);
        } else if (activeStep === 3) {
          setPizzaInput('');
          handleItemSelectValidate('', activePizzas, 'pizza style', setPizzaError, setSelectedPizza);
        } else if (activeStep === 4) {
          setToppingInput('');
          handleItemSelectValidate('', activeToppings, 'gourmet topping', setToppingError, setSelectedTopping);
        } else if (activeStep === 5) {
          setQuantityInput('');
          handleQuantityValidate('');
        } else if (activeStep === 6) {
          setPaymentMode(null);
          setPaymentError('Please select a payment method to complete the order.');
        }
        break;

      case 7:
        // Non-integer quantity prompt
        setQuantityInput('3.5');
        setActiveStep(5);
        setTimeout(() => handleQuantityValidate('3.5'), 100);
        break;

      case 8:
        // Missing Menu Price check
        // Navigate to Base, highlighting the error items
        setActiveStep(2);
        setBaseInput('B6');
        setTimeout(() => {
          handleItemSelectValidate('B6', activeBases, 'crust base', setBaseError, setSelectedBase);
        }, 100);
        break;

      default:
        break;
    }
  };

  // Navigation controller with strict checks for each step
  const handleNextStep = () => {
    if (activeStep === 1) {
      const isNameValid = handleNameValidate(customerName);
      const isPhoneValid = handlePhoneValidate(customerPhone);
      if (isNameValid && isPhoneValid) {
        setActiveStep(2);
      }
    } else if (activeStep === 2) {
      const isValid = handleItemSelectValidate(baseInput, activeBases, 'crust base', setBaseError, setSelectedBase);
      if (isValid) {
        setActiveStep(3);
      }
    } else if (activeStep === 3) {
      const isValid = handleItemSelectValidate(pizzaInput, activePizzas, 'pizza style', setPizzaError, setSelectedPizza);
      if (isValid) {
        setActiveStep(4);
      }
    } else if (activeStep === 4) {
      const isValid = handleItemSelectValidate(toppingInput, activeToppings, 'gourmet topping', setToppingError, setSelectedTopping);
      if (isValid) {
        setActiveStep(5);
      }
    } else if (activeStep === 5) {
      const isValid = handleQuantityValidate(quantityInput);
      if (isValid) {
        setActiveStep(6);
      }
    }
  };

  const handlePrevStep = () => {
    if (activeStep > 1) {
      setActiveStep(prev => prev - 1);
    }
  };

  // Card selector click handler for UI
  const handleCardClick = (item: MenuItem) => {
    // Edge Case #8: Null/missing price check prevents card click from continuing
    const isPriceValid = item.price !== null && item.price !== undefined && typeof item.price === 'number' && !isNaN(item.price);
    if (!isPriceValid) {
      const errMessage = `Item '${item.name}' cannot be selected because its price data is invalid or missing.`;
      if (item.category === 'base') setBaseError(errMessage);
      if (item.category === 'pizza') setPizzaError(errMessage);
      if (item.category === 'topping') setToppingError(errMessage);
      return;
    }

    if (item.category === 'base') {
      setSelectedBase(item);
      setBaseInput(item.item_code);
      setBaseError(null);
    } else if (item.category === 'pizza') {
      setSelectedPizza(item);
      setPizzaInput(item.item_code);
      setPizzaError(null);
    } else if (item.category === 'topping') {
      setSelectedTopping(item);
      setToppingInput(item.item_code);
      setToppingError(null);
    }
  };

  // Math helper for calculations
  const getSafePrice = (item: MenuItem | null): number => {
    if (!item) return 0;
    const price = Number(item.price);
    return isNaN(price) ? 0 : price;
  };

  const calcSubtotal = () => {
    const p1 = getSafePrice(selectedBase);
    const p2 = getSafePrice(selectedPizza);
    const p3 = getSafePrice(selectedTopping);
    return (p1 + p2 + p3) * quantity;
  };

  const subtotalVal = calcSubtotal();
  const discountVal = quantity >= 5 ? subtotalVal * 0.1 : 0;
  const gstVal = (subtotalVal - discountVal) * 0.18;
  const totalVal = subtotalVal - discountVal + gstVal;

  // Save the Order
  const handlePlaceOrder = async () => {
    if (!paymentMode) {
      setPaymentError('Please select a payment mode (Cash, Card, or UPI) to complete transaction.'); // Edge Case #6
      return;
    }

    // Client-side safety check: block if any of the three items' price is null, undefined, or not a number
    const bp = selectedBase?.price;
    const pp = selectedPizza?.price;
    const tp = selectedTopping?.price;

    if (bp === null || bp === undefined || isNaN(Number(bp)) ||
        pp === null || pp === undefined || isNaN(Number(pp)) ||
        tp === null || tp === undefined || isNaN(Number(tp))) {
      setPaymentError('Could not submit order: One or more selected items has an invalid, null, or undefined price configuration.');
      return;
    }

    setPaymentError(null);
    setSubmitting(true);

    const orderNum = `SM-${String(orderHistory.length + 1).padStart(3, '0')}`;
    const newOrder: Order = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 9),
      order_number: orderNum,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      base_item_id: selectedBase?.item_id || 'unknown',
      base_name: selectedBase?.name || 'Unknown Base',
      base_price: getSafePrice(selectedBase),
      pizza_item_id: selectedPizza?.item_id || 'unknown',
      pizza_name: selectedPizza?.name || 'Unknown Pizza',
      pizza_price: getSafePrice(selectedPizza),
      topping_item_id: selectedTopping?.item_id || 'unknown',
      topping_name: selectedTopping?.name || 'Unknown Topping',
      topping_price: getSafePrice(selectedTopping),
      quantity,
      subtotal: subtotalVal,
      discount: discountVal,
      gst: gstVal,
      total: totalVal,
      payment_mode: paymentMode,
      created_at: new Date().toISOString(),
      sync_status: 'local'
    };

    try {
      const supabase = getSupabase();
      if (supabase) {
        console.log('Step 1: Attempting customer upsert first:', { phone: customerPhone.trim(), name: customerName.trim() });
        const { error: customerError } = await supabase
          .from('customers')
          .upsert(
            { phone: customerPhone.trim(), name: customerName.trim() },
            { onConflict: 'phone' }
          );

        if (customerError) {
          console.error('Customer upsert failed:', customerError);
          setPaymentError(`Could not save customer: ${customerError.message}`);
          setSubmitting(false);
          return;
        }
      }

      // Step 2: Proceed with order insertion
      const res = await createOrder(newOrder);
      
      if (!res.success || res.sync_status !== 'synced') {
        console.warn('Failed to save order to live database:', res.error);
        setPaymentError(res.error || 'Could not save order. Please try again.');
        setSubmitting(false);
        return;
      }

      const syncedOrder = { ...newOrder, sync_status: 'synced' as const };

      // Update history list and active order
      setActiveOrder(syncedOrder);
      setOrderHistory(getLocalOrders());
      setActiveStep(7); // success screen
    } catch (e: any) {
      console.error('Order registration failed:', e);
      setPaymentError(e.message || 'Could not save order -- check connection and try again');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset ordering station for a new client
  const handleResetStation = () => {
    setCustomerName('');
    setCustomerPhone('');
    setSelectedBase(null);
    setBaseInput('');
    setSelectedPizza(null);
    setPizzaInput('');
    setSelectedTopping(null);
    setToppingInput('');
    setQuantityInput('1');
    setQuantity(1);
    setPaymentMode(null);
    setActiveOrder(null);
    setActiveCaseId(null);

    // Reset errors
    setNameError(null);
    setPhoneError(null);
    setBaseError(null);
    setPizzaError(null);
    setToppingError(null);
    setQuantityError(null);
    setPaymentError(null);

    setActiveStep(1);
  };

  // Helper check for item price valid
  const checkPriceValid = (item: MenuItem) => {
    return item.price !== null && item.price !== undefined && typeof item.price === 'number' && !isNaN(item.price);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] font-sans text-[#3D332A] flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4">
          <RefreshCw className="h-10 w-10 animate-spin text-[#BC6C25] mx-auto" />
          <p className="text-sm font-mono uppercase tracking-wider font-bold text-[#8C8375]">
            Verifying Terminal Session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="pizzaflow-dashboard" className="min-h-screen bg-[#FAF9F6] font-sans text-[#3D332A] flex flex-col">
      {/* Header Bar */}
      <header id="pos-header" className="bg-[#FCFAF2] border-b border-[#E8E4D9] px-6 py-4 flex flex-wrap justify-between items-center gap-4 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="bg-[#BC6C25] text-white p-2.5 rounded-lg shadow-sm">
            <Pizza className="h-6 w-6 font-bold animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold tracking-tight text-[#3D332A] flex items-center gap-2">
              PizzaFlow
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF9F6] text-[#BC6C25] border border-[#D0C9BC] font-semibold">
                Staff Terminal
              </span>
            </h1>
            <p className="text-[11px] font-sans text-[#8C8375] font-medium uppercase tracking-wider">SliceMatic Counter POS</p>
          </div>
        </div>

        {/* Persistent Tab Selection Controls */}
        <div id="navigation-tabs" className="flex bg-[#FAF9F6] p-1 rounded-xl border border-[#E8E4D9] shadow-xs">
          <button
            id="nav-tab-customer"
            onClick={() => setActiveTab('customer')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'customer'
                ? 'bg-white text-[#BC6C25] shadow-xs border border-[#E8E4D9]/80'
                : 'text-[#8C8375] hover:text-[#3D332A]'
            }`}
          >
            <Pizza className="h-3.5 w-3.5" />
            Walk-in Ordering
          </button>
          <button
            id="nav-tab-admin"
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'admin'
                ? 'bg-white text-[#BC6C25] shadow-xs border border-[#E8E4D9]/80'
                : 'text-[#8C8375] hover:text-[#3D332A]'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Admin Dashboard
          </button>
        </div>

        {/* Real-time details */}
        <div className="flex items-center gap-4 text-xs">
          {/* Time */}
          <div className="font-mono bg-white px-3 py-1.5 rounded-md border border-[#E8E4D9] text-[#3D332A] font-semibold shadow-xs">
            {currentTime || '00:00:00'}
          </div>

          {/* Connection Status */}
          <div
            id="db-connection-status"
            className={`flex items-center gap-1.5 font-sans font-medium px-3 py-1.5 rounded-md border text-xs shadow-xs ${
              dbStatus === 'connected'
                ? 'bg-[#EAF2E8] border-[#C5DCBF] text-[#4F7A4C]'
                : 'bg-[#FAF0E6] border-[#EED7C5] text-[#A66C44]'
            }`}
          >
            {dbStatus === 'connected' ? (
              <>
                <Wifi className="h-3.5 w-3.5" />
                <span>Supabase Sync Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5" />
                <span>Local Seed Mode (Vercel Ready)</span>
              </>
            )}
          </div>

          {/* User Account / Sign Out */}
          {user && (
            <div className="flex items-center gap-3 border-l border-[#E8E4D9] pl-3">
              <div className="text-right hidden sm:block">
                <p className="text-[11px] font-bold text-[#3D332A] leading-tight">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </p>
                <p className="text-[9px] text-[#8C8375] font-semibold uppercase tracking-wider font-sans leading-none mt-0.5">
                  {user.is_demo ? 'Demo Manager' : 'Active Staff'}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                title="Secure Sign Out"
                className="bg-[#FFF0F0] text-red-600 border border-[#FCD7D7] hover:bg-red-50 hover:border-red-300 p-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-semibold"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline text-[11px]">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace Grid or Admin Dashboard */}
      {activeTab === 'admin' ? (
        user ? (
          <AdminDashboard onMenuUpdated={refreshMenu} />
        ) : (
          <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
            <div className="w-full max-w-md bg-white border border-[#E8E4D9] rounded-2xl p-6 shadow-xs">
              <div className="text-center mb-4">
                <h3 className="text-base font-serif font-bold text-[#3D332A] tracking-tight">Rajan's Operational Console</h3>
                <p className="text-xs text-[#8C8375] mt-1">Please sign in to access sensitive business metrics.</p>
              </div>
              <SupabaseAuth onAuthSuccess={(authenticatedUser) => setUser(authenticatedUser)} />
            </div>
          </div>
        )
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Steps Counter Input */}
        <section className="lg:col-span-8 flex flex-col gap-6">
          {/* Progress Indicator */}
          {activeStep < 7 && (
            <div id="pos-progress-stepper" className="bg-white border border-[#E8E4D9] rounded-xl p-4 flex justify-between items-center overflow-x-auto gap-4 shadow-xs">
              {[
                { s: 1, label: 'Intake' },
                { s: 2, label: 'Base' },
                { s: 3, label: 'Pizza' },
                { s: 4, label: 'Topping' },
                { s: 5, label: 'Quantity' },
                { s: 6, label: 'Review' }
              ].map((step) => (
                <div
                  key={step.s}
                  onClick={() => {
                    // Do not allow arbitrary skipping unless prior selections exist
                    if (step.s === 1) setActiveStep(1);
                    else if (step.s === 2 && customerName && customerPhone && !nameError && !phoneError) setActiveStep(2);
                    else if (step.s === 3 && selectedBase) setActiveStep(3);
                    else if (step.s === 4 && selectedPizza) setActiveStep(4);
                    else if (step.s === 5 && selectedTopping) setActiveStep(5);
                    else if (step.s === 6 && quantity >= 1 && quantity <= 10) setActiveStep(6);
                  }}
                  className={`flex items-center gap-2 cursor-pointer transition whitespace-nowrap ${
                    activeStep === step.s
                      ? 'text-[#BC6C25] font-bold'
                      : activeStep > step.s
                      ? 'text-stone-600 font-medium hover:text-stone-900'
                      : 'text-stone-400 pointer-events-none'
                  }`}
                >
                  <span
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-mono border ${
                      activeStep === step.s
                        ? 'bg-[#FDF8F2] border-[#BC6C25] text-[#BC6C25] font-bold'
                        : activeStep > step.s
                        ? 'bg-[#F2EFE9] border-[#D0C9BC] text-[#61574C]'
                        : 'bg-[#FAF9F6] border-[#E8E4D9] text-stone-400'
                    }`}
                  >
                    {step.s}
                  </span>
                  <span className="text-xs font-sans font-semibold">{step.label}</span>
                  {step.s < 6 && <span className="text-[#E8E4D9] text-xs font-mono">/</span>}
                </div>
              ))}
            </div>
          )}

          {/* Active Workspace Panel */}
          <div id="pos-workspace-panel" className="bg-white border border-[#E8E4D9] rounded-xl p-6 shadow-sm flex-1 flex flex-col min-h-[450px]">
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[#8C8375] gap-2">
                <RefreshCw className="h-8 w-8 animate-spin text-[#BC6C25]" />
                <p className="text-xs font-mono uppercase tracking-wider font-semibold">Syncing Menu Inventory...</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {/* Step 1: Customer details Intake */}
                {activeStep === 1 && (
                  <div id="step-1-container" className="space-y-6 flex-1 flex flex-col justify-center max-w-md mx-auto w-full py-4">
                    <div className="text-center mb-2">
                      <div className="bg-[#BC6C25]/10 text-[#BC6C25] h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3 border border-[#BC6C25]/20">
                        <User className="h-6 w-6" />
                      </div>
                      <h2 className="text-lg font-serif font-bold text-[#3D332A]">Customer Intake Registration</h2>
                      <p className="text-xs text-[#8C8375] mt-1">Register the walk-in customer details before selection.</p>
                    </div>

                    <div className="space-y-4 font-sans">
                      {/* Name input */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-stone-600 font-sans flex justify-between">
                          <span>CUSTOMER NAME</span>
                          <span className="text-[10px] text-[#8C8375]">2-40 CHARS (LETTERS & SPACES)</span>
                        </label>
                        <div className="relative">
                          <input
                            id="customer-name-input"
                            type="text"
                            value={customerName}
                            onChange={(e) => {
                              setCustomerName(e.target.value);
                              if (nameError) handleNameValidate(e.target.value);
                            }}
                            placeholder="e.g. Rajesh Kumar"
                            className={`w-full bg-[#FAF9F6] border rounded-lg px-4 py-2.5 text-sm outline-none transition focus:border-[#BC6C25] text-[#3D332A] font-medium ${
                              nameError ? 'border-red-500 focus:border-red-500' : 'border-[#D0C9BC]'
                            }`}
                          />
                        </div>
                        {nameError && (
                          <p id="customer-name-error" className="text-xs text-red-600 flex items-center gap-1 mt-1 font-mono">
                            <AlertTriangle className="h-3 w-3 shrink-0" /> {nameError}
                          </p>
                        )}
                      </div>

                      {/* Phone input */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-stone-600 font-sans flex justify-between">
                          <span>MOBILE PHONE NUMBER</span>
                          <span className="text-[10px] text-[#8C8375]">10 DIGITS (STARTS WITH 6,7,8,9)</span>
                        </label>
                        <div className="relative">
                          <input
                            id="customer-phone-input"
                            type="tel"
                            maxLength={10}
                            value={customerPhone}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, ''); // digit-only safe
                              setCustomerPhone(val);
                              if (phoneError) handlePhoneValidate(val);
                            }}
                            placeholder="e.g. 9876543210"
                            className={`w-full bg-[#FAF9F6] border rounded-lg px-4 py-2.5 text-sm outline-none transition focus:border-[#BC6C25] text-[#3D332A] font-medium ${
                              phoneError ? 'border-red-500 focus:border-red-500' : 'border-[#D0C9BC]'
                            }`}
                          />
                        </div>
                        {phoneError && (
                          <p id="customer-phone-error" className="text-xs text-red-600 flex items-center gap-1 mt-1 font-mono">
                            <AlertTriangle className="h-3 w-3 shrink-0" /> {phoneError}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Crust Base Selection */}
                {activeStep === 2 && (
                  <div id="step-2-container" className="flex-1 flex flex-col gap-5">
                    <div>
                      <h2 className="text-base font-serif font-bold text-[#3D332A]">Select Crust Base</h2>
                      <p className="text-xs text-[#8C8375]">Choose exactly one crust base. Available items are numbered.</p>
                    </div>

                    {/* Numeric List & Grid Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 overflow-y-auto max-h-[300px] pr-1">
                      {activeBases.map((item, index) => {
                        const isAvailable = checkPriceValid(item);
                        const isSelected = selectedBase?.item_id === item.item_id;
                        return (
                          <div
                            key={item.item_id}
                            id={`base-card-${item.item_code}`}
                            onClick={() => isAvailable && handleCardClick(item)}
                            className={`p-3 rounded-lg border text-left cursor-pointer transition flex justify-between items-center ${
                              isSelected
                                ? 'bg-[#FDF8F2] border-[#BC6C25] text-[#3D332A] font-semibold shadow-xs'
                                : isAvailable
                                ? 'bg-[#FAF9F6] border-[#E8E4D9] hover:border-[#D0C9BC] text-stone-700'
                                : 'bg-[#FAF9F6]/50 border-[#E8E4D9]/60 opacity-50 cursor-not-allowed text-stone-400'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs text-[#8C8375] bg-[#F2EFE9] px-2 py-0.5 rounded border border-[#D0C9BC]">
                                {index + 1}
                              </span>
                              <div>
                                <h3 className="text-sm font-semibold text-[#3D332A] font-sans">{item.name}</h3>
                                <p className="text-xs font-mono text-[#8C8375]">Code: {item.item_code}</p>
                              </div>
                            </div>

                            <div className="text-right">
                              {isAvailable ? (
                                <span className="font-mono text-xs font-bold text-[#BC6C25]">₹{Number(item.price).toFixed(2)}</span>
                              ) : (
                                <span className="text-[10px] bg-[#FFF0F0] text-red-600 border border-[#FCD7D7] px-1.5 py-0.5 rounded font-mono font-semibold">
                                  Unavailable
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick-key Input Field & Validation Box */}
                    <div className="border-t border-[#E8E4D9] pt-4 mt-auto">
                      <div className="max-w-md space-y-1.5">
                        <label className="text-xs font-bold font-sans text-stone-600 uppercase tracking-wide">
                          KEYPAD SELECTION (ENTER NUMBER 1-{activeBases.length} OR CODE)
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="base-item-code-input"
                            type="text"
                            value={baseInput}
                            onChange={(e) => {
                              setBaseInput(e.target.value);
                              if (baseError) setBaseError(null);
                            }}
                            placeholder="e.g. 1 or B1"
                            className="bg-[#FAF9F6] border border-[#D0C9BC] rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-[#BC6C25] text-[#3D332A] w-44 font-semibold"
                          />
                          <button
                            id="base-apply-btn"
                            onClick={() => handleItemSelectValidate(baseInput, activeBases, 'crust base', setBaseError, setSelectedBase)}
                            className="bg-[#8C8375] hover:bg-[#766E61] active:bg-[#61574C] text-xs text-white px-4 py-2 rounded-lg font-semibold transition cursor-pointer"
                          >
                            Lock Code
                          </button>
                        </div>
                        {baseError && (
                          <p id="base-item-error" className="text-xs text-red-600 flex items-center gap-1 mt-1 font-mono">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {baseError}
                          </p>
                        )}
                        {selectedBase && !baseError && (
                          <p id="base-item-success" className="text-xs text-[#4F7A4C] flex items-center gap-1 mt-1 font-mono">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Locked Base: {selectedBase.name} (₹{Number(selectedBase.price).toFixed(2)})
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Pizza Selection */}
                {activeStep === 3 && (
                  <div id="step-3-container" className="flex-1 flex flex-col gap-5">
                    <div>
                      <h2 className="text-base font-serif font-bold text-[#3D332A]">Select Pizza Style</h2>
                      <p className="text-xs text-[#8C8375]">Choose exactly one pizza style recipe. Available items are numbered.</p>
                    </div>

                    {/* Numeric List & Grid Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 overflow-y-auto max-h-[300px] pr-1">
                      {activePizzas.map((item, index) => {
                        const isAvailable = checkPriceValid(item);
                        const isSelected = selectedPizza?.item_id === item.item_id;
                        return (
                          <div
                            key={item.item_id}
                            id={`pizza-card-${item.item_code}`}
                            onClick={() => isAvailable && handleCardClick(item)}
                            className={`p-3 rounded-lg border text-left cursor-pointer transition flex justify-between items-center ${
                              isSelected
                                ? 'bg-[#FDF8F2] border-[#BC6C25] text-[#3D332A] font-semibold shadow-xs'
                                : isAvailable
                                ? 'bg-[#FAF9F6] border-[#E8E4D9] hover:border-[#D0C9BC] text-stone-700'
                                : 'bg-[#FAF9F6]/50 border-[#E8E4D9]/60 opacity-50 cursor-not-allowed text-stone-400'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs text-[#8C8375] bg-[#F2EFE9] px-2 py-0.5 rounded border border-[#D0C9BC]">
                                {index + 1}
                              </span>
                              <div>
                                <h3 className="text-sm font-semibold text-[#3D332A] font-sans">{item.name}</h3>
                                <p className="text-xs font-mono text-[#8C8375]">Code: {item.item_code}</p>
                              </div>
                            </div>

                            <div className="text-right">
                              {isAvailable ? (
                                <span className="font-mono text-xs font-bold text-[#BC6C25]">₹{Number(item.price).toFixed(2)}</span>
                              ) : (
                                <span className="text-[10px] bg-[#FFF0F0] text-red-600 border border-[#FCD7D7] px-1.5 py-0.5 rounded font-mono font-semibold">
                                  Unavailable
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick-key Input Field & Validation Box */}
                    <div className="border-t border-[#E8E4D9] pt-4 mt-auto">
                      <div className="max-w-md space-y-1.5">
                        <label className="text-xs font-bold font-sans text-stone-600 uppercase tracking-wide">
                          KEYPAD SELECTION (ENTER NUMBER 1-{activePizzas.length} OR CODE)
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="pizza-item-code-input"
                            type="text"
                            value={pizzaInput}
                            onChange={(e) => {
                              setPizzaInput(e.target.value);
                              if (pizzaError) setPizzaError(null);
                            }}
                            placeholder="e.g. 1 or P1"
                            className="bg-[#FAF9F6] border border-[#D0C9BC] rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-[#BC6C25] text-[#3D332A] w-44 font-semibold"
                          />
                          <button
                            id="pizza-apply-btn"
                            onClick={() => handleItemSelectValidate(pizzaInput, activePizzas, 'pizza style', setPizzaError, setSelectedPizza)}
                            className="bg-[#8C8375] hover:bg-[#766E61] active:bg-[#61574C] text-xs text-white px-4 py-2 rounded-lg font-semibold transition cursor-pointer"
                          >
                            Lock Code
                          </button>
                        </div>
                        {pizzaError && (
                          <p id="pizza-item-error" className="text-xs text-red-600 flex items-center gap-1 mt-1 font-mono">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {pizzaError}
                          </p>
                        )}
                        {selectedPizza && !pizzaError && (
                          <p id="pizza-item-success" className="text-xs text-[#4F7A4C] flex items-center gap-1 mt-1 font-mono">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Locked Pizza: {selectedPizza.name} (₹{Number(selectedPizza.price).toFixed(2)})
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Topping Selection */}
                {activeStep === 4 && (
                  <div id="step-4-container" className="flex-1 flex flex-col gap-5">
                    <div>
                      <h2 className="text-base font-serif font-bold text-[#3D332A]">Select Gourmet Topping</h2>
                      <p className="text-xs text-[#8C8375]">Choose exactly one topping. Available items are numbered.</p>
                    </div>

                    {/* Numeric List & Grid Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 overflow-y-auto max-h-[300px] pr-1">
                      {activeToppings.map((item, index) => {
                        const isAvailable = checkPriceValid(item);
                        const isSelected = selectedTopping?.item_id === item.item_id;
                        return (
                          <div
                            key={item.item_id}
                            id={`topping-card-${item.item_code}`}
                            onClick={() => isAvailable && handleCardClick(item)}
                            className={`p-3 rounded-lg border text-left cursor-pointer transition flex justify-between items-center ${
                              isSelected
                                ? 'bg-[#FDF8F2] border-[#BC6C25] text-[#3D332A] font-semibold shadow-xs'
                                : isAvailable
                                ? 'bg-[#FAF9F6] border-[#E8E4D9] hover:border-[#D0C9BC] text-stone-700'
                                : 'bg-[#FAF9F6]/50 border-[#E8E4D9]/60 opacity-50 cursor-not-allowed text-stone-400'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs text-[#8C8375] bg-[#F2EFE9] px-2 py-0.5 rounded border border-[#D0C9BC]">
                                {index + 1}
                              </span>
                              <div>
                                <h3 className="text-sm font-semibold text-[#3D332A] font-sans">{item.name}</h3>
                                <p className="text-xs font-mono text-[#8C8375]">Code: {item.item_code}</p>
                              </div>
                            </div>

                            <div className="text-right">
                              {isAvailable ? (
                                <span className="font-mono text-xs font-bold text-[#BC6C25]">₹{Number(item.price).toFixed(2)}</span>
                              ) : (
                                <span className="text-[10px] bg-[#FFF0F0] text-red-600 border border-[#FCD7D7] px-1.5 py-0.5 rounded font-mono font-semibold">
                                  Unavailable
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick-key Input Field & Validation Box */}
                    <div className="border-t border-[#E8E4D9] pt-4 mt-auto">
                      <div className="max-w-md space-y-1.5">
                        <label className="text-xs font-bold font-sans text-stone-600 uppercase tracking-wide">
                          KEYPAD SELECTION (ENTER NUMBER 1-{activeToppings.length} OR CODE)
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="topping-item-code-input"
                            type="text"
                            value={toppingInput}
                            onChange={(e) => {
                              setToppingInput(e.target.value);
                              if (toppingError) setToppingError(null);
                            }}
                            placeholder="e.g. 1 or T1"
                            className="bg-[#FAF9F6] border border-[#D0C9BC] rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-[#BC6C25] text-[#3D332A] w-44 font-semibold"
                          />
                          <button
                            id="topping-apply-btn"
                            onClick={() => handleItemSelectValidate(toppingInput, activeToppings, 'gourmet topping', setToppingError, setSelectedTopping)}
                            className="bg-[#8C8375] hover:bg-[#766E61] active:bg-[#61574C] text-xs text-white px-4 py-2 rounded-lg font-semibold transition cursor-pointer"
                          >
                            Lock Code
                          </button>
                        </div>
                        {toppingError && (
                          <p id="topping-item-error" className="text-xs text-red-600 flex items-center gap-1 mt-1 font-mono">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {toppingError}
                          </p>
                        )}
                        {selectedTopping && !toppingError && (
                          <p id="topping-item-success" className="text-xs text-[#4F7A4C] flex items-center gap-1 mt-1 font-mono">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Locked Topping: {selectedTopping.name} (₹{Number(selectedTopping.price).toFixed(2)})
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Quantity Selection */}
                {activeStep === 5 && (
                  <div id="step-5-container" className="space-y-6 flex-1 flex flex-col justify-center max-w-sm mx-auto w-full py-4">
                    <div className="text-center mb-2">
                      <div className="bg-[#BC6C25]/10 text-[#BC6C25] h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3 border border-[#BC6C25]/20 animate-bounce">
                        <ShoppingBag className="h-6 w-6" />
                      </div>
                      <h2 className="text-lg font-serif font-bold text-[#3D332A]">Pizza Order Quantity</h2>
                      <p className="text-xs text-[#8C8375] mt-1">Specify number of custom pizzas to bake. Limit: 1 to 10.</p>
                      <div className="mt-3 bg-[#EAF2E8] text-[#4F7A4C] border border-[#C5DCBF]/60 text-[10px] uppercase font-sans font-semibold px-3 py-1.5 rounded-lg inline-block shadow-xs">
                        🎁 Get 10% volume discount for 5 or more pizzas!
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Interactive click counter */}
                      <div className="flex items-center justify-between bg-[#FAF9F6] border border-[#E8E4D9] p-4 rounded-xl shadow-xs">
                        <button
                          id="qty-decrement-btn"
                          disabled={Number(quantityInput) <= 1}
                          onClick={() => {
                            const current = Math.max(1, Math.min(10, Number(quantityInput) - 1));
                            setQuantityInput(String(current));
                            handleQuantityValidate(String(current));
                          }}
                          className="h-10 w-10 rounded-lg bg-[#F2EFE9] hover:bg-[#E8E4D9] active:bg-[#D0C9BC] border border-[#D0C9BC] flex items-center justify-center text-[#3D332A] font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                        >
                          <Minus className="h-4 w-4" />
                        </button>

                        <div className="text-center">
                          <span id="qty-text-indicator" className="text-3xl font-mono font-bold text-[#BC6C25]">
                            {Number(quantityInput) >= 1 && Number(quantityInput) <= 10 && Number.isInteger(Number(quantityInput)) ? quantityInput : '—'}
                          </span>
                          <p className="text-[9px] text-[#8C8375] font-sans font-semibold mt-0.5">CURRENT COUNT</p>
                        </div>

                        <button
                          id="qty-increment-btn"
                          disabled={Number(quantityInput) >= 10}
                          onClick={() => {
                            const current = Math.max(1, Math.min(10, Number(quantityInput) + 1));
                            setQuantityInput(String(current));
                            handleQuantityValidate(String(current));
                          }}
                          className="h-10 w-10 rounded-lg bg-[#F2EFE9] hover:bg-[#E8E4D9] active:bg-[#D0C9BC] border border-[#D0C9BC] flex items-center justify-center text-[#3D332A] font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Manual/Command Keyboard Input field */}
                      <div className="space-y-1.5 font-sans">
                        <label className="text-xs font-semibold text-stone-600 font-sans flex justify-between">
                          <span>MANUAL ENTRY</span>
                          <span className="text-[10px] text-[#8C8375]">WHOLE NUMBER (1-10)</span>
                        </label>
                        <input
                          id="quantity-manual-input"
                          type="text"
                          value={quantityInput}
                          onChange={(e) => {
                            setQuantityInput(e.target.value);
                            handleQuantityValidate(e.target.value);
                          }}
                          className={`w-full bg-[#FAF9F6] border rounded-lg px-4 py-2.5 text-sm text-center font-mono outline-none transition focus:border-[#BC6C25] text-[#3D332A] font-semibold ${
                            quantityError ? 'border-red-500 focus:border-red-500' : 'border-[#D0C9BC]'
                          }`}
                        />
                        {quantityError && (
                          <p id="quantity-item-error" className="text-xs text-red-600 flex items-center justify-center gap-1 mt-1 font-mono">
                            <AlertTriangle className="h-3 w-3 shrink-0" /> {quantityError}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 6: Review & Payment Selection */}
                {activeStep === 6 && (
                  <div id="step-6-container" className="flex-1 flex flex-col gap-5">
                    <div>
                      <h2 className="text-base font-serif font-bold text-[#3D332A]">Payment Method & Checkout</h2>
                      <p className="text-xs text-[#8C8375]">Review bill subtotals, apply volume discount, and select exactly one payment mode.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
                      {/* Left Block: Payment choices */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold font-sans text-stone-600 uppercase tracking-wider">SELECT PAYMENT MODE</h3>

                        <div className="space-y-2.5">
                          {[
                            { id: 'Cash', label: 'Cash Payment', sub: 'Receive physical notes at counter' },
                            { id: 'Card', label: 'Credit / Debit Card', sub: 'Process via terminal swipe machine' },
                            { id: 'UPI', label: 'Unified Payments (UPI)', sub: 'Dynamic QR Code generation' }
                          ].map((pm) => {
                            const isSelected = paymentMode === pm.id;
                            return (
                              <div
                                key={pm.id}
                                id={`payment-card-${pm.id}`}
                                onClick={() => {
                                  setPaymentMode(pm.id as any);
                                  setPaymentError(null);
                                }}
                                className={`p-4 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-[#FDF8F2] border-[#BC6C25] text-[#3D332A] font-semibold shadow-xs'
                                    : 'bg-[#FAF9F6] border-[#E8E4D9] hover:border-[#D0C9BC] text-stone-700'
                                }`}
                              >
                                <div>
                                  <h4 className="text-sm font-semibold">{pm.label}</h4>
                                  <p className="text-[11px] text-[#8C8375] font-mono">{pm.sub}</p>
                                </div>
                                <span
                                  className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center ${
                                    isSelected ? 'border-[#BC6C25] bg-[#BC6C25] text-white' : 'border-[#D0C9BC]'
                                  }`}
                                >
                                  {isSelected && <span className="h-2 w-2 rounded-full bg-white"></span>}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {paymentError && (
                          <p id="payment-mode-error" className="text-sm text-red-600 flex items-center gap-1 font-mono mt-2">
                            <AlertTriangle className="h-4 w-4 shrink-0" /> {paymentError}
                          </p>
                        )}
                      </div>

                      {/* Right Block: Bill calculation info */}
                      <div className="bg-[#FAF9F6] border border-[#E8E4D9] rounded-xl p-5 space-y-4 shadow-xs">
                        <h3 className="text-xs font-bold font-sans text-stone-600 uppercase tracking-wider">TAX & AUDIT TRAIL</h3>
                        <div className="space-y-2.5 text-xs font-mono text-stone-700">
                          <div className="flex justify-between">
                            <span>Base Price Sum:</span>
                            <span className="font-semibold text-stone-900">₹{((getSafePrice(selectedBase) + getSafePrice(selectedPizza) + getSafePrice(selectedTopping)) * quantity).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-[#4F7A4C] font-semibold">
                            <span>Discount Amount (Post-Disc):</span>
                            <span>-₹{discountVal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tax Base Amount:</span>
                            <span className="font-semibold text-stone-900">₹{(subtotalVal - discountVal).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>GST (Indian Central/State 18%):</span>
                            <span className="font-semibold text-stone-900">₹{gstVal.toFixed(2)}</span>
                          </div>
                          <div className="border-t border-[#D0C9BC] pt-2 flex justify-between text-sm font-bold text-[#BC6C25]">
                            <span>Grand Audited Total:</span>
                            <span>₹{totalVal.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="bg-[#FCFAF2] rounded-lg p-3 text-[10px] text-[#8C8375] space-y-1 font-sans border border-[#E8E4D9] shadow-inner">
                          <p className="font-semibold text-[#3D332A]">GST Compliance Checklist:</p>
                          <p>• GST 18% applied on post-discount subtotal.</p>
                          <p>• Quantity limit check verified (1-10).</p>
                          <p>• Live ticket sync backup active.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons (Bottom of active step workspace) */}
                {activeStep < 7 && (
                  <div id="workspace-controls" className="border-t border-[#E8E4D9] pt-4 mt-6 flex justify-between items-center gap-4">
                    <button
                      id="pos-prev-btn"
                      disabled={activeStep === 1}
                      onClick={handlePrevStep}
                      className="bg-[#FAF9F6] hover:bg-[#F2EFE9] border border-[#D0C9BC] text-stone-700 hover:text-stone-950 px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </button>

                    {activeStep < 6 ? (
                      <button
                        id="pos-next-btn"
                        onClick={handleNextStep}
                        className="bg-[#BC6C25] hover:bg-[#A3591B] text-white font-bold px-5 py-2 rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        Next Step
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        id="pos-submit-order-btn"
                        disabled={submitting}
                        onClick={handlePlaceOrder}
                        className="bg-[#606C38] hover:bg-[#4C562C] disabled:bg-[#FAF9F6] disabled:text-stone-400 text-white font-bold px-6 py-2.5 rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer border border-[#606C38]"
                      >
                        {submitting ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Registering Order...
                          </>
                        ) : (
                          <>
                            <Receipt className="h-4 w-4" />
                            Place Order (₹{totalVal.toFixed(2)})
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Step 7: Order Success Screen */}
                {activeStep === 7 && activeOrder && (
                  <div id="success-screen-container" className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto py-6">
                    <div className="bg-[#EAF2E8] text-[#4F7A4C] h-14 w-14 rounded-full flex items-center justify-center mb-4 border border-[#C5DCBF] shadow-xs">
                      <CheckCircle2 className="h-8 w-8 animate-pulse" />
                    </div>

                    <h2 id="success-title" className="text-xl font-serif font-bold text-[#3D332A] mb-1">
                      Order Registered Successfully!
                    </h2>
                    <p id="success-order-num" className="text-sm font-mono text-[#BC6C25] font-semibold mb-4">
                      Ticket Reference: {activeOrder.order_number}
                    </p>

                    {/* Receipt print-out display */}
                    <div className="w-full mb-6">
                      <LiveReceipt
                        customerName={activeOrder.customer_name}
                        customerPhone={activeOrder.customer_phone}
                        selectedBase={menuItems.find(item => item.item_id === activeOrder.base_item_id) || null}
                        selectedPizza={menuItems.find(item => item.item_id === activeOrder.pizza_item_id) || null}
                        selectedTopping={menuItems.find(item => item.item_id === activeOrder.topping_item_id) || null}
                        quantity={activeOrder.quantity}
                        paymentMode={activeOrder.payment_mode}
                      />
                    </div>

                    <div className="flex gap-3 w-full">
                      <button
                        id="reset-terminal-btn"
                        onClick={handleResetStation}
                        className="flex-1 bg-[#BC6C25] hover:bg-[#A3591B] text-white font-bold px-4 py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Next Order
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Active Order History Board (Bottom of screen) */}
          <ActiveOrderHistory orders={orderHistory} />
        </section>

        {/* Right Side Pane: live calculation receipt & the validation labs */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          {/* Active Order Live Receipt */}
          <div className="sticky top-24 space-y-6">
            <div>
              <h3 className="text-xs font-bold font-sans text-stone-600 uppercase tracking-wider mb-2">
                Live Ticket Monitor
              </h3>
              <LiveReceipt
                customerName={customerName}
                customerPhone={customerPhone}
                selectedBase={selectedBase}
                selectedPizza={selectedPizza}
                selectedTopping={selectedTopping}
                quantity={quantity}
                paymentMode={paymentMode}
              />
            </div>

            {/* Edge Case Lab helper (extremely valuable for debugging and proving the requirements) */}
            <EdgeCaseLab onTrigger={handleTriggerCase} activeCase={activeCaseId} />
          </div>
        </section>
      </main>
      )}
    </div>
  );
}
