import { createClient } from '@supabase/supabase-js';
import { MenuItem, Order } from './types';

// Read keys from environment
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Determine if we should run in live Supabase mode
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

let supabaseInstance: any = null;

export function getSupabase() {
  if (!isSupabaseConfigured) return null;
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
    }
  }
  return supabaseInstance;
}

// Exact list of menu items from user prompt
export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  // Bases
  { item_id: 'b1', item_code: 'B1', category: 'base', name: 'Thin Crust', price: 149, is_active: true },
  { item_id: 'b2', item_code: 'B2', category: 'base', name: 'Thick Crust', price: 179, is_active: true },
  { item_id: 'b3', item_code: 'B3', category: 'base', name: 'Cheese Burst', price: 229, is_active: true },
  { item_id: 'b4', item_code: 'B4', category: 'base', name: 'Whole Wheat', price: 159, is_active: true },
  { item_id: 'b5', item_code: 'B5', category: 'base', name: 'Multigrain', price: 169, is_active: true },
  // Base edge case: Invalid price (not a number) to demonstrate edge case #8
  { item_id: 'b6', item_code: 'B6', category: 'base', name: 'Gluten-Free Extra (Demo Price Error)', price: 'NOT_A_NUMBER' as any, is_active: true },

  // Pizzas
  { item_id: 'p1', item_code: 'P1', category: 'pizza', name: 'Margherita', price: 299, is_active: true },
  { item_id: 'p2', item_code: 'P2', category: 'pizza', name: 'Chicago Deep Dish', price: 349, is_active: true },
  { item_id: 'p3', item_code: 'P3', category: 'pizza', name: 'Greek Mediterranean', price: 329, is_active: true },
  { item_id: 'p4', item_code: 'P4', category: 'pizza', name: 'California Veggie', price: 339, is_active: true },
  { item_id: 'p5', item_code: 'P5', category: 'pizza', name: 'Farm House', price: 319, is_active: true },
  { item_id: 'p6', item_code: 'P6', category: 'pizza', name: 'Pepperoni Classic', price: 369, is_active: true },
  { item_id: 'p7', item_code: 'P7', category: 'pizza', name: 'BBQ Chicken', price: 379, is_active: true },
  { item_id: 'p8', item_code: 'P8', category: 'pizza', name: 'Paneer Tikka', price: 349, is_active: true },
  // Pizza edge case: Null price to demonstrate edgecase #8
  { item_id: 'p9', item_code: 'P9', category: 'pizza', name: 'Specialty Truffle (Demo Null Price)', price: null, is_active: true },

  // Toppings
  { item_id: 't1', item_code: 'T1', category: 'topping', name: 'Black Olives', price: 49, is_active: true },
  { item_id: 't2', item_code: 'T2', category: 'topping', name: 'Extra Cheese', price: 69, is_active: true },
  { item_id: 't3', item_code: 'T3', category: 'topping', name: 'Button Mushrooms', price: 49, is_active: true },
  { item_id: 't4', item_code: 'T4', category: 'topping', name: 'Green Peppers', price: 39, is_active: true },
  { item_id: 't5', item_code: 'T5', category: 'topping', name: 'Jalapenos', price: 39, is_active: true },
  { item_id: 't6', item_code: 'T6', category: 'topping', name: 'Sun-Dried Tomatoes', price: 59, is_active: true },
  { item_id: 't7', item_code: 'T7', category: 'topping', name: 'Caramelised Onions', price: 49, is_active: true },
  { item_id: 't8', item_code: 'T8', category: 'topping', name: 'Sweet Corn', price: 39, is_active: true },
  { item_id: 't9', item_code: 'T9', category: 'topping', name: 'Roasted Garlic', price: 49, is_active: true },
  { item_id: 't10', item_code: 'T10', category: 'topping', name: 'Peri-Peri Drizzle', price: 59, is_active: true },
  // Topping edge case: Undefined price to demonstrate edge case #8
  { item_id: 't11', item_code: 'T11', category: 'topping', name: 'Gold Flakes (Demo Missing Price)', price: undefined, is_active: true },
  // Deactivated item (should not show up in the active menu list)
  { item_id: 't12', item_code: 'T12', category: 'topping', name: 'Anchovies (Deactivated)', price: 89, is_active: false },
];

// Local state for orders (persists in localStorage)
const LOCAL_ORDERS_KEY = 'pizzaflow_orders';
const LOCAL_MENU_KEY = 'pizzaflow_menu';

export function getLocalOrders(): Order[] {
  try {
    const data = localStorage.getItem(LOCAL_ORDERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading orders from localStorage:', e);
    return [];
  }
}

export function saveLocalOrder(order: Order) {
  try {
    const orders = getLocalOrders();
    orders.unshift(order); // Newest first
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error('Error saving order to localStorage:', e);
  }
}

// Fetch menu items from Supabase or fallback to local seed
export async function fetchMenuItems(): Promise<MenuItem[]> {
  const supabase = getSupabase();
  if (!supabase) {
    // Return cached/local items
    return getLocalMenuItems();
  }

  try {
    // Fetch live menu items
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.warn('Supabase query error, falling back to local menu items:', error);
      return getLocalMenuItems();
    }

    if (!data || data.length === 0) {
      // If table is empty, seed it with defaults
      console.log('menu_items table is empty, seeding with default list');
      await seedSupabaseMenu(supabase);
      return getLocalMenuItems();
    }

    return data as MenuItem[];
  } catch (e) {
    console.error('Supabase fetch failed, falling back to local menu:', e);
    return getLocalMenuItems();
  }
}

