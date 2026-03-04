import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { Button } from "../components/ui/Button";
import { Drawer } from "../components/ui/Drawer";
import { Input, Select } from "../components/ui/Field";
import { PageHeader, Toolbar } from "../components/ui/PageHeader";
import { Pagination } from "../components/ui/Pagination";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { Badge } from "../components/ui/Surface";
import { Table, Td } from "../components/ui/Table";
import { useToast } from "../context/ToastContext";

const statuses = ["placed", "processing", "shipped", "delivered", "cancelled"];
const LIMIT = 12;

const toneFromStatus = (status) => {
  if (status === "delivered") return "success";
  if (status === "cancelled") return "danger";
  if (status === "shipped") return "info";
  return "warning";
};

export const OrdersPage = () => {
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/admin/orders", {
        params: {
          page,
          limit: LIMIT,
          status: statusFilter || undefined,
        },
      });
      setOrders(response.data.items || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to load orders";
      setError(message);
      showToast({ type: "error", title: "Unable to load orders", message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter]);

  const filteredOrders = useMemo(() => {
    if (!search) return orders;
    const term = search.toLowerCase();
    return orders.filter(
      (order) =>
        order._id.toLowerCase().includes(term) ||
        String(order.userId?.email || "")
          .toLowerCase()
          .includes(term)
    );
  }, [orders, search]);

  const updateStatus = async (orderId, status) => {
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status });
      showToast({ type: "success", title: "Order status updated" });
      await loadOrders();
    } catch (err) {
      showToast({ type: "error", title: "Failed to update status", message: err?.response?.data?.message || "Try again." });
    }
  };

  return (
    <div>
      <PageHeader title="Orders" description="Track order lifecycle and fulfillment statuses." />

      <Toolbar onOpenFilters={() => setFilterDrawerOpen(true)}>
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by order id or customer" className="max-w-sm" />
        <Select
          value={statusFilter}
          onChange={(event) => {
            setPage(1);
            setStatusFilter(event.target.value);
          }}
          className="max-w-xs"
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      </Toolbar>

      <Drawer isOpen={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)} title="Order Filters" side="right">
        <div className="space-y-3">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders" />
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All Statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
          <Button className="w-full" onClick={() => setFilterDrawerOpen(false)}>
            Apply
          </Button>
        </div>
      </Drawer>

      {error ? <ErrorState message={error} action={<Button onClick={loadOrders}>Retry</Button>} /> : null}
      {loading ? <LoadingState label="Loading orders..." /> : null}
      {!loading && !error && filteredOrders.length === 0 ? <EmptyState title="No orders found" description="Try changing your filters." /> : null}

      {!loading && !error && filteredOrders.length > 0 ? (
        <>
          <Table
            columns={[
              { key: "id", label: "Order ID" },
              { key: "customer", label: "Customer" },
              { key: "total", label: "Total" },
              { key: "status", label: "Status" },
              { key: "created", label: "Created" },
            ]}
            rows={filteredOrders}
            rowKey={(order) => order._id}
            renderRow={(order) => (
              <>
                <Td>#{order._id.slice(-8)}</Td>
                <Td>{order.userId?.email || "-"}</Td>
                <Td>KSh {Number(order.total || 0).toFixed(2)}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Badge tone={toneFromStatus(order.status)}>{order.status}</Badge>
                    <Select
                      value={order.status}
                      onChange={(event) => updateStatus(order._id, event.target.value)}
                      className="w-36"
                      aria-label={`Change status for order ${order._id}`}
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Select>
                  </div>
                </Td>
                <Td>{new Date(order.createdAt).toLocaleString()}</Td>
              </>
            )}
          />
          <Pagination page={page} total={total} limit={LIMIT} onPageChange={setPage} />
        </>
      ) : null}
    </div>
  );
};
