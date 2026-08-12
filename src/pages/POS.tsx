import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import BarcodeInput from "@/components/pos/BarcodeInput";
import ProductCard from "@/components/pos/ProductCard";
import CheckoutPanel from "@/components/pos/CheckoutPanel";
import PrintPreviewDialog from "@/components/shared/PrintPreviewDialog";
import { useCart } from "@/hooks/useCart";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Product, PrinterConfig } from "@/types";

export default function POS() {
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const debouncedSearch = useDebounce(search, 200);
  const cart = useCart();
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ["products", debouncedSearch],
    queryFn: () => api.products.search(debouncedSearch),
    enabled: debouncedSearch.length > 0,
  });

  const allProducts = useQuery({
    queryKey: ["products", "all"],
    queryFn: api.products.list,
    enabled: debouncedSearch.length === 0,
  });

  const displayProducts = useMemo(() => {
    if (debouncedSearch.length > 0) return products;
    return allProducts.data ?? [];
  }, [debouncedSearch, products, allProducts.data]);

  const handleAddProduct = (product: Product) => {
    if (product.stock_qty === 0) {
      setError(`${product.name} is out of stock`);
      return;
    }
    setError("");
    cart.addItem(product);
  };

  const handleBarcodeSubmit = async (value: string) => {
    const product = await api.products.getByBarcode(value);
    if (product) {
      handleAddProduct(product);
      return;
    }
    const found = displayProducts.find(
      (p: Product) => p.barcode === value || p.name.toLowerCase() === value.toLowerCase()
    );
    if (found) handleAddProduct(found);
  };

  const [pendingPrintData, setPendingPrintData] = useState<unknown>(null);

  const handleCheckout = async (amountPaid: number, discount: number) => {
    setError("");
    try {
      const sale = await api.sales.create({
        customerId: cart.customerId,
        items: cart.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          barcode: item.barcode,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })),
        subtotal: cart.subtotal,
        discount,
        total: cart.total,
        amountPaid,
      });

      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });

      let customerTotalArrears = 0;
      if (cart.customerId) {
        const customer = await api.customers.getById(cart.customerId);
        customerTotalArrears = customer?.outstanding_arrear ?? 0;
      }

      const printData = {
        ...sale,
        customer_name: cart.customerName,
        customer_total_arrears: customerTotalArrears,
        items: cart.items.map((item) => ({
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          subtotal: item.subtotal,
        })),
      };
      setPendingPrintData(printData);
      setShowPrintDialog(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      throw e;
    }
  };

  const generateReceiptHtml = useCallback(async (paperSize: string): Promise<string> => {
    if (!pendingPrintData) return "";
    const result = await window.generateReceiptHTML(pendingPrintData, paperSize);
    return result.success ? result.html : "";
  }, [pendingPrintData]);

  async function handlePrintReceipt(config: PrinterConfig) {
    if (!pendingPrintData) return;
    const result = await window.printReceipt(pendingPrintData, config);
    if (!result.success) {
      toast.error(result.error || "Print failed");
    } else {
      toast.success("Receipt printed");
    }
    setPendingPrintData(null);
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-7rem)]">
      <div className="flex-1 flex flex-col min-h-0">
        <BarcodeInput value={search} onChange={setSearch} onSubmit={handleBarcodeSubmit} />
        <div className="flex-1 overflow-y-auto mt-3">
          {displayProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-text-secondary">
              {search ? "No products found" : "Search or scan a product to begin"}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              <AnimatePresence mode="popLayout">
                {displayProducts.slice(0, 50).map((product: Product) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                  >
                    <ProductCard product={product} onAdd={handleAddProduct} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      <div className="w-full lg:w-[380px] xl:w-[400px] shrink-0">
        <div className="lg:sticky lg:top-16 bg-surface border border-border rounded-lg p-4 h-full max-h-[calc(100vh-7.5rem)] flex flex-col">
          <CheckoutPanel
            items={cart.items}
            discount={cart.discount}
            discountValue={cart.discountValue}
            discountType={cart.discountType}
            subtotal={cart.subtotal}
            total={cart.total}
            customerId={cart.customerId}
            onUpdateQuantity={cart.updateQuantity}
            onIncrementBy={cart.incrementBy}
            onRemoveItem={cart.removeItem}
            onDiscountChange={cart.setDiscountValue}
            onToggleDiscountType={cart.toggleDiscountType}
            onClearCart={cart.clearCart}
            onCheckout={handleCheckout}
            onCustomerChange={cart.setCustomer}
            error={error}
          />
        </div>
      </div>

      {showPrintDialog && pendingPrintData && (
        <PrintPreviewDialog
          open={showPrintDialog}
          onOpenChange={(v) => {
            setShowPrintDialog(v);
            if (!v) setPendingPrintData(null);
          }}
          title="Receipt Preview"
          htmlGenerator={generateReceiptHtml}
          onPrint={handlePrintReceipt}
        />
      )}
    </div>
  );
}
