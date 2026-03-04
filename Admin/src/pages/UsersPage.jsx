import { useEffect, useState } from "react";
import { api, consumePrefetchedGet } from "../api";
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
const ROLE_OPTIONS = ["customer", "support", "manager", "admin", "super_admin"];

export const UsersPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "manager" });

  const canManageUsers = ["admin", "super_admin"].includes(user?.role || "");

  const loadUsers = async () => {
    const params = {
      page,
      limit: LIMIT,
      search: search || undefined,
      scope: scope !== "all" ? scope : undefined,
      role: roleFilter !== "all" ? roleFilter : undefined,
    };
    const prefetched = consumePrefetchedGet("/admin/users", { params });
    if (prefetched) {
      setUsers(prefetched.items || []);
      setTotal(prefetched.total || 0);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const response = await api.get("/admin/users", { params });
      setUsers(response.data.items || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, search, scope, roleFilter]);

  const createUser = async (event) => {
    event.preventDefault();
    if (!canManageUsers) return;
    setCreating(true);
    try {
      await api.post("/admin/users", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      showToast({ type: "success", title: "User created successfully" });
      setIsCreateOpen(false);
      setForm({ name: "", email: "", password: "", role: "manager" });
      await loadUsers();
    } catch (err) {
      showToast({
        type: "error",
        title: "Failed to create user",
        message: err?.response?.data?.message || "Please try again.",
      });
    } finally {
      setCreating(false);
    }
  };

  const updateRole = async (targetUser, nextRole) => {
    if (!canManageUsers) return;
    setUpdatingId(targetUser._id);
    try {
      await api.patch(`/admin/users/${targetUser._id}/role`, { role: nextRole });
      showToast({ type: "success", title: "Role updated" });
      await loadUsers();
    } catch (err) {
      showToast({
        type: "error",
        title: "Unable to update role",
        message: err?.response?.data?.message || "Please try again.",
      });
    } finally {
      setUpdatingId("");
    }
  };

  const deleteUser = async (targetUser) => {
    if (!canManageUsers) return;
    if (!window.confirm(`Delete user ${targetUser.email}?`)) return;
    setDeletingId(targetUser._id);
    try {
      await api.delete(`/admin/users/${targetUser._id}`);
      showToast({ type: "success", title: "User deleted" });
      await loadUsers();
    } catch (err) {
      showToast({
        type: "error",
        title: "Unable to delete user",
        message: err?.response?.data?.message || "Please try again.",
      });
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        description="View customers and manage system users (support, manager, admin, super_admin)."
        action={
          canManageUsers ? (
            <Button onClick={() => setIsCreateOpen(true)}>Add User</Button>
          ) : null
        }
      />

      <Toolbar>
        <Input
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          placeholder="Search by name or email"
          className="max-w-sm"
          aria-label="Search users"
        />
        <Select value={scope} onChange={(event) => { setPage(1); setScope(event.target.value); }} className="max-w-xs" aria-label="Filter by scope">
          <option value="all">All Users</option>
          <option value="customers">Customers</option>
          <option value="system">System Users</option>
        </Select>
        <Select value={roleFilter} onChange={(event) => { setPage(1); setRoleFilter(event.target.value); }} className="max-w-xs" aria-label="Filter by role">
          <option value="all">All Roles</option>
          {ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </Select>
      </Toolbar>

      {error ? <ErrorState message={error} action={<Button onClick={loadUsers}>Retry</Button>} /> : null}
      {loading ? <LoadingState label="Loading users..." /> : null}
      {!loading && !error && users.length === 0 ? (
        <EmptyState title="No users found" description="Try changing filters or create a new system user." />
      ) : null}

      {!loading && !error && users.length > 0 ? (
        <>
          <Table
            columns={[
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "role", label: "Role" },
              { key: "joined", label: "Joined" },
              { key: "actions", label: "Actions" },
            ]}
            rows={users}
            rowKey={(item) => item._id}
            renderRow={(item) => (
              <>
                <Td className="font-medium">{item.name}</Td>
                <Td>{item.email}</Td>
                <Td>
                  <Badge tone={item.role === "customer" ? "default" : "info"}>{item.role}</Badge>
                </Td>
                <Td>{new Date(item.createdAt).toLocaleDateString()}</Td>
                <Td>
                  {canManageUsers ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={item.role}
                        onChange={(event) => updateRole(item, event.target.value)}
                        disabled={updatingId === item._id || deletingId === item._id || item._id === user?.id}
                        className="min-w-[140px]"
                        aria-label={`Change role for ${item.email}`}
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </Select>
                      <Button
                        variant="danger"
                        onClick={() => deleteUser(item)}
                        disabled={deletingId === item._id || updatingId === item._id || item._id === user?.id}
                      >
                        {deletingId === item._id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
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
        title="Create System User"
        fullScreenOnMobile={false}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" form="create-user-form" loading={creating}>
              Create User
            </Button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={createUser} className="grid gap-3">
          <Field label="Full Name" htmlFor="user-name">
            <Input
              id="user-name"
              required
              minLength={2}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </Field>
          <Field label="Email" htmlFor="user-email">
            <Input
              id="user-email"
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </Field>
          <Field label="Password" htmlFor="user-password" helperText="Minimum 6 characters">
            <Input
              id="user-password"
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </Field>
          <Field label="Role" htmlFor="user-role">
            <Select
              id="user-role"
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </Modal>
    </div>
  );
};
