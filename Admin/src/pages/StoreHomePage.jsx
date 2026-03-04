import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, consumePrefetchedGet } from "../api";
import { useAuth } from "../auth";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { useToast } from "../context/ToastContext";

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

export const StoreHomePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const search = (searchParams.get("search") || "").toLowerCase();
  const category = searchParams.get("category") || "all";

  useEffect(() => {
    const loadProducts = async () => {
      const prefetched = consumePrefetchedGet("/products");
      if (prefetched) {
        setProducts(prefetched || []);
        setLoading(false);
      } else {
        setLoading(true);
      }
      setError("");
      try {
        const response = await api.get("/products");
        setProducts(response.data || []);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  const categories = useMemo(
    () => ["all", ...new Set(products.map((product) => String(product.category || "general")))],
    [products]
  );

  const visibleProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchSearch = String(product.title || "").toLowerCase().includes(search);
        const matchCategory = category === "all" || String(product.category) === category;
        return matchSearch && matchCategory && product.status !== "draft";
      }),
    [products, search, category]
  );

  const addToCart = async (productId) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/" } });
      return;
    }
    try {
      await api.post("/cart/items", { productId, quantity: 1 });
      showToast({ type: "success", title: "Added to cart" });
    } catch (err) {
      showToast({
        type: "error",
        title: "Failed to add to cart",
        message: err?.response?.data?.message || "Please try again.",
      });
    }
  };

  if (loading) return <LoadingState label="Loading products..." />;
  if (error) return <ErrorState message={error} action={<Button onClick={() => window.location.reload()}>Retry</Button>} />;

  return (
    <div>
      <section className="mb-5">
        <h1 className="font-heading text-2xl font-bold text-slate-900">Shop Products</h1>
        <p className="mt-1 text-sm text-slate-600">Browse products, filter by category, and place orders.</p>
        <div className="mt-3 overflow-x-auto">
          <div className="flex min-w-max gap-2 pb-1">
            {categories.map((item) => {
              const active = category === item || (item === "all" && !searchParams.get("category"));
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    if (item === "all") next.delete("category");
                    else next.set("category", item);
                    setSearchParams(next);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition ${
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item === "all" ? "All" : item}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {visibleProducts.length === 0 ? (
        <EmptyState title="No products found" description="Try changing your search or category filters." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {visibleProducts.map((product) => {
            const isOut = Number(product.stockQty || 0) <= 0;
            const reviewCount = Array.isArray(product.reviews) ? product.reviews.length : 0;
            const avgRating =
              reviewCount > 0
                ? (product.reviews || []).reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviewCount
                : 0;
            return (
              <article key={product._id} className="rounded-2xl border border-slate-200 bg-white p-3">
                <Link to={`/product/${product._id}`}>
                  <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-500">No image</div>
                    )}
                  </div>
                </Link>
                <div className="mt-3">
                  <p className="truncate font-semibold text-slate-900">{product.title}</p>
                  <p className="text-xs text-slate-500">{product.category}</p>
                  <p className="mt-1 min-h-9 text-xs text-slate-600">
                    {String(product.description || "No description available.").slice(0, 70)}
                    {String(product.description || "").length > 70 ? "..." : ""}
                  </p>
                  <p className="mt-2 text-base font-bold text-slate-900">
                    {formatMoney(product.salePrice > 0 ? product.salePrice : product.price)}
                  </p>
                  <div className="flex items-center gap-1">
                    {renderStars(avgRating)}
                    <p className="text-[11px] text-amber-700">
                      {reviewCount > 0 ? `${avgRating.toFixed(1)} (${reviewCount})` : "No reviews"}
                    </p>
                  </div>
                  <p className={`text-xs ${isOut ? "text-red-600" : "text-slate-600"}`}>
                    {isOut ? "Out of stock" : `Stock: ${Number(product.stockQty || 0)}`}
                  </p>
                </div>
                <Button className="mt-3 w-full" disabled={isOut} onClick={() => addToCart(product._id)}>
                  {isOut ? "Out of stock" : "Add to Cart"}
                </Button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
