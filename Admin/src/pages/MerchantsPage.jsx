import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Button } from "../components/ui/Button";
import { Field, Input, Select } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { PageHeader, Toolbar } from "../components/ui/PageHeader";
import { Pagination } from "../components/ui/Pagination";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { Badge } from "../components/ui/Surface";
import { Table, Td } from "../components/ui/Table";
import { useToast } from "../context/ToastContext";

const LIMIT = 12;

export const MerchantsPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", storeName: "" });

  const canManage = ["admin", "super_admin"].includes(user?.role || "");

  const loadMerchants = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/admin/merchants", { params: { page, limit: LIMIT, search: search || undefined } });
      setItems(response.data.items || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load merchants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMerchants();
  }, [page, search]);

  const createMerchant = async (event) => {
    event.preventDefault();
    if (!canManage) return;
    setCreating(true);
    setCreateError("");
    try {
      await api.post("/admin/merchants", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        storeName: form.storeName.trim(),
      });
      showToast({ type: "success", title: "Merchant created" });
      setIsCreateOpen(false);
      setForm({ name: "", email: "", password: "", storeName: "" });
      await loadMerchants();
    } catch (err) {
      const validationErrors = Array.isArray(err?.response?.data?.errors)
        ? err.response.data.errors.map((item) => item.msg).filter(Boolean).join(", ")
        : "";
      const message = validationErrors || err?.response?.data?.message || "Try again.";
      setCreateError(message);
      showToast({ type: "error", title: "Failed to create merchant", message });
    } finally {
      setCreating(false);
    }
  };

  const updateMerchantStatus = async (merchantId, isActive) => {
    if (!canManage) return;
    setUpdatingId(merchantId);
    try {
      await api.patch(`/admin/merchants/${merchantId}`, { isActive });
      showToast({ type: "success", title: "Merchant updated" });
      await loadMerchants();
    } catch (err) {
      showToast({ type: "error", title: "Failed to update merchant", message: err?.response?.data?.message || "Try again." });
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <div>
      <PageHeader
        title="Merchants"
        description="Manage merchant accounts and store status across the platform."
        action={canManage ? <Button onClick={() => { setCreateError(""); setIsCreateOpen(true); }}>Add Merchant</Button> : null}
      />
      <Toolbar>
        <Input
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          placeholder="Search merchants"
          className="max-w-sm"
        />
      </Toolbar>

      {error ? <ErrorState message={error} action={<Button onClick={loadMerchants}>Retry</Button>} /> : null}
      {loading ? <LoadingState label="Loading merchants..." /> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState title="No merchants found" description="Create the first merchant store to start onboarding vendors." />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <>
          <Table
            columns={[
              { key: "merchant", label: "Merchant" },
              { key: "store", label: "Store" },
              { key: "status", label: "Status" },
              { key: "actions", label: "Actions" },
            ]}
            rows={items}
            rowKey={(item) => item._id}
            renderRow={(item) => (
              <>
                <Td>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.email}</p>
                </Td>
                <Td>
                  <p className="font-medium">{item.store?.name || "N/A"}</p>
                  <p className="text-xs text-slate-500">{item.store?.slug || "-"}</p>
                </Td>
                <Td>
                  <Badge tone={item.store?.isActive ? "success" : "danger"}>{item.store?.isActive ? "Active" : "Suspended"}</Badge>
                </Td>
                <Td>
                  {canManage ? (
                    <Select
                      value={item.store?.isActive ? "active" : "suspended"}
                      onChange={(event) => updateMerchantStatus(item._id, event.target.value === "active")}
                      disabled={updatingId === item._id}
                      className="min-w-[140px]"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </Select>
                  ) : (
                    <span className="text-xs text-slate-500">View only</span>
                  )}
                </Td>
              </>
            )}
          />
          <Pagination page={page} total={total} limit={LIMIT} onPageChange={setPage} />
        </>
      ) : null}

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Merchant"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" form="merchant-form" loading={creating}>
              Create
            </Button>
          </>
        }
      >
        <form id="merchant-form" onSubmit={createMerchant} className="grid gap-3">
          <Field label="Merchant Name" htmlFor="merchant-name">
            <Input id="merchant-name" required value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          </Field>
          <Field label="Email" htmlFor="merchant-email">
            <Input id="merchant-email" type="email" required value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
          </Field>
          <Field label="Password" htmlFor="merchant-password">
            <Input id="merchant-password" type="password" minLength={6} required value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} />
          </Field>
          <Field label="Store Name" htmlFor="merchant-store-name">
            <Input id="merchant-store-name" required value={form.storeName} onChange={(event) => setForm((prev) => ({ ...prev, storeName: event.target.value }))} />
          </Field>
          {createError ? <p className="text-sm text-red-600">{createError}</p> : null}
        </form>
      </Modal>
    </div>
  );
};
