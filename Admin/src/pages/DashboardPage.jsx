import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { Card } from "../components/ui/Surface";
import { Table, Td } from "../components/ui/Table";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(value || 0);

export const DashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
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

  const salesTrend = Array.isArray(metrics.salesTrend) ? metrics.salesTrend : [];
  const maxTrend = Math.max(...salesTrend.map((point) => Number(point.sales || 0)), 1);

  return (
    <div>
      <PageHeader title="Dashboard Overview" description="Live KPIs, sales snapshot, and recent order activity." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-2 font-heading text-2xl font-bold text-slate-900 dark:text-slate-100">{card.value}</p>
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
              <div className="flex h-56 items-end gap-1">
                {salesTrend.map((point) => {
                  const height = Math.max(6, (Number(point.sales || 0) / maxTrend) * 100);
                  return (
                    <div key={point.date} className="group flex flex-1 flex-col items-center">
                      <div className="mb-1 hidden rounded-md bg-primary px-2 py-1 text-[10px] text-white group-hover:block">
                        {formatCurrency(point.sales)}
                      </div>
                      <div
                        className="w-full rounded-t-md bg-primary transition-all duration-500"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  );
                })}
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
                    <Td>#{order._id.slice(-8)}</Td>
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
