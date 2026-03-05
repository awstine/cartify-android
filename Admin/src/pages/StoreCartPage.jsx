import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, consumePrefetchedGet, prefetchGet } from "../api";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { useToast } from "../context/ToastContext";
import { withStoreQuery } from "../storeMode";

const formatMoney = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(Number(value || 0));
const renderStars = (rating) => {
  const normalized = Math.max(0, Math.min(5, Number(rating || 0)));
  return Array.from({ length: 5 }).map((_, index) => {
    const filled = index + 1 <= Math.round(normalized);
    return (
      <svg
        key={`star-${index}`}
        viewBox="0 0 24 24"
        className={`h-3.5 w-3.5 ${filled ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`}
      >
        <path d="m12 3.2 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.7l-5.6 2.9 1.1-6.3-4.6-4.5 6.3-.9L12 3.2Z" />
      </svg>
    );
  });
};

export const StoreCartPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storeSlug = searchParams.get("store") || "";
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
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

  useEffect(() => {
    let active = true;
    const loadCatalogProducts = async () => {
      try {
        const data = await prefetchGet("/products", {
          params: storeSlug ? { storeSlug } : undefined,
          ttlMs: 5 * 60_000,
        });
        if (active) setCatalogProducts(data || []);
      } catch (_err) {
        if (active) setCatalogProducts([]);
      }
    };
    loadCatalogProducts();
    return () => {
      active = false;
    };
  }, [storeSlug]);

  const summary = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.product?.price || 0) * Number(item.quantity || 0), 0);
    const shipping = subtotal > 0 ? 6.99 : 0;
    const tax = subtotal * 0.08;
    return { subtotal, shipping, tax, total: subtotal + shipping + tax };
  }, [items]);

  const storeGroups = useMemo(() => {
    const groups = new Map();
    items.forEach((item) => {
      const storeId = item.product?.storeId || "platform";
      const current = groups.get(storeId) || { name: item.product?.storeName || "Marketplace", count: 0 };
      current.count += Number(item.quantity || 0);
      groups.set(storeId, current);
    });
    return [...groups.values()];
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
      const response = await api.post("/cart/checkout");
      const orderCount = Array.isArray(response.data?.orderIds) ? response.data.orderIds.length : 1;
      showToast({
        type: "success",
        title: orderCount > 1 ? `${orderCount} store orders placed` : "Order placed successfully",
      });
      await loadCart();
    } catch (err) {
      showToast({ type: "error", title: "Checkout failed", message: err?.response?.data?.message || "Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const openProduct = async (productId) => {
    try {
      await prefetchGet(`/products/${productId}`, { withProgress: true, ttlMs: 5 * 60_000 });
    } catch (_err) {
      // Ignore and navigate anyway.
    }
    navigate(withStoreQuery(`/product/${productId}`, storeSlug));
  };

  const addRecommendedToCart = async (productId) => {
    try {
      await api.post("/cart/items", { productId, quantity: 1 });
      showToast({ type: "success", title: "Added to cart" });
      await loadCart();
    } catch (err) {
      showToast({ type: "error", title: "Failed to add to cart", message: err?.response?.data?.message || "Try again." });
    }
  };

  if (loading) return <LoadingState label="Loading cart..." showSpinner={false} />;
  if (error) return <ErrorState message={error} action={<Button onClick={loadCart}>Retry</Button>} />;

  const cartProductIds = new Set(items.map((item) => item.productId));
  const moreProducts = catalogProducts
    .filter((product) => product?.status !== "draft" && !cartProductIds.has(product?._id))
    .slice(0, 4);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="font-heading text-xl font-bold text-slate-900 sm:text-2xl">Your Cart</h1>
      <p className="mt-1 text-sm text-slate-600">Review items before checkout.</p>
      {storeGroups.length > 1 ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Mixed cart detected: {storeGroups.length} stores in one checkout. Orders will be split per store automatically.
        </div>
      ) : null}

      {items.length === 0 ? (
        <EmptyState title="Your cart is empty" description="Add products to continue checkout." action={<Link to="/"><Button>Browse Products</Button></Link>} />
      ) : (
        <>
          <div className="mt-5 grid gap-4 xl:grid-cols-3 xl:items-start">
            <div className="space-y-3 xl:col-span-2">
            {items.map((item) => (
              <article key={item.productId} className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[5rem_minmax(0,1fr)] sm:items-center">
                  <div className="h-40 w-full overflow-hidden rounded-lg bg-slate-100 sm:h-20 sm:w-20">
                    {item.product?.imageUrl ? (
                      <img src={item.product.imageUrl} alt={item.product?.title || "Product"} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{item.product?.title || "Unknown product"}</p>
                    <p className="text-xs text-slate-500">Store: {item.product?.storeName || "Marketplace"}</p>
                    <p className="text-sm text-slate-600">{formatMoney(item.product?.price || 0)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Item total: {formatMoney(Number(item.product?.price || 0) * Number(item.quantity || 0))}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="inline-flex w-full items-center justify-between rounded-xl bg-slate-50 p-1 sm:w-auto sm:justify-start sm:gap-2">
                    <Button variant="secondary" className="h-9 w-9 px-0" onClick={() => updateQty(item.productId, -1)}>
                      -
                    </Button>
                    <span className="min-w-10 text-center text-sm font-semibold">{item.quantity}</span>
                    <Button variant="secondary" className="h-9 w-9 px-0" onClick={() => updateQty(item.productId, 1)}>
                      +
                    </Button>
                  </div>
                  <Button variant="ghost" className="w-full text-red-600 sm:w-auto" onClick={() => removeItem(item.productId)}>
                    Remove
                  </Button>
                </div>
              </article>
            ))}
            </div>
            <aside className="rounded-2xl border border-slate-200 bg-white p-4 xl:sticky xl:top-24">
              <h2 className="text-lg font-semibold text-slate-900">Order Summary</h2>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2"><span>Subtotal</span><span className="text-right">{formatMoney(summary.subtotal)}</span></div>
                <div className="flex items-center justify-between gap-2"><span>Shipping</span><span className="text-right">{formatMoney(summary.shipping)}</span></div>
                <div className="flex items-center justify-between gap-2"><span>Tax</span><span className="text-right">{formatMoney(summary.tax)}</span></div>
                <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2 font-bold"><span>Total</span><span className="text-right">{formatMoney(summary.total)}</span></div>
              </div>
              <Button className="mt-4 w-full" onClick={checkout} loading={submitting}>
                Checkout
              </Button>
            </aside>
          </div>

          {moreProducts.length > 0 ? (
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-slate-900">More Products You May Like</h2>
              <p className="mt-1 text-sm text-slate-600">Discover more items while you checkout.</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
                {moreProducts.map((product) => {
                  const isOut = Number(product.stockQty || 0) <= 0;
                  const reviewCount = Array.isArray(product.reviews) ? product.reviews.length : 0;
                  const avgRating =
                    reviewCount > 0
                      ? (product.reviews || []).reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviewCount
                      : 0;
                  return (
                    <article
                      key={product._id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openProduct(product._id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openProduct(product._id);
                        }
                      }}
                      className="cursor-pointer rounded-xl border border-slate-200 p-3 transition hover:border-slate-300"
                    >
                      <div className="aspect-square overflow-hidden rounded-lg bg-slate-100">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-slate-500">No image</div>
                        )}
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold text-slate-900">{product.title}</p>
                      <p className="text-xs text-slate-500">{product.category || "general"}</p>
                      <p className="mt-1 min-h-9 text-xs text-slate-600">
                        {String(product.description || "No description available.").slice(0, 70)}
                        {String(product.description || "").length > 70 ? "..." : ""}
                      </p>
                      <p className="mt-2 text-sm font-bold text-slate-900">{formatMoney(product.salePrice > 0 ? product.salePrice : product.price)}</p>
                      <div className="flex items-center gap-1">
                        {renderStars(avgRating)}
                        <p className="text-[11px] text-amber-700">
                          {reviewCount > 0 ? `${avgRating.toFixed(1)} (${reviewCount})` : "No reviews"}
                        </p>
                      </div>
                      <p className={`mt-1 text-xs ${isOut ? "text-red-600" : "text-slate-500"}`}>
                        {isOut ? "Out of stock" : `Stock: ${Number(product.stockQty || 0)}`}
                      </p>
                      <Button
                        className="mt-2 w-full"
                        disabled={isOut}
                        onClick={(event) => {
                          event.stopPropagation();
                          addRecommendedToCart(product._id);
                        }}
                      >
                        {isOut ? "Out of stock" : "Add to Cart"}
                      </Button>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
};
