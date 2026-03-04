import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Button } from "../components/ui/Button";
import { Field, Select, Textarea } from "../components/ui/Field";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { useToast } from "../context/ToastContext";

const formatMoney = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(Number(value || 0));

export const StoreProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadProduct = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/products/${id}`);
      setProduct(response.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
  }, [id]);

  const avgRating = useMemo(() => {
    const reviews = product?.reviews || [];
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviews.length;
  }, [product?.reviews]);

  const addToCart = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/product/${id}` } });
      return;
    }
    try {
      await api.post("/cart/items", { productId: id, quantity: 1 });
      showToast({ type: "success", title: "Added to cart" });
    } catch (err) {
      showToast({ type: "error", title: "Failed to add to cart", message: err?.response?.data?.message || "Try again." });
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/product/${id}` } });
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/products/${id}/reviews`, { rating: Number(rating), comment });
      showToast({ type: "success", title: "Review submitted" });
      setComment("");
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

  if (loading) return <LoadingState label="Loading product..." />;
  if (error) return <ErrorState message={error} action={<Button onClick={loadProduct}>Retry</Button>} />;
  if (!product) return <EmptyState title="Product not found" description="The product may have been removed." />;

  const isOut = Number(product.stockQty || 0) <= 0;
  const imageList = (product.images || []).length > 0 ? product.images : [product.imageUrl].filter(Boolean);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {imageList[0] ? (
            <img src={imageList[0]} alt={product.title} className="h-[360px] w-full object-cover" />
          ) : (
            <div className="flex h-[360px] items-center justify-center text-slate-500">No image</div>
          )}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h1 className="font-heading text-2xl font-bold text-slate-900">{product.title}</h1>
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
    </div>
  );
};
