import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, consumePrefetchedGet } from "../api";
import { CategoryModal } from "../components/CategoryModal";
import { Button } from "../components/ui/Button";
import { Drawer } from "../components/ui/Drawer";
import { Input, Select } from "../components/ui/Field";
import { PageHeader, Toolbar } from "../components/ui/PageHeader";
import { RowActions } from "../components/ui/RowActions";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { Badge } from "../components/ui/Surface";
import { Table, Td } from "../components/ui/Table";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../auth";

export const CategoriesPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const canManageCategories = ["admin", "super_admin"].includes(user?.role || "");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = async () => {
    const prefetched = consumePrefetchedGet("/admin/categories");
    if (prefetched) {
      setCategories(prefetched || []);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const response = await api.get("/admin/categories");
      setCategories(response.data || []);
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to load categories";
      setError(message);
      showToast({ type: "error", title: "Unable to load categories", message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    const base = categories.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
    return [...base].sort((a, b) => {
      if (sortBy === "name_desc") return b.name.localeCompare(a.name);
      return a.name.localeCompare(b.name);
    });
  }, [categories, search, sortBy]);

  const handleModalSubmit = async (values) => {
    setSubmitting(true);
    const payload = {
      name: values.name,
      description: values.description || "",
      imageUrl: values.imageUrl || "",
      parentId: values.parentId || null,
    };
    try {
      if (editingCategory?._id) {
        await api.put(`/admin/categories/${editingCategory._id}`, payload);
        showToast({ type: "success", title: "Category updated" });
      } else {
        await api.post("/admin/categories", payload);
        showToast({ type: "success", title: "Category created" });
      }
      setIsModalOpen(false);
      setEditingCategory(null);
      await loadCategories();
    } catch (err) {
      showToast({ type: "error", title: "Failed to save category", message: err?.response?.data?.message || "Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const categoryOptions = useMemo(() => {
    const byId = new Map(categories.map((item) => [item._id, item]));
    return categories
      .filter((item) => item._id !== editingCategory?._id)
      .map((item) => {
        const parent = item.parentId && typeof item.parentId === "object" ? item.parentId : byId.get(item.parentId);
        return {
          value: item._id,
          label: parent?.name ? `${parent.name} / ${item.name}` : item.name,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categories, editingCategory?._id]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await api.delete(`/admin/categories/${id}`);
      showToast({ type: "success", title: "Category deleted" });
      await loadCategories();
    } catch (err) {
      showToast({ type: "error", title: "Failed to delete category", message: err?.response?.data?.message || "Try again." });
    }
  };

  return (
    <div>
      <PageHeader
        title="Categories"
        description={
          canManageCategories
            ? "Organize catalog structure and parent relationships."
            : "Categories are managed by admins. You can only view and use them when creating products."
        }
        action={
          canManageCategories ? (
            <Button
              onClick={() => {
                setEditingCategory(null);
                setIsModalOpen(true);
              }}
            >
              Add New
            </Button>
          ) : null
        }
      />
      <Toolbar onOpenFilters={() => setIsFilterOpen(true)}>
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search categories" aria-label="Search categories" className="max-w-sm" />
        <Select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort categories" className="max-w-xs">
          <option value="name_asc">Name A-Z</option>
          <option value="name_desc">Name Z-A</option>
        </Select>
      </Toolbar>

      <Drawer isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Category Filters" side="right">
        <div className="space-y-3">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search categories" />
          <Select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
          </Select>
          <Button className="w-full" onClick={() => setIsFilterOpen(false)}>
            Apply
          </Button>
        </div>
      </Drawer>

      {error ? <ErrorState message={error} action={<Button onClick={loadCategories}>Retry</Button>} /> : null}
      {loading ? <LoadingState label="Loading categories..." /> : null}
      {!loading && !error && filteredCategories.length === 0 ? (
        <EmptyState
          title="No categories available"
          description={
            canManageCategories
              ? "Create categories to improve product discoverability."
              : "No categories have been created by admins yet."
          }
          action={canManageCategories ? <Button onClick={() => setIsModalOpen(true)}>Add Category</Button> : null}
        />
      ) : null}

      {!loading && !error && filteredCategories.length > 0 ? (
        <Table
          columns={[
            { key: "image", label: "Image" },
            { key: "name", label: "Name" },
            { key: "parent", label: "Parent" },
            { key: "slug", label: "Slug" },
            { key: "status", label: "Status" },
            { key: "actions", label: "Actions", className: "text-right" },
          ]}
          rows={filteredCategories}
          rowKey={(category) => category._id}
          renderRow={(category) => (
            <>
              <Td>
                {category.imageUrl ? (
                  <img src={category.imageUrl} alt={category.name} className="h-12 w-12 rounded-lg border border-slate-200 object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-xs text-slate-500">N/A</div>
                )}
              </Td>
              <Td>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/products?category=${encodeURIComponent(category.slug)}`)}
                  className="text-left"
                >
                  <p className="font-medium text-primary hover:underline">{category.name}</p>
                </button>
                <p className="text-xs text-slate-500">{category.description || "No description"}</p>
              </Td>
              <Td>{category.parentId?.name || "None"}</Td>
              <Td>{category.slug}</Td>
              <Td>
                <Badge tone={category.parentId ? "info" : "success"}>{category.parentId ? "Subcategory" : "Category"}</Badge>
              </Td>
              <Td className="text-right">
                {canManageCategories ? (
                  <div className="flex justify-end">
                    <RowActions
                      onEdit={() => {
                        setEditingCategory(category);
                        setIsModalOpen(true);
                      }}
                      onDelete={() => handleDelete(category._id)}
                    />
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">View only</span>
                )}
              </Td>
            </>
          )}
        />
      ) : null}

      {canManageCategories ? (
        <CategoryModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCategory(null);
          }}
          onSubmit={handleModalSubmit}
          initialValues={editingCategory}
          loading={submitting}
          categoryOptions={categoryOptions}
        />
      ) : null}
    </div>
  );
};
