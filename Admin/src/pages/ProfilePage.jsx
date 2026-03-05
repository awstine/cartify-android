import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Button } from "../components/ui/Button";
import { Field, Input, Textarea } from "../components/ui/Field";
import { PageHeader } from "../components/ui/PageHeader";
import { ErrorState, LoadingState } from "../components/ui/States";
import { Card } from "../components/ui/Surface";
import { useToast } from "../context/ToastContext";

export const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [storeForm, setStoreForm] = useState({ name: "", description: "", logoUrl: "" });
  const [savingStore, setSavingStore] = useState(false);
  const canManageStore = ["merchant", "manager", "admin", "super_admin"].includes(user?.role || "");

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/admin/profile");
      setProfileForm({ name: response.data.name || "", email: response.data.email || "" });
      if (canManageStore) {
        try {
          const storeResponse = await api.get("/stores/me");
          setStoreForm({
            name: storeResponse.data.name || "",
            description: storeResponse.data.description || "",
            logoUrl: storeResponse.data.logoUrl || "",
          });
        } catch (_err) {
          // User may not be linked to a store yet.
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const saveStore = async (event) => {
    event.preventDefault();
    setSavingStore(true);
    try {
      await api.patch("/stores/me", storeForm);
      showToast({ type: "success", title: "Store updated successfully" });
    } catch (err) {
      showToast({
        type: "error",
        title: "Failed to update store",
        message: err?.response?.data?.message || "Try again.",
      });
    } finally {
      setSavingStore(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const response = await api.patch("/admin/profile", profileForm);
      updateUser({ name: response.data.name, email: response.data.email });
      showToast({ type: "success", title: "Profile updated successfully" });
    } catch (err) {
      showToast({
        type: "error",
        title: "Failed to update profile",
        message: err?.response?.data?.message || "Try again.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast({ type: "error", title: "Passwords do not match" });
      return;
    }
    setSavingPassword(true);
    try {
      await api.patch("/admin/profile/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showToast({ type: "success", title: "Password changed successfully" });
    } catch (err) {
      showToast({
        type: "error",
        title: "Failed to change password",
        message: err?.response?.data?.message || "Try again.",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <LoadingState label="Loading profile..." />;
  if (error) return <ErrorState message={error} action={<Button onClick={loadProfile}>Retry</Button>} />;

  return (
    <div>
      <PageHeader title="Profile" description="Manage your admin account details and password." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-base font-semibold">Profile Details</h3>
          <form className="mt-4 space-y-3" onSubmit={saveProfile}>
            <Field label="Full Name" htmlFor="profile-name">
              <Input
                id="profile-name"
                value={profileForm.name}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </Field>
            <Field label="Email Address" htmlFor="profile-email">
              <Input
                id="profile-email"
                type="email"
                value={profileForm.email}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </Field>
            <Button type="submit" loading={savingProfile}>
              Save Profile
            </Button>
          </form>
        </Card>

        <Card>
          <h3 className="text-base font-semibold">Change Password</h3>
          <form className="mt-4 space-y-3" onSubmit={changePassword}>
            <Field label="Current Password" htmlFor="current-password">
              <Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                required
              />
            </Field>
            <Field label="New Password" htmlFor="new-password">
              <Input
                id="new-password"
                type="password"
                minLength={6}
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                required
              />
            </Field>
            <Field label="Confirm New Password" htmlFor="confirm-password">
              <Input
                id="confirm-password"
                type="password"
                minLength={6}
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                required
              />
            </Field>
            <Button type="submit" loading={savingPassword}>
              Update Password
            </Button>
          </form>
        </Card>

        {canManageStore ? (
          <Card>
            <h3 className="text-base font-semibold">Store Settings</h3>
            <form className="mt-4 space-y-3" onSubmit={saveStore}>
              <Field label="Store Name" htmlFor="store-name">
                <Input id="store-name" value={storeForm.name} onChange={(event) => setStoreForm((prev) => ({ ...prev, name: event.target.value }))} required />
              </Field>
              <Field label="Store Logo URL" htmlFor="store-logo">
                <Input id="store-logo" value={storeForm.logoUrl} onChange={(event) => setStoreForm((prev) => ({ ...prev, logoUrl: event.target.value }))} />
              </Field>
              <Field label="Store Description" htmlFor="store-description">
                <Textarea id="store-description" rows={3} value={storeForm.description} onChange={(event) => setStoreForm((prev) => ({ ...prev, description: event.target.value }))} />
              </Field>
              <Button type="submit" loading={savingStore}>
                Save Store
              </Button>
            </form>
          </Card>
        ) : null}
      </div>
    </div>
  );
};
