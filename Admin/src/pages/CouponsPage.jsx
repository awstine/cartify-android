import { useEffect, useState } from "react";
import { api } from "../api";
import { Button } from "../components/ui/Button";
import { Input, Select } from "../components/ui/Field";
import { PageHeader } from "../components/ui/PageHeader";
import { ErrorState, LoadingState } from "../components/ui/States";
import { Table, Td } from "../components/ui/Table";
import { useToast } from "../context/ToastContext";

const emptyCoupon = {
  code: "",
  description: "",
  discountType: "percent",
  discountValue: "",
  minOrderValue: "",
  maxUses: "",
  isActive: true,
};

export const CouponsPage = () => {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyCoupon);

  const loadCoupons = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/admin/coupons");
      setCoupons(response.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const createCoupon = async (event) => {
    event.preventDefault();
    try {
      await api.post("/admin/coupons", {
        ...form,
        discountValue: Number(form.discountValue || 0),
        minOrderValue: Number(form.minOrderValue || 0),
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
      });
      setForm(emptyCoupon);
      showToast({ type: "success", title: "Coupon created" });
      await loadCoupons();
    } catch (err) {
      showToast({ type: "error", title: "Failed to create coupon", message: err?.response?.data?.message || "Try again." });
    }
  };

  const deleteCoupon = async (id) => {
    if (!window.confirm("Delete this coupon?")) return;
    try {
      await api.delete(`/admin/coupons/${id}`);
      showToast({ type: "success", title: "Coupon deleted" });
      await loadCoupons();
    } catch (err) {
      showToast({ type: "error", title: "Failed to delete coupon", message: err?.response?.data?.message || "Try again." });
    }
  };

  if (error) return <ErrorState message={error} action={<Button onClick={loadCoupons}>Retry</Button>} />;
  if (loading) return <LoadingState label="Loading coupons..." />;

  return (
    <div>
      <PageHeader title="Coupons" description="Create and manage promotional campaigns." />

      <form onSubmit={createCoupon} className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 md:grid-cols-3">
        <Input placeholder="Code" value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} required />
        <Input placeholder="Description" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
        <Select value={form.discountType} onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value }))}>
          <option value="percent">Percent</option>
          <option value="fixed">Fixed</option>
        </Select>
        <Input type="number" step="0.01" min="0" placeholder="Discount Value" value={form.discountValue} onChange={(e) => setForm((prev) => ({ ...prev, discountValue: e.target.value }))} required />
        <Input type="number" step="0.01" min="0" placeholder="Min Order Value" value={form.minOrderValue} onChange={(e) => setForm((prev) => ({ ...prev, minOrderValue: e.target.value }))} />
        <Input type="number" min="1" placeholder="Max Uses (optional)" value={form.maxUses} onChange={(e) => setForm((prev) => ({ ...prev, maxUses: e.target.value }))} />
        <Button type="submit" className="md:col-span-3 w-fit">
          Add Coupon
        </Button>
      </form>

      <Table
        columns={[
          { key: "code", label: "Code" },
          { key: "type", label: "Type" },
          { key: "discount", label: "Discount" },
          { key: "usage", label: "Usage" },
          { key: "status", label: "Status" },
          { key: "actions", label: "Actions", className: "text-right" },
        ]}
        rows={coupons}
        rowKey={(coupon) => coupon._id}
        renderRow={(coupon) => (
          <>
            <Td className="font-medium">{coupon.code}</Td>
            <Td>{coupon.discountType}</Td>
            <Td>{coupon.discountType === "percent" ? `${coupon.discountValue}%` : `KSh ${Number(coupon.discountValue).toFixed(2)}`}</Td>
            <Td>
              {coupon.usesCount}
              {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
            </Td>
            <Td>{coupon.isActive ? "Active" : "Inactive"}</Td>
            <Td className="text-right">
              <Button variant="danger" className="px-3 py-1.5" onClick={() => deleteCoupon(coupon._id)}>
                Delete
              </Button>
            </Td>
          </>
        )}
      />
    </div>
  );
};
