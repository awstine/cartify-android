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

  if (loading) return <LoadingState label="Loading orders..." />;
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
            </>
          )}
        />
      </div>
    </div>
  );
};
