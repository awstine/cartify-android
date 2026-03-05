import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, consumePrefetchedGet, prefetchGet } from "../api";
import { useAuth } from "../auth";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { useToast } from "../context/ToastContext";

const formatMoney = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(Number(value || 0));
const PRODUCTS_BATCH_SIZE = 12;
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
  const { storeSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_BATCH_SIZE);
  const loadMoreRef = useRef(null);
  const search = (searchParams.get("search") || "").toLowerCase();
  const category = searchParams.get("category") || "all";
  const inStockOnly = String(searchParams.get("inStock") || "").toLowerCase() === "true";
  const minRating = Number(searchParams.get("minRating") || 0);
  const maxPrice = Number(searchParams.get("maxPrice") || 0);
  const selectedStoreSlug = storeSlug || searchParams.get("store") || "all";

  useEffect(() => {
    let active = true;
    const loadStores = async () => {
      try {
        const data = await prefetchGet("/stores", { ttlMs: 5 * 60_000 });
        if (active) setStores(data || []);
      } catch (_err) {
        if (active) setStores([]);
      }
    };
    loadStores();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      const productParams = {
        ...(selectedStoreSlug !== "all" ? { storeSlug: selectedStoreSlug } : {}),
        ...(category !== "all" ? { category } : {}),
        ...(search ? { search } : {}),
        ...(inStockOnly ? { inStock: true } : {}),
        ...(minRating > 0 ? { minRating } : {}),
        ...(maxPrice > 0 ? { maxPrice } : {}),
      };
      const prefetched = consumePrefetchedGet("/products", { params: productParams });
      if (prefetched) {
        setProducts(prefetched || []);
        setLoading(false);
      } else {
        setLoading(true);
      }
      setError("");
      try {
        const response = await api.get("/products", { params: productParams });
        setProducts(response.data || []);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [selectedStoreSlug, category, search, inStockOnly, minRating, maxPrice]);

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
  const maxPriceOptions = useMemo(() => {
    const prices = products
      .map((product) => Number(product.salePrice > 0 ? product.salePrice : product.price || 0))
      .filter((value) => value > 0)
      .sort((a, b) => a - b);
    if (prices.length === 0) {
      return maxPrice > 0 ? [maxPrice] : [];
    }

    const toNiceStep = (value) => {
      if (value >= 10000) return Math.round(value / 500) * 500;
      if (value >= 1000) return Math.round(value / 100) * 100;
      return Math.round(value / 50) * 50;
    };

    const indexes = [Math.floor(prices.length * 0.33), Math.floor(prices.length * 0.66), prices.length - 1];
    const next = indexes
      .map((index) => prices[Math.max(0, Math.min(index, prices.length - 1))])
      .map(toNiceStep)
      .filter((value) => value > 0);

    if (maxPrice > 0) next.push(maxPrice);
    return [...new Set(next)].sort((a, b) => a - b);
  }, [products, maxPrice]);

  useEffect(() => {
    setVisibleCount(PRODUCTS_BATCH_SIZE);
  }, [search, category, inStockOnly, minRating, maxPrice]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      api
        .post("/products/search-events", {
          query: search,
          category,
          storeSlug: selectedStoreSlug !== "all" ? selectedStoreSlug : "",
          inStockOnly,
          minRating,
          maxPrice,
          resultCount: visibleProducts.length,
        })
        .catch(() => null);
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [search, category, selectedStoreSlug, inStockOnly, minRating, maxPrice, visibleProducts.length]);

  useEffect(() => {
    if (!loadMoreRef.current) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setVisibleCount((current) => Math.min(current + PRODUCTS_BATCH_SIZE, visibleProducts.length));
        });
      },
      { rootMargin: "200px 0px" }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [visibleProducts.length]);

  const renderedProducts = useMemo(() => visibleProducts.slice(0, visibleCount), [visibleProducts, visibleCount]);
  const hasMoreProducts = renderedProducts.length < visibleProducts.length;

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

  const openProduct = async (productId) => {
    try {
      await prefetchGet(`/products/${productId}`, { withProgress: true });
    } catch (_err) {
      // Ignore and navigate anyway.
    }
    const storeQuery = selectedStoreSlug !== "all" ? `?store=${encodeURIComponent(selectedStoreSlug)}` : "";
    navigate(`/product/${productId}${storeQuery}`);
  };

  const applyStoreFilter = (slug) => {
    const params = new URLSearchParams(searchParams);
    params.delete("store");
    const query = params.toString();
    if (!slug || slug === "all") {
      navigate(`/${query ? `?${query}` : ""}`);
      return;
    }
    navigate(`/store/${slug}${query ? `?${query}` : ""}`);
  };

  if (loading) return <LoadingState label="Loading products..." showSpinner={false} />;
  if (error) return <ErrorState message={error} action={<Button onClick={() => window.location.reload()}>Retry</Button>} />;

  return (
    <div>
      <section className="mb-5">
        <h1 className="font-heading text-2xl font-bold text-slate-900">Shop Products</h1>
        <p className="mt-1 text-sm text-slate-600">
          {selectedStoreSlug === "all"
            ? "Browse products by store, filter by category, and place orders."
            : `Store mode: ${selectedStoreSlug}. Products and categories are limited to this store.`}
        </p>
        <div className="mt-3 overflow-x-auto">
          <div className="flex min-w-max gap-2 pb-1">
            <button
              type="button"
              onClick={() => applyStoreFilter("all")}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                selectedStoreSlug === "all"
                  ? "border-primary bg-primary text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              All Stores
            </button>
            {stores.map((store) => (
              <button
                key={store._id}
                type="button"
                onClick={() => applyStoreFilter(store.slug)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  selectedStoreSlug === store.slug
                    ? "border-primary bg-primary text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {store.name}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <div className="flex min-w-max gap-2 pb-1">
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                if (inStockOnly) next.delete("inStock");
                else next.set("inStock", "true");
                setSearchParams(next);
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                inStockOnly
                  ? "border-primary bg-primary text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              In Stock
            </button>
            {[4, 3].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  if (Number(next.get("minRating") || 0) === value) next.delete("minRating");
                  else next.set("minRating", String(value));
                  setSearchParams(next);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  minRating === value
                    ? "border-primary bg-primary text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {value}★ & Up
              </button>
            ))}
            {maxPriceOptions.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  if (Number(next.get("maxPrice") || 0) === value) next.delete("maxPrice");
                  else next.set("maxPrice", String(value));
                  setSearchParams(next);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  maxPrice === value
                    ? "border-primary bg-primary text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                Max KES {value}
              </button>
            ))}
            {(inStockOnly || minRating > 0 || maxPrice > 0) ? (
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.delete("inStock");
                  next.delete("minRating");
                  next.delete("maxPrice");
                  setSearchParams(next);
                }}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Clear Filters
              </button>
            ) : null}
          </div>
        </div>
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
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {renderedProducts.map((product) => {
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
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-slate-300"
              >
                <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">No image</div>
                  )}
                </div>
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
                <Button
                  className="mt-3 w-full"
                  disabled={isOut}
                  onClick={(event) => {
                    event.stopPropagation();
                    addToCart(product._id);
                  }}
                >
                  {isOut ? "Out of stock" : "Add to Cart"}
                </Button>
              </article>
            );
            })}
          </div>
          {hasMoreProducts ? (
            <div ref={loadMoreRef} className="py-6 text-center text-sm text-slate-500">
              Loading more products...
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};
