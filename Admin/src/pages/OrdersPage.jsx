import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { Button } from "../components/ui/Button";
import { Drawer } from "../components/ui/Drawer";
import { Input, Select } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
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
  const [selectedOrder, setSelectedOrder] = useState(null);

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
              { key: "details", label: "Details", className: "text-right" },
            ]}
            rows={filteredOrders}
            rowKey={(order) => order._id}
            renderRow={(order) => (
              <>
                <Td>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="font-semibold text-primary hover:underline"
                  >
                    #{order._id.slice(-8)}
                  </button>
                </Td>
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
                <Td className="text-right">
                  <Button variant="secondary" className="px-3 py-1.5" onClick={() => setSelectedOrder(order)}>
                    View
                  </Button>
                </Td>
              </>
            )}
          />
          <Pagination page={page} total={total} limit={LIMIT} onPageChange={setPage} />
        </>
      ) : null}

      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={`Order #${selectedOrder?._id?.slice(-8) || ""} Details`}
        footer={
          <Button variant="secondary" onClick={() => setSelectedOrder(null)}>
            Close
          </Button>
        }
      >
        {selectedOrder ? (
          <div className="space-y-5">
            <div className="grid gap-3 rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800 md:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Customer Name</p>
                <p className="font-medium">{selectedOrder.userId?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Customer Email</p>
                <p className="font-medium">{selectedOrder.userId?.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Order Date</p>
                <p className="font-medium">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <Badge tone={toneFromStatus(selectedOrder.status)}>{selectedOrder.status}</Badge>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">Ordered Products</h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/60">
                    <tr>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2">Price</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOrder.items || []).map((item, index) => (
                      <tr key={`${item.title}-${index}`} className="border-t border-slate-200 dark:border-slate-800">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="h-10 w-10 rounded-md border border-slate-200 object-cover dark:border-slate-700"
                              />
                            ) : null}
                            <span>{item.title}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">KSh {Number(item.price || 0).toFixed(2)}</td>
                        <td className="px-3 py-2">{item.quantity}</td>
                        <td className="px-3 py-2">KSh {Number(item.lineTotal || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="ml-auto max-w-xs space-y-1 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>KSh {Number(selectedOrder.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Shipping</span>
                <span>KSh {Number(selectedOrder.shipping || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tax</span>
                <span>KSh {Number(selectedOrder.tax || 0).toFixed(2)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-semibold dark:border-slate-700">
                <span>Total</span>
                <span>KSh {Number(selectedOrder.total || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
