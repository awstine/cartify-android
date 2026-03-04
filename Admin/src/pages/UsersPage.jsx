import { useEffect, useState } from "react";
import { api } from "../api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { PageHeader, Toolbar } from "../components/ui/PageHeader";
import { Pagination } from "../components/ui/Pagination";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { Badge } from "../components/ui/Surface";
import { Table, Td } from "../components/ui/Table";

const LIMIT = 12;

export const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/admin/users", {
        params: { page, limit: LIMIT, search: search || undefined },
      });
      setUsers(response.data.items || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, search]);

  return (
    <div>
      <PageHeader title="Customers" description="View customer accounts and onboarding trends." />
      <Toolbar>
        <Input
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          placeholder="Search by name or email"
          className="max-w-sm"
          aria-label="Search customers"
        />
      </Toolbar>

      {error ? <ErrorState message={error} action={<Button onClick={loadUsers}>Retry</Button>} /> : null}
      {loading ? <LoadingState label="Loading customers..." /> : null}
      {!loading && !error && users.length === 0 ? (
        <EmptyState title="No customers found" description="Customers will appear here when they sign up." />
      ) : null}

      {!loading && !error && users.length > 0 ? (
        <>
          <Table
            columns={[
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "role", label: "Role" },
              { key: "joined", label: "Joined" },
            ]}
            rows={users}
            rowKey={(user) => user._id}
            renderRow={(user) => (
              <>
                <Td className="font-medium">{user.name}</Td>
                <Td>{user.email}</Td>
                <Td>
                  <Badge tone={user.role === "admin" ? "info" : "default"}>{user.role}</Badge>
                </Td>
                <Td>{new Date(user.createdAt).toLocaleDateString()}</Td>
              </>
            )}
          />
          <Pagination page={page} total={total} limit={LIMIT} onPageChange={setPage} />
        </>
      ) : null}
    </div>
  );
};
