import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, consumePrefetchedGet, prefetchGet } from "../api";
import { useAuth } from "../auth";
import { Button } from "../components/ui/Button";
import { Field, Select, Textarea } from "../components/ui/Field";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { useToast } from "../context/ToastContext";
import { withStoreQuery } from "../storeMode";

const formatMoney = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(Number(value || 0));

export const StoreProductPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const storeSlug = searchParams.get("store") || "";
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [lowDataModeEnabled, setLowDataModeEnabled] = useState(false);

  const loadProduct = async () => {
    const prefetched = consumePrefetchedGet(`/products/${id}`);
    if (prefetched) {
      setProduct(prefetched);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await prefetchGet(`/products/${id}`, { ttlMs: 5 * 60_000 });
      setProduct(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
  }, [id]);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) return undefined;
    api
      .get("/users/me")
      .then((response) => {
        if (!active) return;
        setLowDataModeEnabled(Boolean(response.data?.preferences?.lowDataModeEnabled));
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!product?._id) return;
    const key = "cartify_recently_viewed_products";
    const current = (() => {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch (_err) {
        return [];
      }
    })();
    const next = [String(product._id), ...current.filter((item) => String(item) !== String(product._id))].slice(0, 12);
    localStorage.setItem(key, JSON.stringify(next));
    setRecentlyViewed(next);
  }, [product?._id]);

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

  const avgRating = useMemo(() => {
    const reviews = product?.reviews || [];
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviews.length;
  }, [product?.reviews]);

  const addToCart = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: withStoreQuery(`/product/${id}`, storeSlug) } });
      return;
    }
    try {
      await api.post("/cart/items", { productId: id, quantity: 1 });
      showToast({ type: "success", title: "Added to cart" });
    } catch (err) {
      showToast({ type: "error", title: "Failed to add to cart", message: err?.response?.data?.message || "Try again." });
    }
  };

  const openRelatedProduct = async (productId) => {
    try {
      await prefetchGet(`/products/${productId}`, { withProgress: true, ttlMs: 5 * 60_000 });
    } catch (_err) {
      // Ignore and navigate anyway.
    }
    navigate(withStoreQuery(`/product/${productId}`, storeSlug));
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) {
      navigate("/login", { state: { from: withStoreQuery(`/product/${id}`, storeSlug) } });
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/products/${id}/reviews`, { rating: Number(rating), comment });
      showToast({ type: "success", title: "Review submitted" });
      setComment("");
      await prefetchGet(`/products/${id}`, { force: true, ttlMs: 5 * 60_000 });
      await loadProduct();
    } catch (err) {
      showToast({
        type: "error",
        title: "Failed to submit review",
        message: err?.response?.data?.message || "Try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Loading product..." showSpinner={false} />;
  if (error) return <ErrorState message={error} action={<Button onClick={loadProduct}>Retry</Button>} />;
  if (!product) return <EmptyState title="Product not found" description="The product may have been removed." />;

  const isOut = Number(product.stockQty || 0) <= 0;
  const imageList = (product.images || []).length > 0 ? product.images : [product.imageUrl].filter(Boolean);
  const heroImages = lowDataModeEnabled ? imageList.slice(0, 1) : imageList;
  const sameCategoryProducts = catalogProducts.filter(
    (item) => item?._id !== product._id && item?.status !== "draft" && String(item?.category || "") === String(product.category || "")
  );
  const fallbackProducts = catalogProducts.filter((item) => item?._id !== product._id && item?.status !== "draft");
  const relatedProducts = (sameCategoryProducts.length > 0 ? sameCategoryProducts : fallbackProducts).slice(0, lowDataModeEnabled ? 2 : 4);
  const recentlyViewedProducts = catalogProducts
    .filter((item) => recentlyViewed.includes(String(item._id)) && String(item._id) !== String(product._id))
    .sort((a, b) => recentlyViewed.indexOf(String(a._id)) - recentlyViewed.indexOf(String(b._id)))
    .slice(0, lowDataModeEnabled ? 2 : 4);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {imageList.length > 0 ? (
            <>
              <div className="flex snap-x snap-mandatory overflow-x-auto">
                {heroImages.map((imageUrl, index) => (
                  <div key={`${imageUrl}-${index}`} className="w-full min-w-full snap-start">
                    <img src={imageUrl} alt={`${product.title} image ${index + 1}`} className="h-[360px] w-full object-cover" />
                  </div>
                ))}
              </div>
              {heroImages.length > 1 ? (
                <p className="px-4 py-2 text-xs text-slate-500">Scroll right to view more images ({heroImages.length}).</p>
              ) : null}
            </>
          ) : (
            <div className="flex h-[360px] items-center justify-center text-slate-500">No image</div>
          )}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        {storeSlug ? (
          <Button variant="secondary" className="mb-3" onClick={() => navigate(`/store/${storeSlug}`)}>
            Back to Store
          </Button>
        ) : null}
        <h1 className="font-heading text-2xl font-bold text-slate-900">{product.title}</h1>
        {product.store?.name ? (
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{product.store.name}</p>
            <p className="mt-1 text-sm text-slate-700">{product.store.description || "No store description available yet."}</p>
          </div>
        ) : null}
        <p className="mt-1 text-sm text-slate-500">{product.category}</p>
        <p className="mt-3 text-2xl font-extrabold text-slate-900">
          {formatMoney(product.salePrice > 0 ? product.salePrice : product.price)}
        </p>
        <p className={`mt-1 text-sm ${isOut ? "text-red-600" : "text-slate-600"}`}>
          {isOut ? "Out of stock" : `Stock available: ${Number(product.stockQty || 0)}`}
        </p>
        <p className="mt-4 text-sm text-slate-700">{product.description || "No description provided."}</p>
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-700">{avgRating.toFixed(1)} / 5</span>
          <span className="text-slate-500">({(product.reviews || []).length} review(s))</span>
        </div>
        <Button className="mt-5 w-full" onClick={addToCart} disabled={isOut}>
          {isOut ? "Out of stock" : "Add to Cart"}
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
        <h2 className="text-lg font-semibold text-slate-900">Customer Reviews</h2>
        <form onSubmit={submitReview} className="mt-3 grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-4">
          <Field label="Rating">
            <Select value={rating} onChange={(event) => setRating(event.target.value)} aria-label="Rating">
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={String(value)}>
                  {value} Star
                </option>
              ))}
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Comment">
              <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Share your review..." rows={2} />
            </Field>
          </div>
          <div className="flex items-end">
            <Button type="submit" loading={submitting} className="w-full">
              Submit
            </Button>
          </div>
        </form>

        <div className="mt-4 space-y-3">
          {(product.reviews || []).length === 0 ? (
            <p className="text-sm text-slate-500">No reviews yet.</p>
          ) : (
            [...(product.reviews || [])]
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((review, index) => (
                <article key={`${review.userId}-${index}`} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{review.userName}</p>
                    <span className="text-xs text-amber-700">{Number(review.rating || 0)} / 5</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{review.comment || "No comment."}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(review.createdAt).toLocaleString()}</p>
                </article>
              ))
          )}
        </div>
      </div>

      {relatedProducts.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <div className="flex items-end justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">More Products To Explore</h2>
            <p className="text-xs text-slate-500">{sameCategoryProducts.length > 0 ? `More in ${product.category}` : "Based on store catalog"}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {relatedProducts.map((item) => {
              const relatedOut = Number(item.stockQty || 0) <= 0;
              return (
                <article
                  key={item._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openRelatedProduct(item._id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openRelatedProduct(item._id);
                    }
                  }}
                  className="cursor-pointer rounded-xl border border-slate-200 p-3 transition hover:border-slate-300"
                >
                  <div className="aspect-square overflow-hidden rounded-lg bg-slate-100">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-500">No image</div>
                    )}
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-600">{formatMoney(item.salePrice > 0 ? item.salePrice : item.price)}</p>
                  <p className={`mt-1 text-xs ${relatedOut ? "text-red-600" : "text-slate-500"}`}>
                    {relatedOut ? "Out of stock" : "In stock"}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {recentlyViewedProducts.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <div className="flex items-end justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Recently Viewed</h2>
            <p className="text-xs text-slate-500">Continue where you left off</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {recentlyViewedProducts.map((item) => (
              <article
                key={item._id}
                role="button"
                tabIndex={0}
                onClick={() => openRelatedProduct(item._id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openRelatedProduct(item._id);
                  }
                }}
                className="cursor-pointer rounded-xl border border-slate-200 p-3 transition hover:border-slate-300"
              >
                <div className="aspect-square overflow-hidden rounded-lg bg-slate-100">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-500">No image</div>
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-slate-900">{item.title}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};
