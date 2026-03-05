import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { resolveStoreSlugFromLocation, withStoreQuery } from "../storeMode";

export const StoreProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const storeSlug = resolveStoreSlugFromLocation(location.pathname, searchParams);
  const [profile, setProfile] = useState(null);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const [userResponse, wishlistResponse] = await Promise.all([
        api.get("/users/me"),
        api.get("/wishlist"),
      ]);

      setProfile(userResponse.data || null);
      const wishlistItems = wishlistResponse.data?.items || [];
      if (!storeSlug) {
        setWishlistCount(wishlistItems.length);
      } else {
        setWishlistCount(
          wishlistItems.filter((item) => String(item?.product?.storeSlug || "") === String(storeSlug)).length
        );
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [storeSlug]);

  const subtitle = useMemo(() => {
    if (!storeSlug) return "Manage your customer profile and wishlist.";
    return `Store mode: ${storeSlug}. Wishlist and discovery are filtered to this store.`;
  }, [storeSlug]);

  if (loading) return <LoadingState label="Loading profile..." showSpinner={false} />;
  if (error) return <ErrorState message={error} action={<Button onClick={loadProfile}>Retry</Button>} />;
  if (!profile) return <EmptyState title="Profile not found" description="Unable to load your profile details." />;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="font-heading text-2xl font-bold text-slate-900">My Profile</h1>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>

      {storeSlug ? (
        <Button
          variant="secondary"
          className="mt-3"
          onClick={() => navigate("/")}
        >
          Back to Market
        </Button>
      ) : null}

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">Account</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">{profile.name || "Customer"}</h2>
        <p className="text-sm text-slate-600">{profile.email}</p>
        <p className="mt-1 text-xs text-slate-500">Phone: {profile.phoneNumber || "Not set"}</p>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <button
          type="button"
          onClick={() => navigate(withStoreQuery("/wishlist", storeSlug))}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Wishlist</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {wishlistCount} item{wishlistCount === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-sm text-slate-600">Tap to open wishlist</p>
          </div>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-700">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </span>
        </button>
      </section>
    </div>
  );
};

