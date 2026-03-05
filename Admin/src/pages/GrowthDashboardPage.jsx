import { useEffect, useMemo, useState } from "react";
import { api, consumePrefetchedGet } from "../api";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";

const toPercent = (value) => `${Number(value || 0).toFixed(1)}%`;
const toMoney = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(Number(value || 0));

export const GrowthDashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMetrics = async () => {
    const prefetched = consumePrefetchedGet("/admin/growth");
    if (prefetched) {
      setMetrics(prefetched);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const response = await api.get("/admin/growth");
      setMetrics(response.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load growth analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const engagementPath = useMemo(() => {
    const values = metrics?.engagement || [];
    if (values.length === 0) return "";
    const max = Math.max(1, ...values.map((item) => Number(item.sessions || 0)));
    return values
      .map((item, index) => {
        const x = (index / Math.max(values.length - 1, 1)) * 100;
        const y = 100 - (Number(item.sessions || 0) / max) * 100;
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [metrics?.engagement]);

  if (loading) return <LoadingState label="Loading growth analytics..." />;
  if (error) return <ErrorState message={error} action={<Button onClick={loadMetrics}>Retry</Button>} />;
  if (!metrics) return <EmptyState title="No growth data" description="Try again later." />;

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Sessions</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{metrics.funnel?.sessions || 0}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Conversion Rate</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{toPercent(metrics.funnel?.conversionRate)}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Fulfillment Rate</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{toPercent(metrics.funnel?.fulfillmentRate)}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Avg Order Value</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{toMoney(metrics.funnel?.avgOrderValue)}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-900">Funnel</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Sessions", value: metrics.funnel?.sessions || 0 },
            { label: "Products", value: metrics.funnel?.productCount || 0 },
            { label: "Wishlist Intent", value: metrics.funnel?.wishlistIntent || 0 },
            { label: "Orders", value: metrics.funnel?.placedOrders || 0 },
            { label: "Delivered", value: metrics.funnel?.deliveredOrders || 0 },
          ].map((item) => (
            <article key={item.label} className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{item.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-900">Engagement Trend (30 days)</h2>
        <div className="mt-3 h-44 rounded-xl border border-slate-200 p-3">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
            <line x1="0" y1="100" x2="100" y2="100" stroke="#cbd5e1" strokeDasharray="2 2" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#cbd5e1" strokeDasharray="2 2" />
            <line x1="0" y1="0" x2="100" y2="0" stroke="#cbd5e1" strokeDasharray="2 2" />
            <path d={engagementPath} fill="none" stroke="#2563eb" strokeWidth="1.8" />
          </svg>
        </div>
      </section>
    </div>
  );
};
