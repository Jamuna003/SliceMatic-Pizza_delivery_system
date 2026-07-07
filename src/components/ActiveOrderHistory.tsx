import React from 'react';
import { Order } from '../types';

interface ActiveOrderHistoryProps {
  orders: Order[];
  onSelectOrder?: (order: Order) => void;
}

export const ActiveOrderHistory: React.FC<ActiveOrderHistoryProps> = ({ orders, onSelectOrder }) => {
  return (
    <div id="order-history-panel" className="bg-white border border-[#E8E4D9] rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-4 border-b border-[#E8E4D9] pb-2">
        <h3 className="text-base font-display font-semibold text-[#3D332A]">Recent Walk-in Orders</h3>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#FAF9F6] text-[#8C8375] border border-[#E8E4D9]">
          Total: {orders.length}
        </span>
      </div>

      {orders.length === 0 ? (
        <div id="order-history-empty" className="text-center py-8 text-[#8C8375] text-sm">
          No orders registered in this session. Start by compiling an intake above!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-[#8C8375] border-b border-[#E8E4D9] pb-1 uppercase text-[10px]">
                <th className="py-2 font-semibold">No.</th>
                <th className="py-2 font-semibold">Customer</th>
                <th className="py-2 font-semibold">Item Detail</th>
                <th className="py-2 text-center font-semibold">Qty</th>
                <th className="py-2 text-right font-semibold">Total (₹)</th>
                <th className="py-2 text-center font-semibold">Pay</th>
                <th className="py-2 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4D9]">
              {orders.map((o: any, index) => {
                const orderId = o.id || o.order_id || `local-index-${index}`;
                const orderNum = o.order_number || `SM-${String(orderId).slice(-3).toUpperCase()}`;
                const custName = o.customer_name || 'Walk-In Customer';
                const custPhone = o.customer_phone || 'No Phone';
                const pizzaName = o.pizza_name || 'Custom PizzaStyle';
                const baseName = o.base_name || 'Original Crust';
                const toppingName = o.topping_name || 'Gourmet Topping';
                const qty = o.quantity || 1;
                const totalAmt = Number(o.total !== undefined && o.total !== null ? o.total : (o.final_total !== undefined && o.final_total !== null ? o.final_total : 0));
                const payMode = o.payment_mode || 'Cash';
                const syncStatus = o.sync_status || 'synced';

                return (
                  <tr
                    key={orderId}
                    id={`order-row-${orderId}`}
                    className="hover:bg-[#FAF9F6] cursor-pointer transition"
                    onClick={() => onSelectOrder && onSelectOrder(o)}
                  >
                    <td className="py-2.5 font-bold text-[#BC6C25]">{orderNum}</td>
                    <td className="py-2.5">
                      <div className="font-semibold text-[#3D332A] truncate max-w-[100px] font-sans">{custName}</div>
                      <div className="text-[10px] text-[#8C8375]">{custPhone}</div>
                    </td>
                    <td className="py-2.5 text-[#4E4338]">
                      <div className="truncate max-w-[140px] font-sans font-medium" title={`${baseName} + ${pizzaName} + ${toppingName}`}>
                        {pizzaName}
                      </div>
                      <div className="text-[9px] text-[#8C8375] truncate max-w-[140px] font-sans">
                        {baseName} • {toppingName}
                      </div>
                    </td>
                    <td className="py-2.5 text-center text-[#3D332A] font-semibold">{qty}</td>
                    <td className="py-2.5 text-right text-[#3D332A] font-bold">₹{totalAmt.toFixed(2)}</td>
                    <td className="py-2.5 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#FAF9F6] text-[#61574C] border border-[#E8E4D9] uppercase font-sans font-semibold">
                        {payMode}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <span
                        id={`order-sync-status-${orderId}`}
                        className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-sans font-medium ${
                          syncStatus === 'synced'
                            ? 'bg-[#EAF2E8] text-[#4F7A4C] border border-[#C5DCBF]'
                            : 'bg-[#FAF0E6] text-[#A66C44] border border-[#EED7C5]'
                        }`}
                      >
                        <span className={`h-1 w-1 rounded-full ${syncStatus === 'synced' ? 'bg-[#4F7A4C]' : 'bg-[#A66C44]'}`}></span>
                        {syncStatus === 'synced' ? 'Live' : 'Offline'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
