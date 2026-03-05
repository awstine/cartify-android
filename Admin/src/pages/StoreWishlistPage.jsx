import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { resolveStoreSlugFromLocation } from "../storeMode";

const formatMoney = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(Number(value || 0));

export const StoreWishlistPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const storeSlug = resolveStoreSlugFromLocation(location.pathname, searchParams);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [togglingAlertKey, setTogglingAlertKey] = useState("");

  const loadWishlist = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/wishlist");
      setItems(response.data?.items || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const visibleItems = useMemo(() => {
    if (!storeSlug) return items;
    return items.filter((item) => String(item?.product?.storeSlug || "") === String(storeSlug));
  }, [items, storeSlug]);

  const removeItem = async (productId) => {
    setBusyId(productId);
    try {
      await api.delete(`/wishlist/items/${productId}`);
      setItems((prev) => prev.filter((entry) => entry.productId !== productId));
    } catch (_err) {
      // Keep UI stable if delete fails.
    } finally {
      setBusyId("");
    }
  };

  const toggleAlert = async (productId, key, value) => {
    const stateKey = `${productId}-${key}`;
    setTogglingAlertKey(stateKey);
    try {
      await api.patch(`/wishlist/items/${productId}/alerts`, { [key]: value });
      setItems((prev) =>
        prev.map((entry) =>
          entry.productId === productId
            ? {
                ...entry,
                alerts: {
                  ...entry.alerts,
                  [key]: value,
                },
              }
            : entry
        )
      );
    } catch (_err) {
      // Keep UI stable if update fails.
    } finally {
      setTogglingAlertKey("");
    }
  };

  if (loading) return <LoadingState label="Loading wishlist..." showSpinner={false} />;
  if (error) return <ErrorState message={error} action={<Button onClick={loadWishlist}>Retry</Button>} />;
  if (visibleItems.length === 0) {
    return (
      <EmptyState
        title="Wishlist is empty"
        description={storeSlug ? "No wishlist items for this store yet." : "Save products you want to buy later."}
        action={<Button onClick={() => navigate(storeSlug ? `/store/${storeSlug}` : "/")}>Browse Products</Button>}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="font-heading text-2xl font-bold text-slate-900">Wishlist</h1>
      <p className="mt-1 text-sm text-slate-600">
        {storeSlug ? `Showing wishlist for store: ${storeSlug}` : "Your saved products."}
      </p>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map((item) => {
          const product = item.product;
          if (!product) return null;
          return (
            <article key={item.productId} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">No image</div>
                )}
              </div>
              <p className="mt-3 truncate text-base font-semibold text-slate-900">{product.title}</p>
              <p className="text-xs text-slate-500">{product.category || "general"}</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{formatMoney(product.price)}</p>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <label className="flex items-center justify-between gap-2">
                  <span>Price-drop alerts</span>
                  <input
                    type="checkbox"
                    checked={Boolean(item.alerts?.priceDrop)}
                    disabled={togglingAlertKey === `${item.productId}-priceDrop`}
                    onChange={(event) => toggleAlert(item.productId, "priceDrop", event.target.checked)}
                  />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span>Back-in-stock alerts</span>
                  <input
                    type="checkbox"
                    checked={Boolean(item.alerts?.backInStock)}
                    disabled={togglingAlertKey === `${item.productId}-backInStock`}
                    onChange={(event) => toggleAlert(item.productId, "backInStock", event.target.checked)}
                  />
                </label>
                {item.alertState?.priceDropped ? <p className="text-emerald-700">Price dropped since you saved it.</p> : null}
                {item.alertState?.backInStock ? <p className="text-emerald-700">Back in stock now.</p> : null}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/product/${product.id}${storeSlug ? `?store=${encodeURIComponent(storeSlug)}` : ""}`)}
                >
                  View
                </Button>
                <Button
                  variant="ghost"
                  className="text-red-600"
                  loading={busyId === item.productId}
                  onClick={() => removeItem(item.productId)}
                >
                  Remove
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
