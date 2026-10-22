import Decimal from 'decimal.js';
import { ValidationError } from './errors';

// Configure Decimal.js precision and rounding mode
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export interface CalculatedOrderTotals {
  calculatedLineTotals: string[];
  subtotal: string;
  taxAmount: string;
  shippingAmount: string;
  discountAmount: string;
  totalAmount: string;
}

export interface InputItemForPricing {
  quantity: number | string;
  unitPrice: number | string;
}

export function formatMoney(value: Decimal.Value): string {
  return new Decimal(value).toFixed(2);
}

export function formatQuantity(value: Decimal.Value): string {
  return new Decimal(value).toFixed(3);
}

export function calculateLineTotal(quantity: Decimal.Value, unitPrice: Decimal.Value): string {
  const qty = new Decimal(quantity);
  const price = new Decimal(unitPrice);

  if (qty.lte(0)) {
    throw new ValidationError('Item quantity must be strictly greater than 0.');
  }
  if (price.lt(0)) {
    throw new ValidationError('Item unit price cannot be negative.');
  }

  return qty.times(price).toFixed(2);
}

export function calculateOrderTotals(
  items: InputItemForPricing[],
  taxAmountInput: Decimal.Value = 0,
  shippingAmountInput: Decimal.Value = 0,
  discountAmountInput: Decimal.Value = 0
): CalculatedOrderTotals {
  if (!items || items.length === 0) {
    throw new ValidationError('At least one item is required to calculate order totals.');
  }

  const tax = new Decimal(taxAmountInput || 0);
  const shipping = new Decimal(shippingAmountInput || 0);
  const discount = new Decimal(discountAmountInput || 0);

  if (tax.lt(0)) {
    throw new ValidationError('Tax amount cannot be negative.');
  }
  if (shipping.lt(0)) {
    throw new ValidationError('Shipping amount cannot be negative.');
  }
  if (discount.lt(0)) {
    throw new ValidationError('Discount amount cannot be negative.');
  }

  let subtotalAcc = new Decimal(0);
  const calculatedLineTotals: string[] = [];

  for (const item of items) {
    const lineTotalStr = calculateLineTotal(item.quantity, item.unitPrice);
    calculatedLineTotals.push(lineTotalStr);
    subtotalAcc = subtotalAcc.plus(new Decimal(lineTotalStr));
  }

  const subtotal = subtotalAcc.toFixed(2);
  const totalBeforeDiscount = subtotalAcc.plus(tax).plus(shipping);

  if (discount.gt(totalBeforeDiscount)) {
    throw new ValidationError(
      `Discount amount (${discount.toFixed(2)}) cannot exceed total before discount (${totalBeforeDiscount.toFixed(2)}).`
    );
  }

  const totalAmount = totalBeforeDiscount.minus(discount).toFixed(2);

  return {
    calculatedLineTotals,
    subtotal,
    taxAmount: tax.toFixed(2),
    shippingAmount: shipping.toFixed(2),
    discountAmount: discount.toFixed(2),
    totalAmount
  };
}
