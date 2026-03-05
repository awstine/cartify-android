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
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState({
    label: "Home",
    fullName: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    isDefault: false,
  });
  const [lowDataModeEnabled, setLowDataModeEnabled] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const [userResponse, wishlistResponse] = await Promise.all([
        api.get("/users/me"),
        api.get("/wishlist"),
      ]);

      setProfile(userResponse.data || null);
      setAddresses(userResponse.data?.addresses || []);
      setLowDataModeEnabled(Boolean(userResponse.data?.preferences?.lowDataModeEnabled));
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

  const saveProfileSettings = async (nextAddresses = addresses, nextLowData = lowDataModeEnabled) => {
    setSaving(true);
    try {
      await api.patch("/users/me", {
        preferences: { lowDataModeEnabled: nextLowData },
        addresses: nextAddresses,
      });
      setAddresses(nextAddresses);
      setLowDataModeEnabled(nextLowData);
    } catch (_err) {
      // Keep current UI state if save fails.
    } finally {
      setSaving(false);
    }
  };

  const setDefaultAddress = async (addressId) => {
    const next = addresses.map((address) => ({ ...address, isDefault: address.id === addressId }));
    await saveProfileSettings(next, lowDataModeEnabled);
  };

  const removeAddress = async (addressId) => {
    const next = addresses.filter((address) => address.id !== addressId);
    if (next.length > 0 && !next.some((address) => address.isDefault)) {
      next[0].isDefault = true;
    }
    await saveProfileSettings(next, lowDataModeEnabled);
  };

  const addAddress = async (event) => {
    event.preventDefault();
    if (!newAddress.line1.trim()) return;
    const hasDefault = addresses.some((address) => address.isDefault);
    const next = [
      ...addresses,
      {
        id: `temp-${Date.now()}`,
        ...newAddress,
        isDefault: newAddress.isDefault || !hasDefault,
      },
    ];
    await saveProfileSettings(next, lowDataModeEnabled);
    setNewAddress({
      label: "Home",
      fullName: "",
      phone: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      isDefault: false,
    });
  };

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

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Performance</p>
            <p className="mt-1 text-sm text-slate-700">Low-data mode reduces product image payload and recommendation rails.</p>
          </div>
          <input
            type="checkbox"
            checked={lowDataModeEnabled}
            disabled={saving}
            onChange={(event) => {
              const next = event.target.checked;
              setLowDataModeEnabled(next);
              saveProfileSettings(addresses, next);
            }}
          />
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">Address Book</p>
        <p className="mt-1 text-sm text-slate-600">Add and set default delivery addresses for checkout.</p>
        <div className="mt-3 space-y-2">
          {addresses.length === 0 ? (
            <p className="text-sm text-slate-500">No saved addresses yet.</p>
          ) : (
            addresses.map((address) => (
              <article key={address.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {address.label} {address.isDefault ? "(Default)" : ""}
                  </p>
                  <div className="flex gap-2">
                    {!address.isDefault ? (
                      <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => setDefaultAddress(address.id)} disabled={saving}>
                        Set default
                      </Button>
                    ) : null}
                    <Button variant="ghost" className="px-2 py-1 text-xs text-red-600" onClick={() => removeAddress(address.id)} disabled={saving}>
                      Delete
                    </Button>
                  </div>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {[address.fullName, address.phone, address.line1, address.city, address.country].filter(Boolean).join(" | ")}
                </p>
              </article>
            ))
          )}
        </div>

        <form onSubmit={addAddress} className="mt-4 grid gap-2 sm:grid-cols-2">
          <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Label" value={newAddress.label} onChange={(event) => setNewAddress((prev) => ({ ...prev, label: event.target.value }))} />
          <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Full name" value={newAddress.fullName} onChange={(event) => setNewAddress((prev) => ({ ...prev, fullName: event.target.value }))} />
          <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Phone" value={newAddress.phone} onChange={(event) => setNewAddress((prev) => ({ ...prev, phone: event.target.value }))} />
          <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Address line 1" value={newAddress.line1} onChange={(event) => setNewAddress((prev) => ({ ...prev, line1: event.target.value }))} />
          <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Address line 2" value={newAddress.line2} onChange={(event) => setNewAddress((prev) => ({ ...prev, line2: event.target.value }))} />
          <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="City" value={newAddress.city} onChange={(event) => setNewAddress((prev) => ({ ...prev, city: event.target.value }))} />
          <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="State" value={newAddress.state} onChange={(event) => setNewAddress((prev) => ({ ...prev, state: event.target.value }))} />
          <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Postal code" value={newAddress.postalCode} onChange={(event) => setNewAddress((prev) => ({ ...prev, postalCode: event.target.value }))} />
          <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm sm:col-span-2" placeholder="Country" value={newAddress.country} onChange={(event) => setNewAddress((prev) => ({ ...prev, country: event.target.value }))} />
          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={newAddress.isDefault} onChange={(event) => setNewAddress((prev) => ({ ...prev, isDefault: event.target.checked }))} />
            Set as default
          </label>
          <Button type="submit" className="sm:col-span-2" loading={saving}>
            Save Address
          </Button>
        </form>
      </section>
    </div>
  );
};
