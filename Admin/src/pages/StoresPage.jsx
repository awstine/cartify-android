import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, consumePrefetchedGet } from "../api";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";

export const StoresPage = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStores = async () => {
    const prefetched = consumePrefetchedGet("/stores");
    if (prefetched) {
      setStores(prefetched || []);
      setLoading(false);
    } else {
      setLoading(true);
    }

    setError("");
    try {
      const response = await api.get("/stores");
      setStores(response.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load stores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  if (loading) return <LoadingState label="Loading stores..." showSpinner={false} />;
  if (error) return <ErrorState message={error} action={<Button onClick={loadStores}>Retry</Button>} />;
  if (stores.length === 0) {
    return <EmptyState title="No stores found" description="No active stores are available right now." />;
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-slate-900">Stores</h1>
      <p className="mt-1 text-sm text-slate-600">Open a store to browse products in store mode.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((store) => (
          <article
            key={store._id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/store/${store.slug}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate(`/store/${store.slug}`);
              }
            }}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
          >
            <div className="aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
              {store.logoUrl ? (
                <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">No logo</div>
              )}
            </div>
            <h2 className="mt-3 text-lg font-semibold text-slate-900">{store.name}</h2>
            <p className="mt-1 min-h-10 text-sm text-slate-600">{store.description || "No store description yet."}</p>
            <Button className="mt-3 w-full">Open Store</Button>
          </article>
        ))}
      </div>
    </div>
  );
};

