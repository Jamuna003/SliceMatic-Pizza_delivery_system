export interface MenuItem {
  item_id: string;
  item_code: string;
  category: 'base' | 'pizza' | 'topping';
  name: string;
  price: number | null | undefined;
  is_active: boolean;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  base_item_id: string;
  base_name: string;
  base_price: number;
  pizza_item_id: string;
  pizza_name: string;
  pizza_price: number;
  topping_item_id: string;
  topping_name: string;
  topping_price: number;
  quantity: number;
  subtotal: number;
  discount: number;
  gst: number;
  total: number;
  payment_mode: 'Cash' | 'Card' | 'UPI';
  created_at: string;
  sync_status: 'synced' | 'local';
}
