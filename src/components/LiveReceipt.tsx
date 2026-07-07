import React from 'react';
import { MenuItem } from '../types';

interface LiveReceiptProps {
  customerName: string;
  customerPhone: string;
  selectedBase: MenuItem | null;
  selectedPizza: MenuItem | null;
  selectedTopping: MenuItem | null;
  quantity: number;
  paymentMode: 'Cash' | 'Card' | 'UPI' | null;
}

export const LiveReceipt: React.FC<LiveReceiptProps> = ({
  customerName,
  customerPhone,
  selectedBase,
  selectedPizza,
  selectedTopping,
  quantity,
  paymentMode,
}) => {
  // Safe item extraction (protects from NaN price propagation)
  const getSafePrice = (item: MenuItem | null): number => {
    if (!item) return 0;
    const price = Number(item.price);
    return isNaN(price) ? 0 : price;
  };

  const basePrice = getSafePrice(selectedBase);
  const pizzaPrice = getSafePrice(selectedPizza);
  const toppingPrice = getSafePrice(selectedTopping);

  const pricePerPizza = basePrice + pizzaPrice + toppingPrice;
  const subtotal = pricePerPizza * quantity;

  // 10% discount when quantity is 5 or more
  const discountRate = quantity >= 5 ? 0.1 : 0;
  const discount = subtotal * discountRate;

  // Post-discount total
  const postDiscountTotal = subtotal - discount;

  // GST 18% on post-discount total
  const gst = postDiscountTotal * 0.18;

  // Final Total
  const finalTotal = postDiscountTotal + gst;

  return (
    <div id="live-receipt-container" className="bg-[#FCFAF2] border-2 border-dashed border-[#D0C9BC] rounded-xl p-5 shadow-sm text-[#4E4338] font-mono relative overflow-hidden">
      {/* Receipt Top Ribbon Accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#BC6C25]"></div>

      <div className="text-center mb-4">
        <h3 id="receipt-shop-name" className="text-2xl font-serif font-bold text-[#3D332A] tracking-wide">SliceMatic</h3>
        <p id="receipt-shop-subtitle" className="text-[10px] text-[#8C8375] uppercase tracking-wider font-sans font-semibold">Walk-in Counter Ticket</p>
      </div>

      {/* Customer Header */}
      <div id="receipt-customer-section" className="border-y border-dashed border-[#D0C9BC] py-2.5 mb-4 text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-[#8C8375]">CUSTOMER:</span>
          <span id="receipt-customer-name" className="font-semibold text-[#3D332A] truncate max-w-[160px]">
            {customerName.trim() ? customerName : '(Pending intake...)'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#8C8375]">PHONE:</span>
          <span id="receipt-customer-phone" className="text-[#4E4338]">
            {customerPhone ? customerPhone : '(Pending intake...)'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#8C8375]">STATION:</span>
          <span className="text-[#BC6C25] font-bold font-sans">TABLET-01</span>
        </div>
      </div>

      {/* Itemized List */}
      <div id="receipt-items-section" className="space-y-2 text-xs mb-4">
        <div className="text-[10px] text-[#8C8375] font-semibold border-b border-[#E8E4D9] pb-1 flex justify-between font-sans">
          <span>ITEMIZED SELECTION</span>
          <span>PRICE (₹)</span>
        </div>

        {/* Base */}
        <div id="receipt-item-base" className="flex justify-between items-start gap-4">
          <div className="truncate">
            <span className="text-[#BC6C25] font-semibold mr-1">[CRUST]</span>
            <span className="text-[#3D332A] font-sans font-medium">{selectedBase ? selectedBase.name : 'Not selected'}</span>
          </div>
          <span className="text-right whitespace-nowrap font-semibold">
            {selectedBase ? `₹${basePrice.toFixed(2)}` : '—'}
          </span>
        </div>

        {/* Pizza */}
        <div id="receipt-item-pizza" className="flex justify-between items-start gap-4">
          <div className="truncate">
            <span className="text-[#BC6C25] font-semibold mr-1">[PIZZA]</span>
            <span className="text-[#3D332A] font-sans font-medium">{selectedPizza ? selectedPizza.name : 'Not selected'}</span>
          </div>
          <span className="text-right whitespace-nowrap font-semibold">
            {selectedPizza ? `₹${pizzaPrice.toFixed(2)}` : '—'}
          </span>
        </div>

        {/* Topping */}
        <div id="receipt-item-topping" className="flex justify-between items-start gap-4">
          <div className="truncate">
            <span className="text-[#BC6C25] font-semibold mr-1">[TOPPING]</span>
            <span className="text-[#3D332A] font-sans font-medium">{selectedTopping ? selectedTopping.name : 'Not selected'}</span>
          </div>
          <span className="text-right whitespace-nowrap font-semibold">
            {selectedTopping ? `₹${toppingPrice.toFixed(2)}` : '—'}
          </span>
        </div>
      </div>

      {/* Calculations section */}
      <div id="receipt-calc-section" className="border-t border-[#E8E4D9] pt-3 space-y-1.5 text-xs">
        <div id="receipt-calc-price-per-pizza" className="flex justify-between text-[#61574C]">
          <span>Price per Pizza:</span>
          <span>₹{pricePerPizza.toFixed(2)}</span>
        </div>

        <div id="receipt-calc-quantity" className="flex justify-between text-[#61574C] font-semibold">
          <span>Quantity:</span>
          <span className="text-[#3D332A]">x {quantity}</span>
        </div>

        <div id="receipt-calc-subtotal" className="flex justify-between border-t border-[#E8E4D9] pt-1.5 text-[#3D332A] font-semibold">
          <span>Subtotal:</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>

        {/* Discount section */}
        {discountRate > 0 ? (
          <div id="receipt-calc-discount" className="flex justify-between text-[#606C38] font-semibold font-sans">
            <span>Volume Discount (10%):</span>
            <span>-₹{discount.toFixed(2)}</span>
          </div>
        ) : quantity > 0 ? (
          <div className="text-[10px] text-[#8C8375] text-right italic font-sans">
            *Add {5 - quantity} more for 10% volume discount
          </div>
        ) : null}

        {/* GST */}
        <div id="receipt-calc-gst" className="flex justify-between text-[#61574C]">
          <span>GST (18% on post-disc):</span>
          <span>₹{gst.toFixed(2)}</span>
        </div>

        {/* Total */}
        <div id="receipt-calc-total" className="flex justify-between border-t-2 border-dashed border-[#D0C9BC] pt-2.5 mt-1 text-base font-bold text-[#BC6C25]">
          <span>GRAND TOTAL:</span>
          <span id="receipt-grand-total">₹{finalTotal.toFixed(2)}</span>
        </div>

        {/* Payment mode */}
        <div id="receipt-calc-payment" className="flex justify-between text-xs pt-2 text-[#61574C] font-sans">
          <span>Payment Mode:</span>
          <span id="receipt-payment-mode-label" className="font-semibold text-[#3D332A]">
            {paymentMode ? paymentMode.toUpperCase() : 'PENDING'}
          </span>
        </div>
      </div>

      {/* Watermark/Footer */}
      <div className="mt-5 text-center text-[10px] text-[#8C8375] uppercase border-t border-[#E8E4D9] pt-2 font-mono">
        Thank you for ordering at SliceMatic!
      </div>
    </div>
  );
};