function getLocalMenuItems(): MenuItem[] {
  try {
    const stored = localStorage.getItem(LOCAL_MENU_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Seed localStorage with default items
    localStorage.setItem(LOCAL_MENU_KEY, JSON.stringify(DEFAULT_MENU_ITEMS));
    return DEFAULT_MENU_ITEMS;
  } catch (e) {
    return DEFAULT_MENU_ITEMS;
  }
}

async function seedSupabaseMenu(supabase: any) {
  try {
    const cleanItems = DEFAULT_MENU_ITEMS.map(({ item_id, ...rest }) => {
      let price = rest.price;
      if (typeof price !== 'number' || isNaN(price)) {
        price = 0; // set to a valid numeric 0
      }
      return { ...rest, price };
    });
    const { error } = await supabase
      .from('menu_items')
      .insert(cleanItems);
    if (error) {
      console.warn('Could not seed menu_items to Supabase due to RLS or other database policy:', error);
    }
  } catch (e) {
    console.warn('Failed to seed Supabase table:', e);
  }
}

// Save order to Supabase or fallback to offline
export async function createOrder(order: Order): Promise<{ success: boolean; sync_status: 'synced' | 'local'; error?: string }> {
  // Always save locally first to guarantee safety and no freezes
  saveLocalOrder(order);

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, sync_status: 'local', error: 'Database connection is unavailable.' };
  }

  try {
    console.log('Attempting to insert order:', {
      customer_phone: order.customer_phone,
      quantity: order.quantity,
      subtotal: order.subtotal,
      discount_amount: order.discount,
      gst_amount: order.gst,
      final_total: order.total,
      order_time: order.created_at,
    });

    // Step 1 — must complete successfully first
    const { error: customerError } = await supabase
      .from('customers')
      .upsert(
        { phone: order.customer_phone.trim(), name: order.customer_name.trim() },
        { onConflict: 'phone' }
      );
    if (customerError) {
      throw new Error(`Could not save customer: ${customerError.message}`);
    }

    // Step 2 — only after step 1 succeeds
    const { data: orderRow, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          customer_phone: order.customer_phone.trim(),
          quantity: order.quantity,
          subtotal: order.subtotal,
          discount_amount: order.discount,
          gst_amount: order.gst,
          final_total: order.total,
          order_time: order.created_at || new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (orderError) {
      throw new Error(`Could not save order: ${orderError.message}`);
    }
    
    console.log('Insert result:', orderRow);
    const newOrderId = orderRow.order_id;

    // Step 3 — order_items, using orderId
    const orderItems = [];
    if (order.base_item_id) {
      orderItems.push({
        order_id: newOrderId,
        item_id: order.base_item_id,
        item_name: order.base_name,
        item_type: 'base',
        unit_price: order.base_price ?? 0
      });
    }
    if (order.pizza_item_id) {
      orderItems.push({
        order_id: newOrderId,
        item_id: order.pizza_item_id,
        item_name: order.pizza_name,
        item_type: 'pizza',
        unit_price: order.pizza_price ?? 0
      });
    }
    if (order.topping_item_id) {
      orderItems.push({
        order_id: newOrderId,
        item_id: order.topping_item_id,
        item_name: order.topping_name,
        item_type: 'topping',
        unit_price: order.topping_price ?? 0
      });
    }

    if (orderItems.length > 0) {
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      if (itemsError) {
        throw new Error(`Could not save order items: ${itemsError.message}`);
      }
    }

    // Step 4 — payments, using orderId
    if (order.payment_mode) {
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            order_id: newOrderId,
            payment_mode: order.payment_mode
          }
        ]);
      if (paymentError) {
        throw new Error(`Could not save payment: ${paymentError.message}`);
      }
    }

    // Step 5 — order_status, using orderId
    const { error: statusError } = await supabase
      .from('order_status')
      .insert([
        {
          order_id: newOrderId,
          status: 'Placed',
          updated_at: new Date().toISOString()
        }
      ]);
    if (statusError) {
      throw new Error(`Could not save order status: ${statusError.message}`);
    }

    // Step 6 — inventory_transactions + inventory update, using orderId
    let { data: invItems, error: fetchError } = await supabase
      .from('inventory')
      .select('*');

    if (fetchError) {
      throw new Error(`Could not fetch inventory: ${fetchError.message}`);
    }

    // If table is empty, seed it first
    if (!invItems || invItems.length === 0) {
      const DEFAULT_INVENTORY_SEEDS = [
        { ingredient_name: "Mozzarella Cheese", current_stock: 14.5, unit: "kg", reorder_threshold: 20.0, updated_at: new Date().toISOString() },
        { ingredient_name: "Thin Crust Pre-Bakes", current_stock: 45, unit: "pcs", reorder_threshold: 30.0, updated_at: new Date().toISOString() },
        { ingredient_name: "Cheese Burst Pre-Bakes", current_stock: 8, unit: "pcs", reorder_threshold: 15.0, updated_at: new Date().toISOString() },
        { ingredient_name: "Whole Wheat Pre-Bakes", current_stock: 32, unit: "pcs", reorder_threshold: 20.0, updated_at: new Date().toISOString() },
        { ingredient_name: "San Marzano Pizza Sauce", current_stock: 25.0, unit: "litres", reorder_threshold: 10.0, updated_at: new Date().toISOString() },
        { ingredient_name: "Pepperoni Slices", current_stock: 3.2, unit: "kg", reorder_threshold: 5.0, updated_at: new Date().toISOString() },
        { ingredient_name: "Paneer Tikka Cubes", current_stock: 12.0, unit: "kg", reorder_threshold: 8.0, updated_at: new Date().toISOString() },
        { ingredient_name: "Black Olives", current_stock: 4.8, unit: "kg", reorder_threshold: 5.0, updated_at: new Date().toISOString() },
        { ingredient_name: "Sweet Corn", current_stock: 15.0, unit: "kg", reorder_threshold: 10.0, updated_at: new Date().toISOString() },
        { ingredient_name: "Button Mushrooms", current_stock: 2.1, unit: "kg", reorder_threshold: 4.0, updated_at: new Date().toISOString() }
      ];
      
      const { data: seeded, error: seedError } = await supabase
        .from('inventory')
        .insert(DEFAULT_INVENTORY_SEEDS)
        .select();
        
      if (seedError) {
        throw new Error(`Could not seed inventory: ${seedError.message}`);
      }
      invItems = seeded;
    }

    if (invItems && invItems.length > 0) {
      const qty = order.quantity || 1;
      const updates: { ingredient_name: string; deduction: number }[] = [];

      // 1. Pre-bake base deduction
      if (order.base_name) {
        if (order.base_name.includes('Thin')) {
          updates.push({ ingredient_name: "Thin Crust Pre-Bakes", deduction: 1 * qty });
        } else if (order.base_name.includes('Cheese Burst')) {
          updates.push({ ingredient_name: "Cheese Burst Pre-Bakes", deduction: 1 * qty });
        } else if (order.base_name.includes('Whole Wheat')) {
          updates.push({ ingredient_name: "Whole Wheat Pre-Bakes", deduction: 1 * qty });
        } else {
          updates.push({ ingredient_name: "Thin Crust Pre-Bakes", deduction: 1 * qty });
        }
      }

      // 2. Standard Sauce & Cheese usage
      updates.push({ ingredient_name: "San Marzano Pizza Sauce", deduction: 0.15 * qty });
      updates.push({ ingredient_name: "Mozzarella Cheese", deduction: 0.10 * qty });

      // 3. Toppings
      const itemNamesString = `${order.pizza_name} ${order.topping_name}`.toLowerCase();
      if (itemNamesString.includes('pepperoni')) {
        updates.push({ ingredient_name: "Pepperoni Slices", deduction: 0.05 * qty });
      }
      if (itemNamesString.includes('paneer')) {
        updates.push({ ingredient_name: "Paneer Tikka Cubes", deduction: 0.05 * qty });
      }
      if (itemNamesString.includes('olive')) {
        updates.push({ ingredient_name: "Black Olives", deduction: 0.02 * qty });
      }
      if (itemNamesString.includes('corn')) {
        updates.push({ ingredient_name: "Sweet Corn", deduction: 0.03 * qty });
      }
      if (itemNamesString.includes('mushroom')) {
        updates.push({ ingredient_name: "Button Mushrooms", deduction: 0.03 * qty });
      }

      for (const update of updates) {
        const invItem = invItems.find(item => item.ingredient_name.toLowerCase() === update.ingredient_name.toLowerCase());
        if (invItem) {
          const newStock = Math.max(0, Number(invItem.current_stock) - update.deduction);
          
          const { error: updateError } = await supabase
            .from('inventory')
            .update({ current_stock: newStock, updated_at: new Date().toISOString() })
            .eq('inventory_id', invItem.inventory_id);

          if (updateError) {
            throw new Error(`Could not update stock for ${update.ingredient_name}: ${updateError.message}`);
          }

          const { error: txError } = await supabase
            .from('inventory_transactions')
            .insert([
              {
                order_id: newOrderId,
                inventory_id: invItem.inventory_id,
                transaction_time: new Date().toISOString()
              }
            ]);
          if (txError) {
            throw new Error(`Could not log transaction for ${update.ingredient_name}: ${txError.message}`);
          }
        }
      }
    }

    // Update local storage sync status for this order
    const localOrders = getLocalOrders();
    const updated = localOrders.map(o => o.id === order.id ? { ...o, sync_status: 'synced' as const } : o);
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updated));

    return { success: true, sync_status: 'synced' };
  } catch (e: any) {
    console.error('Network exception saving order to Supabase:', e);
    return { success: false, sync_status: 'local', error: e.message || 'Could not save order. Please try again.' };
  }
}
