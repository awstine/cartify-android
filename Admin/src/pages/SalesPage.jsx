import { useEffect, useState } from "react";
import { api } from "../api";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { Card } from "../components/ui/Surface";
import { Table, Td } from "../components/ui/Table";

const money = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(value || 0);

export const SalesPage = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/admin/sales");
      setReport(response.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load sales report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  if (error) return <ErrorState message={error} action={<Button onClick={loadReport}>Retry</Button>} />;
  if (loading) return <LoadingState label="Loading sales report..." />;
  if (!report) return <EmptyState title="No sales report" description="Try again later." />;

  return (
    <div>
      <PageHeader title="Sales" description="Revenue trends, order volume, and top-performing products." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase text-slate-500">Gross Sales</p>
          <p className="mt-2 text-2xl font-bold">{money(report.summary.grossSales)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Order Count</p>
          <p className="mt-2 text-2xl font-bold">{report.summary.orderCount}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Average Order Value</p>
          <p className="mt-2 text-2xl font-bold">{money(report.summary.avgOrderValue)}</p>
        </Card>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-lg font-semibold">Top Products</h3>
        {(report.topProducts || []).length === 0 ? (
          <EmptyState title="No sales yet" description="Top products will appear when orders are placed." />
        ) : (
          <Table
            columns={[
              { key: "title", label: "Product" },
              { key: "quantity", label: "Units Sold" },
              { key: "revenue", label: "Revenue" },
            ]}
            rows={report.topProducts || []}
            rowKey={(item) => item.title}
            renderRow={(item) => (
              <>
                <Td className="font-medium">{item.title}</Td>
                <Td>{item.quantity}</Td>
                <Td>{money(item.revenue)}</Td>
              </>
            )}
          />
        )}
      </div>
    </div>
  );
};
