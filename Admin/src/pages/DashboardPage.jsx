import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, consumePrefetchedGet } from "../api";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { Card } from "../components/ui/Surface";
import { Table, Td } from "../components/ui/Table";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(value || 0);

const StatIcon = ({ label }) => {
  if (label === "Products") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 7 12 3l9 4-9 4-9-4Z" />
        <path d="M3 7v10l9 4 9-4V7" />
      </svg>
    );
  }
  if (label === "Categories") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h8v6H3zM13 6h8v4h-8zM13 12h8v6h-8zM3 14h8v4H3z" />
      </svg>
    );
  }
  if (label === "Orders") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 4h12l2 4H4l2-4Z" />
        <path d="M5 8h14v12H5z" />
        <path d="M9 12h6" />
      </svg>
    );
  }
  if (label === "Customers") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="8" r="3" />
        <path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <circle cx="17" cy="9" r="2" />
      </svg>
    );
  }
  return null;
};

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState(null);

  const loadDashboard = async () => {
    const prefetchedDashboard = consumePrefetchedGet("/admin/dashboard");
    const prefetchedRecentOrders = consumePrefetchedGet("/admin/orders", { params: { limit: 5 } });
    if (prefetchedDashboard) setMetrics(prefetchedDashboard);
    if (prefetchedRecentOrders) setOrders(prefetchedRecentOrders.items || []);
    setLoading(!(prefetchedDashboard && prefetchedRecentOrders));
    setError("");
    try {
      const [dashboardRes, orderRes] = await Promise.all([
        api.get("/admin/dashboard"),
        api.get("/admin/orders", { params: { limit: 5 } }),
      ]);
      setMetrics(dashboardRes.data);
      setOrders(orderRes.data.items || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const cards = useMemo(() => {
    if (!metrics) return [];
    return [
      { label: "Products", value: metrics.productCount },
      { label: "Categories", value: metrics.categoryCount },
      { label: "Orders", value: metrics.orderCount },
      { label: "Customers", value: metrics.userCount },
      { label: "Total Revenue", value: formatCurrency(metrics.totalSales) },
      { label: "Stock Value (Buying Price)", value: formatCurrency(metrics.stockValueAtCost) },
      { label: "Expected Profit (Stock)", value: formatCurrency(metrics.expectedProfitPotential) },
      { label: "Profit From Sales", value: formatCurrency(metrics.realizedProfitFromSales) },
    ];
  }, [metrics]);

  if (error) return <ErrorState message={error} action={<Button onClick={loadDashboard}>Retry</Button>} />;
  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (!metrics) return <EmptyState title="No dashboard data" description="Try refreshing the page." />;

  const salesTrend = (Array.isArray(metrics.salesTrend) ? metrics.salesTrend : []).map((point) => {
    const value = Number(point?.sales ?? 0);
    return {
      date: point?.date || "",
      sales: Number.isFinite(value) && value > 0 ? value : 0,
    };
  });
  const maxTrend = Math.max(1, ...salesTrend.map((point) => point.sales));

  return (
    <div>
      <PageHeader title="Dashboard Overview" description="Live KPIs, sales snapshot, and recent order activity." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <StatIcon label={card.label} />
              </span>
              <span>{card.label}</span>
            </div>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-base font-semibold">Sales Trend (Last 14 Days)</h3>
          <p className="mt-1 text-sm text-slate-500">Daily sales analytics based on placed orders.</p>
          {salesTrend.length === 0 ? (
            <EmptyState title="No trend data" description="Sales graph will appear when orders are available." />
          ) : (
            <div className="mt-4">
              <div className="relative h-56 w-full overflow-visible rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/40">
                {(() => {
                  const chartWidth = 640;
                  const chartHeight = 220;
                  const padX = 20;
                  const padY = 16;
                  const plotW = chartWidth - padX * 2;
                  const plotH = chartHeight - padY * 2;
                  const points = salesTrend.map((point, index) => {
                    const x =
                      salesTrend.length > 1 ? padX + (index / (salesTrend.length - 1)) * plotW : chartWidth / 2;
                    const y = padY + (1 - point.sales / maxTrend) * plotH;
                    return { ...point, x, y };
                  });
                  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
                  return (
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-full w-full">
                      <line x1={padX} y1={chartHeight - padY} x2={chartWidth - padX} y2={chartHeight - padY} stroke="currentColor" className="text-slate-300 dark:text-slate-700" />
                      <polyline
                        points={polylinePoints}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary"
                      />
                      {points.map((point) => (
                        <circle
                          key={point.date}
                          cx={point.x}
                          cy={point.y}
                          r="4.5"
                          className="cursor-pointer fill-white stroke-primary transition hover:r-6"
                          strokeWidth="2"
                          onMouseEnter={() => setHoveredTrendPoint(point)}
                          onMouseLeave={() => setHoveredTrendPoint(null)}
                        />
                      ))}
                    </svg>
                  );
                })()}
                {hoveredTrendPoint ? (
                  <div
                    className="pointer-events-none absolute z-10 rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white shadow"
                    style={{
                      left: `${(hoveredTrendPoint.x / 640) * 100}%`,
                      top: `${(hoveredTrendPoint.y / 220) * 100}%`,
                      transform:
                        hoveredTrendPoint.y < 34 ? "translate(-50%, 12px)" : "translate(-50%, -120%)",
                    }}
                  >
                    <p>{hoveredTrendPoint.date}</p>
                    <p className="font-semibold">{formatCurrency(hoveredTrendPoint.sales)}</p>
                  </div>
                ) : null}
              </div>
              <div className="mt-3 flex justify-between text-[10px] text-slate-500">
                <span>{salesTrend[0]?.date}</span>
                <span>{salesTrend[salesTrend.length - 1]?.date}</span>
              </div>
            </div>
          )}
        </Card>

        <Card className="min-w-0">
          <h3 className="text-base font-semibold">Recent Orders</h3>
          <p className="mt-1 text-sm text-slate-500">Latest customer checkouts.</p>
          {orders.length === 0 ? (
            <EmptyState title="No recent orders" description="Orders will appear here after checkout." />
          ) : (
            <div className="mt-4">
              <Table
                columns={[
                  { key: "id", label: "Order" },
                  { key: "customer", label: "Customer" },
                  { key: "total", label: "Total" },
                ]}
                rows={orders}
                rowKey={(order) => order._id}
                renderRow={(order) => (
                  <>
                    <Td>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/orders?open=${encodeURIComponent(order._id)}`)}
                        className="font-semibold text-primary hover:underline"
                      >
                        #{order._id.slice(-8)}
                      </button>
                    </Td>
                    <Td>{order.userId?.email || "-"}</Td>
                    <Td>{formatCurrency(order.total)}</Td>
                  </>
                )}
              />
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card className="min-w-0">
          <h3 className="text-base font-semibold">Low Stock Alerts</h3>
          <p className="mt-1 text-sm text-slate-500">Products with stock at or below 5 units.</p>
          {(metrics.lowStockProducts || []).length === 0 ? (
            <EmptyState title="No low-stock products" description="Inventory levels look healthy." />
          ) : (
            <div className="mt-4">
              <Table
                columns={[
                  { key: "title", label: "Product" },
                  { key: "category", label: "Category" },
                  { key: "stockQty", label: "Stock Qty" },
                ]}
                rows={metrics.lowStockProducts || []}
                rowKey={(item) => item._id}
                renderRow={(item) => (
                  <>
                    <Td className="font-medium">{item.title}</Td>
                    <Td>{item.category}</Td>
                    <Td>{item.stockQty}</Td>
                  </>
                )}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
