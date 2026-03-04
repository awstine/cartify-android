import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ProductModal } from "../components/ProductModal";
import { Button } from "../components/ui/Button";
import { Drawer } from "../components/ui/Drawer";
import { Input, Select } from "../components/ui/Field";
import { Pagination } from "../components/ui/Pagination";
import { PageHeader, Toolbar } from "../components/ui/PageHeader";
import { RowActions } from "../components/ui/RowActions";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { Badge } from "../components/ui/Surface";
import { Table, Td } from "../components/ui/Table";
import { useToast } from "../context/ToastContext";
import { api, consumePrefetchedGet } from "../api";

const LIMIT = 12;

export const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const fetchProducts = async () => {
    const params = {
      page,
      limit: LIMIT,
      search: search || undefined,
      category: category || undefined,
      stock: stockFilter !== "all" ? stockFilter : undefined,
    };
    const prefetched = consumePrefetchedGet("/admin/products", { params });
    if (prefetched) {
      setProducts(prefetched.items || []);
      setTotal(prefetched.total || 0);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const response = await api.get("/admin/products", { params });
      setProducts(response.data.items || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to load products";
      setError(message);
      showToast({ type: "error", title: "Unable to load products", message });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const prefetched = consumePrefetchedGet("/admin/categories");
      const data = prefetched || (await api.get("/admin/categories")).data || [];
      const mapped = (data || []).map((category) => ({
        value: category.slug,
        label: category.name,
      }));
      setCategoryOptions(mapped);
    } catch (_err) {
      setCategoryOptions([]);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search, category, stockFilter]);

  useEffect(() => {
    const categoryFromUrl = searchParams.get("category") || "";
    if (categoryFromUrl !== category) {
      setCategory(categoryFromUrl);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const categories = useMemo(
    () => [...new Set(categoryOptions.map((option) => option.value).filter(Boolean))],
    [categoryOptions]
  );

  const outOfStockCount = useMemo(() => products.filter((product) => Number(product.stockQty || 0) === 0).length, [products]);

  const viewProducts = useMemo(() => {
    const cloned = [...products];
    if (sortBy === "price_asc") cloned.sort((a, b) => Number(a.price) - Number(b.price));
    if (sortBy === "price_desc") cloned.sort((a, b) => Number(b.price) - Number(a.price));
    if (sortBy === "name_asc") cloned.sort((a, b) => String(a.title).localeCompare(String(b.title)));
    return cloned;
  }, [products, sortBy]);

  const handleModalSubmit = async (values) => {
    setSubmitting(true);
    let variants = [];
    if (values.variantsJson && String(values.variantsJson).trim()) {
      try {
        const parsed = JSON.parse(values.variantsJson);
        if (Array.isArray(parsed)) variants = parsed;
      } catch (_err) {
        showToast({ type: "error", title: "Variants JSON is invalid" });
        setSubmitting(false);
        return;
      }
    }
    const payload = {
      title: values.title,
      price: Number(values.price),
      costPrice: Number(values.costPrice || 0),
      salePrice: Number(values.salePrice || 0),
      stockQty: Number(values.stockQty || 0),
      status: values.status || "active",
      category: values.category,
      description: values.description || "",
      imageUrl: values.imageUrl || "",
      images: Array.isArray(values.images) ? values.images.slice(0, 4) : values.imageUrl ? [values.imageUrl] : [],
      variants,
    };
    try {
      if (editingProduct?._id) {
        await api.put(`/admin/products/${editingProduct._id}`, payload);
        showToast({ type: "success", title: "Product updated successfully" });
      } else {
        await api.post("/admin/products", payload);
        showToast({ type: "success", title: "Product created successfully" });
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      await fetchProducts();
    } catch (err) {
      showToast({ type: "error", title: "Unable to save product", message: err?.response?.data?.message || "Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await api.delete(`/admin/products/${productId}`);
      showToast({ type: "success", title: "Product removed" });
      await fetchProducts();
    } catch (err) {
      showToast({ type: "error", title: "Failed to delete product", message: err?.response?.data?.message || "Try again." });
    }
  };

  const setCategoryFilter = (value) => {
    setPage(1);
    setCategory(value);
    const next = new URLSearchParams(searchParams);
    if (value) next.set("category", value);
    else next.delete("category");
    setSearchParams(next, { replace: true });
  };

  return (
    <div>
      <PageHeader
        title="Products"
        description={`Manage product catalog, pricing, and statuses. Out of stock on this view: ${outOfStockCount}`}
        action={
          <Button
            onClick={() => {
              setEditingProduct(null);
              setIsModalOpen(true);
            }}
          >
            Add New
          </Button>
        }
      />

      <Toolbar onOpenFilters={() => setIsFilterOpen(true)}>
        <Input
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          placeholder="Search products"
          aria-label="Search products"
          className="max-w-sm"
        />
        <Select
          value={category}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Filter by category"
          className="max-w-xs"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </Select>
        <Select value={stockFilter} onChange={(event) => { setPage(1); setStockFilter(event.target.value); }} aria-label="Filter by stock" className="max-w-xs">
          <option value="all">All Stock</option>
          <option value="out">Out of Stock</option>
          <option value="low">Low Stock (1-5)</option>
          <option value="in">In Stock</option>
        </Select>
        <Select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort products" className="max-w-xs">
          <option value="newest">Newest</option>
          <option value="name_asc">Name A-Z</option>
          <option value="price_asc">Price Low-High</option>
          <option value="price_desc">Price High-Low</option>
        </Select>
      </Toolbar>

      <Drawer isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Product Filters" side="right">
        <div className="space-y-3">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" aria-label="Search products mobile" />
          <Select value={category} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by category mobile">
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </Select>
          <Select value={stockFilter} onChange={(event) => { setPage(1); setStockFilter(event.target.value); }} aria-label="Filter by stock mobile">
            <option value="all">All Stock</option>
            <option value="out">Out of Stock</option>
            <option value="low">Low Stock (1-5)</option>
            <option value="in">In Stock</option>
          </Select>
          <Select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort products mobile">
            <option value="newest">Newest</option>
            <option value="name_asc">Name A-Z</option>
            <option value="price_asc">Price Low-High</option>
            <option value="price_desc">Price High-Low</option>
          </Select>
          <Button className="w-full" onClick={() => setIsFilterOpen(false)}>
            Apply
          </Button>
        </div>
      </Drawer>

      {error ? <ErrorState message={error} action={<Button onClick={fetchProducts}>Retry</Button>} /> : null}
      {loading ? <LoadingState label="Loading products..." /> : null}
      {!loading && !error && products.length === 0 ? (
        <EmptyState
          title="No products found"
          description="Create your first product to start selling."
          action={
            <Button onClick={() => setIsModalOpen(true)} type="button">
              Add Product
            </Button>
          }
        />
      ) : null}

      {!loading && !error && products.length > 0 ? (
        <>
          <Table
            columns={[
              { key: "title", label: "Product" },
              { key: "category", label: "Category" },
              { key: "price", label: "Price" },
              { key: "cost", label: "Cost" },
              { key: "stockQty", label: "Stock Qty" },
              { key: "status", label: "Status" },
              { key: "actions", label: "Actions", className: "text-right" },
            ]}
            rows={viewProducts}
            rowKey={(product) => product._id}
            renderRow={(product) => (
              <>
                <Td>
                  <div className="flex items-center gap-3">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="h-12 w-12 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800">
                        N/A
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{product.title}</p>
                      <p className="text-xs text-slate-500">{product.description || "No description provided"}</p>
                    </div>
                  </div>
                </Td>
                <Td>{product.category}</Td>
                <Td>KSh {Number(product.price || 0).toFixed(2)}</Td>
                <Td>KSh {Number(product.costPrice || 0).toFixed(2)}</Td>
                <Td>{Number(product.stockQty || 0)}</Td>
                <Td>
                  {Number(product.stockQty || 0) === 0 ? (
                    <Badge tone="danger">Out of stock</Badge>
                  ) : Number(product.stockQty || 0) <= 5 ? (
                    <Badge tone="warning">Low stock</Badge>
                  ) : (
                    <Badge tone={product.status === "draft" ? "default" : "success"}>
                      {product.status === "draft" ? "Draft" : "Active"}
                    </Badge>
                  )}
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end">
                    <RowActions
                      onView={() => showToast({ title: product.title, message: "Viewing details in table." })}
                      onEdit={() => {
                        setEditingProduct(product);
                        setIsModalOpen(true);
                      }}
                      onDelete={() => handleDelete(product._id)}
                    />
                  </div>
                </Td>
              </>
            )}
          />
          <Pagination page={page} total={total} limit={LIMIT} onPageChange={setPage} />
        </>
      ) : null}

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        onSubmit={handleModalSubmit}
        initialValues={editingProduct}
        loading={submitting}
        categories={categoryOptions}
      />
    </div>
  );
};
