import { useEffect, useState } from "react";
import { api } from "../api";
import { Button } from "../components/ui/Button";
import { Field, Select, Textarea } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { PageHeader, Toolbar } from "../components/ui/PageHeader";
import { Pagination } from "../components/ui/Pagination";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { Badge } from "../components/ui/Surface";
import { Table, Td } from "../components/ui/Table";
import { useToast } from "../context/ToastContext";

const LIMIT = 12;
const STATUS_OPTIONS = ["open", "in_review", "resolved", "rejected"];

export const DisputesPage = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ status: "open", resolutionNote: "" });

  const loadDisputes = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/admin/disputes", {
        params: {
          page,
          limit: LIMIT,
          status: statusFilter !== "all" ? statusFilter : undefined,
        },
      });
      setItems(response.data.items || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load disputes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, [page, statusFilter]);

  const openEdit = (item) => {
    setEditing(item);
    setForm({ status: item.status || "open", resolutionNote: item.resolutionNote || "" });
  };

  const saveDispute = async (event) => {
    event.preventDefault();
    if (!editing?._id) return;
    setSaving(true);
    try {
      await api.patch(`/admin/disputes/${editing._id}`, form);
      showToast({ type: "success", title: "Dispute updated" });
      setEditing(null);
      await loadDisputes();
    } catch (err) {
      showToast({ type: "error", title: "Failed to update dispute", message: err?.response?.data?.message || "Try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Disputes" description="Review and resolve merchant/customer order disputes." />
      <Toolbar>
        <Select
          value={statusFilter}
          onChange={(event) => {
            setPage(1);
            setStatusFilter(event.target.value);
          }}
          className="max-w-xs"
        >
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      </Toolbar>

      {error ? <ErrorState message={error} action={<Button onClick={loadDisputes}>Retry</Button>} /> : null}
      {loading ? <LoadingState label="Loading disputes..." /> : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState title="No disputes found" description="Disputes raised by customers will appear here." />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <>
          <Table
            columns={[
              { key: "order", label: "Order" },
              { key: "customer", label: "Customer" },
              { key: "reason", label: "Reason" },
              { key: "status", label: "Status" },
              { key: "actions", label: "Actions" },
            ]}
            rows={items}
            rowKey={(item) => item._id}
            renderRow={(item) => (
              <>
                <Td>
                  <p className="font-medium">#{String(item.orderId?._id || "").slice(-8)}</p>
                  <p className="text-xs text-slate-500">KSh {Number(item.orderId?.total || 0).toFixed(2)}</p>
                </Td>
                <Td>
                  <p className="font-medium">{item.customerUserId?.name || "Customer"}</p>
                  <p className="text-xs text-slate-500">{item.customerUserId?.email || "-"}</p>
                </Td>
                <Td>
                  <p className="font-medium">{item.reason}</p>
                  <p className="line-clamp-2 text-xs text-slate-500">{item.message || "No details provided"}</p>
                </Td>
                <Td>
                  <Badge tone={item.status === "resolved" ? "success" : item.status === "rejected" ? "danger" : "info"}>{item.status}</Badge>
                </Td>
                <Td>
                  <Button variant="secondary" onClick={() => openEdit(item)}>
                    Update
                  </Button>
                </Td>
              </>
            )}
          />
          <Pagination page={page} total={total} limit={LIMIT} onPageChange={setPage} />
        </>
      ) : null}

      <Modal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Update Dispute"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="dispute-form" loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <form id="dispute-form" onSubmit={saveDispute} className="grid gap-3">
          <Field label="Status" htmlFor="dispute-status">
            <Select id="dispute-status" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Resolution Note" htmlFor="dispute-note">
            <Textarea id="dispute-note" rows={4} value={form.resolutionNote} onChange={(event) => setForm((prev) => ({ ...prev, resolutionNote: event.target.value }))} />
          </Field>
        </form>
      </Modal>
    </div>
  );
};

