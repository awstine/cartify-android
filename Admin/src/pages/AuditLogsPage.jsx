import { useEffect, useState } from "react";
import { api, consumePrefetchedGet } from "../api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { PageHeader } from "../components/ui/PageHeader";
import { Pagination } from "../components/ui/Pagination";
import { ErrorState, LoadingState } from "../components/ui/States";
import { Table, Td } from "../components/ui/Table";

const LIMIT = 20;

export const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = async () => {
    const params = { page, limit: LIMIT, action: actionFilter || undefined };
    const prefetched = consumePrefetchedGet("/admin/audit-logs", { params });
    if (prefetched) {
      setLogs(prefetched.items || []);
      setTotal(prefetched.total || 0);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const response = await api.get("/admin/audit-logs", { params });
      setLogs(response.data.items || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter]);

  if (error) return <ErrorState message={error} action={<Button onClick={loadLogs}>Retry</Button>} />;
  if (loading) return <LoadingState label="Loading audit logs..." />;

  return (
    <div>
      <PageHeader title="Audit Logs" description="Track admin actions for accountability." />
      <div className="mb-4 max-w-md">
        <Input
          value={actionFilter}
          onChange={(event) => {
            setPage(1);
            setActionFilter(event.target.value);
          }}
          placeholder="Filter by action (e.g. product.update)"
        />
      </div>
      <Table
        columns={[
          { key: "time", label: "Time" },
          { key: "actor", label: "Actor" },
          { key: "action", label: "Action" },
          { key: "entity", label: "Entity" },
          { key: "details", label: "Details" },
        ]}
        rows={logs}
        rowKey={(log) => log._id}
        renderRow={(log) => (
          <>
            <Td>{new Date(log.createdAt).toLocaleString()}</Td>
            <Td>{log.actorEmail}</Td>
            <Td>{log.action}</Td>
            <Td>
              {log.entityType} {log.entityId ? `#${String(log.entityId).slice(-6)}` : ""}
            </Td>
            <Td className="text-xs">{JSON.stringify(log.details || {})}</Td>
          </>
        )}
      />
      <Pagination page={page} total={total} limit={LIMIT} onPageChange={setPage} />
    </div>
  );
};
