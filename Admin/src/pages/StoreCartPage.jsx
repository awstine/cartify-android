import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, consumePrefetchedGet } from "../api";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { useToast } from "../context/ToastContext";

const formatMoney = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(Number(value || 0));

export const StoreCartPage = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadCart = async () => {
    const prefetched = consumePrefetchedGet("/cart");
    if (prefetched) {
      setItems(prefetched.items || []);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const response = await api.get("/cart");
      setItems(response.data.items || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const summary = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.product?.price || 0) * Number(item.quantity || 0), 0);
    const shipping = subtotal > 0 ? 6.99 : 0;
    const tax = subtotal * 0.08;
    return { subtotal, shipping, tax, total: subtotal + shipping + tax };
  }, [items]);

  const updateQty = async (productId, delta) => {
    try {
      await api.patch(`/cart/items/${productId}`, { quantityDelta: delta });
      await loadCart();
    } catch (err) {
      showToast({ type: "error", title: "Failed to update cart", message: err?.response?.data?.message || "Try again." });
    }
  };

  const removeItem = async (productId) => {
    try {
      await api.delete(`/cart/items/${productId}`);
      await loadCart();
    } catch (err) {
      showToast({ type: "error", title: "Failed to remove item", message: err?.response?.data?.message || "Try again." });
    }
  };

  const checkout = async () => {
    setSubmitting(true);
    try {
      await api.post("/cart/checkout");
      showToast({ type: "success", title: "Order placed successfully" });
      await loadCart();
    } catch (err) {
      showToast({ type: "error", title: "Checkout failed", message: err?.response?.data?.message || "Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Loading cart..." />;
  if (error) return <ErrorState message={error} action={<Button onClick={loadCart}>Retry</Button>} />;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-slate-900">Your Cart</h1>
      <p className="mt-1 text-sm text-slate-600">Review items before checkout.</p>

      {items.length === 0 ? (
        <EmptyState title="Your cart is empty" description="Add products to continue checkout." action={<Link to="/"><Button>Browse Products</Button></Link>} />
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                <div className="h-16 w-16 overflow-hidden rounded-lg bg-slate-100">
                  {item.product?.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.product?.title || "Product"} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{item.product?.title || "Unknown product"}</p>
                  <p className="text-sm text-slate-600">{formatMoney(item.product?.price || 0)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" className="px-3" onClick={() => updateQty(item.productId, -1)}>
                    -
                  </Button>
                  <span className="min-w-6 text-center text-sm font-semibold">{item.quantity}</span>
                  <Button variant="secondary" className="px-3" onClick={() => updateQty(item.productId, 1)}>
                    +
                  </Button>
                </div>
                <Button variant="ghost" className="text-red-600" onClick={() => removeItem(item.productId)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <aside className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Order Summary</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(summary.subtotal)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{formatMoney(summary.shipping)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{formatMoney(summary.tax)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold"><span>Total</span><span>{formatMoney(summary.total)}</span></div>
            </div>
            <Button className="mt-4 w-full" onClick={checkout} loading={submitting}>
              Checkout
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
};
