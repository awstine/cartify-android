import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, consumePrefetchedGet } from "../api";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { Badge } from "../components/ui/Surface";
import { Table, Td } from "../components/ui/Table";

const formatMoney = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(Number(value || 0));

export const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyOrderId, setBusyOrderId] = useState("");

  const loadOrders = async () => {
    const prefetched = consumePrefetchedGet("/orders");
    if (prefetched) {
      setOrders(prefetched || []);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const response = await api.get("/orders");
      setOrders(response.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const requestReturnRefund = async (order) => {
    const type = window.prompt("Type 'return' or 'refund':", "refund");
    if (!type || !["return", "refund"].includes(type.trim().toLowerCase())) return;
    const reason = window.prompt("Reason for request:", "");
    if (!reason || reason.trim().length < 3) return;
    const details = window.prompt("More details (optional):", "") || "";
    setBusyOrderId(order._id);
    try {
      await api.patch(`/orders/${order._id}/return-refund-request`, {
        type: type.trim().toLowerCase(),
        reason: reason.trim(),
        details: details.trim(),
      });
      await loadOrders();
    } catch (_err) {
      // Error state already handled by page reload action.
    } finally {
      setBusyOrderId("");
    }
  };

  if (loading) return <LoadingState label="Loading orders..." showSpinner={false} />;
  if (error) return <ErrorState message={error} action={<Button onClick={loadOrders}>Retry</Button>} />;
  if (orders.length === 0) {
    return <EmptyState title="No orders yet" description="Place your first order from the shop." action={<Link to="/"><Button>Go to Shop</Button></Link>} />;
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-slate-900">My Orders</h1>
      <p className="mt-1 text-sm text-slate-600">Track your order history and statuses.</p>
      <div className="mt-5">
        <Table
          columns={[
            { key: "id", label: "Order ID" },
            { key: "date", label: "Date" },
            { key: "items", label: "Items" },
            { key: "total", label: "Total" },
            { key: "status", label: "Status" },
            { key: "support", label: "Support" },
          ]}
          rows={orders}
          rowKey={(order) => order._id}
          renderRow={(order) => (
            <>
              <Td>#{String(order._id).slice(-8)}</Td>
              <Td>{new Date(order.createdAt).toLocaleDateString()}</Td>
              <Td>{(order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</Td>
              <Td>{formatMoney(order.total)}</Td>
              <Td>
                <Badge tone={order.status === "delivered" ? "success" : order.status === "cancelled" ? "danger" : "info"}>
                  {order.status}
                </Badge>
              </Td>
              <Td>
                {order.status === "delivered" ? (
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      loading={busyOrderId === order._id}
                      onClick={() => requestReturnRefund(order)}
                    >
                      {order.returnRefundRequest?.requested ? "Update Request" : "Request Return/Refund"}
                    </Button>
                    {order.returnRefundRequest?.requested ? (
                      <p className="text-[11px] text-slate-500">
                        {order.returnRefundRequest.type} - {order.returnRefundRequest.status}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">Available after delivery</span>
                )}
              </Td>
            </>
          )}
        />
      </div>
      <div className="mt-4">
        <Link to="/help-safety" className="text-sm text-primary underline underline-offset-2">
          Need help? Open Help & Safety
        </Link>
      </div>
    </div>
  );
};
