import { useEffect, useState } from "react";
import { api, consumePrefetchedGet } from "../api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { Card } from "../components/ui/Surface";
import { Table, Td } from "../components/ui/Table";

const money = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(value || 0);

export const SalesPage = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const loadReport = async () => {
    const params = {
      from: from || undefined,
      to: to || undefined,
    };
    const prefetched = consumePrefetchedGet("/admin/sales", { params });
    if (prefetched) {
      setReport(prefetched);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const response = await api.get("/admin/sales", { params });
      setReport(response.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load sales report");
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (type) => {
    const response = await api.get(`/admin/sales/export.${type}`, {
      params: { from: from || undefined, to: to || undefined },
      responseType: "blob",
    });
    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `sales-report.${type}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  };

  useEffect(() => {
    loadReport();
  }, [from, to]);

  if (error) return <ErrorState message={error} action={<Button onClick={loadReport}>Retry</Button>} />;
  if (loading) return <LoadingState label="Loading sales report..." />;
  if (!report) return <EmptyState title="No sales report" description="Try again later." />;

  return (
    <div>
      <PageHeader title="Sales" description="Revenue trends, order volume, and top-performing products." />
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
        <div>
          <p className="mb-1 text-xs text-slate-500">From</p>
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-500">To</p>
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setFrom("");
            setTo("");
          }}
        >
          Clear
        </Button>
        <Button
          variant="secondary"
          onClick={() => downloadReport("csv")}
        >
          Export CSV
        </Button>
        <Button
          variant="secondary"
          onClick={() => downloadReport("pdf")}
        >
          Export PDF
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate-500">Gross Sales</p>
          <p className="mt-2 text-lg font-semibold">{money(report.summary.grossSales)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate-500">Order Count</p>
          <p className="mt-2 text-lg font-semibold">{report.summary.orderCount}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate-500">Average Order Value</p>
          <p className="mt-2 text-lg font-semibold">{money(report.summary.avgOrderValue)}</p>
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
