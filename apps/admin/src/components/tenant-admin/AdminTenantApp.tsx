"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createBrowserSupabaseClient,
  type SupabaseAuthSession,
} from "@transport-platform/supabase";
import { adminPublicConfig } from "@/lib/config";
import {
  loadPrincipalTenantContext,
  persistActiveTenantPreference,
} from "@/lib/tenant-admin/context";
import {
  cancelTenantInvitation,
  createTenantInvitation,
  updateTenantMembershipStatus,
  updateTenantSettings,
} from "@/lib/tenant-admin/mutations";
import { createDriver, transitionDriver, updateDriver } from "@/lib/driver-management/mutations";
import {
  countActiveMemberships,
  countPendingInvitations,
  loadTenantSummary,
} from "@/lib/tenant-admin/queries";
import type {
  ActiveTenantOption,
  EditableTenantConfiguration,
  FoundationTenantRole,
  TenantContextResolution,
  TenantSummary,
} from "@/lib/tenant-admin/types";

type ViewKey =
  | "dashboard"
  | "settings"
  | "memberships"
  | "invitations"
  | "roles"
  | "capabilities"
  | "audit"
  | "drivers";

const views: { key: ViewKey; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "settings", label: "Settings" },
  { key: "memberships", label: "Memberships" },
  { key: "invitations", label: "Invitations" },
  { key: "roles", label: "Roles" },
  { key: "capabilities", label: "Capabilities" },
  { key: "audit", label: "Audit" },
  { key: "drivers", label: "Drivers" },
];

export function AdminTenantApp() {
  const supabase = useMemo(
    () =>
      typeof window === "undefined"
        ? null
        : createBrowserSupabaseClient(adminPublicConfig.supabase),
    [],
  );
  const [session, setSession] = useState<SupabaseAuthSession | null>(null);
  const [resolution, setResolution] = useState<TenantContextResolution | null>(null);
  const [summary, setSummary] = useState<TenantSummary | null>(null);
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (activeSession: SupabaseAuthSession | null) => {
      if (!supabase) {
        return;
      }

      if (!activeSession?.user) {
        setResolution(null);
        setSummary(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextResolution = await loadPrincipalTenantContext(supabase, activeSession.user);
        setResolution(nextResolution);

        if (nextResolution.status === "ready") {
          setSummary(
            await loadTenantSummary(supabase, nextResolution.selectedTenant.tenant.tenant_id),
          );
        } else {
          setSummary(null);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to load tenant administration.");
      } finally {
        setLoading(false);
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) {
          return;
        }

        setSession(data.session);
        void refresh(data.session);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Unable to load the Supabase session.");
        setLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void refresh(nextSession);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [refresh]);

  const selectedTenant = resolution?.status === "ready" ? resolution.selectedTenant : null;
  const tenantOptions = resolution?.status === "ready" ? resolution.context.memberships : [];
  const canManageTenant =
    selectedTenant?.roles.includes("tenant_owner") ||
    selectedTenant?.roles.includes("tenant_admin") ||
    false;

  async function handleTenantSelect(tenantId: string) {
    if (!supabase || !resolution || !("context" in resolution)) {
      return;
    }

    const tenant = resolution.context.memberships.find(
      (option) => option.tenant.tenant_id === tenantId,
    );

    if (!tenant) {
      return;
    }

    setLoading(true);

    try {
      await persistActiveTenantPreference(supabase, resolution.context.person.person_id, tenant);
      await refresh(session);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to select tenant.");
      setLoading(false);
    }
  }

  if (!session) {
    return <SignedOutState />;
  }

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Tenant Administration</h1>
        </div>

        {selectedTenant ? (
          <TenantContextPanel
            tenant={selectedTenant}
            options={tenantOptions}
            onSelect={(tenantId) => void handleTenantSelect(tenantId)}
          />
        ) : null}

        <nav className="nav-list" aria-label="Administration">
          {views.map((view) => (
            <button
              className={view.key === activeView ? "nav-item active" : "nav-item"}
              key={view.key}
              onClick={() => setActiveView(view.key)}
              type="button"
            >
              {view.label}
            </button>
          ))}
        </nav>

        <button
          className="secondary-button full-width"
          onClick={() => {
            if (supabase) {
              void supabase.auth.signOut();
            }
          }}
          type="button"
        >
          Sign out
        </button>
      </aside>

      <section className="workspace">
        {loading ? (
          <StateBlock
            title="Loading tenant context"
            message="Resolving your profile, memberships, and tenant access."
          />
        ) : null}
        {error ? <StateBlock tone="danger" title="Unable to load" message={error} /> : null}
        {!loading && !error ? (
          <ResolvedWorkspace
            activeView={activeView}
            canManageTenant={canManageTenant}
            onRefresh={() => void refresh(session)}
            resolution={resolution}
            selectedTenant={selectedTenant}
            session={session}
            summary={summary}
          />
        ) : null}
      </section>
    </main>
  );
}

function SignedOutState() {
  const supabase = useMemo(
    () =>
      typeof window === "undefined"
        ? null
        : createBrowserSupabaseClient(adminPublicConfig.supabase),
    [],
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!supabase) {
      setMessage("Supabase client is not ready.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="signed-out-shell">
      <section className="sign-in-panel">
        <p className="eyebrow">Admin</p>
        <h1>Sign in</h1>
        <p className="muted">
          Use an existing Supabase Auth account with an active tenant membership.
        </p>
        <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            Email
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {message ? <p className="form-error">{message}</p> : null}
          <button className="primary-button" type="submit">
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}

function ResolvedWorkspace({
  activeView,
  canManageTenant,
  onRefresh,
  resolution,
  selectedTenant,
  session,
  summary,
}: {
  activeView: ViewKey;
  canManageTenant: boolean;
  onRefresh: () => void;
  resolution: TenantContextResolution | null;
  selectedTenant: ActiveTenantOption | null;
  session: SupabaseAuthSession;
  summary: TenantSummary | null;
}) {
  if (!resolution) {
    return (
      <StateBlock
        title="No session context"
        message="Sign out and sign back in to refresh the Admin session."
      />
    );
  }

  if (resolution.status === "signed_in_without_profile") {
    return (
      <StateBlock
        title="No person profile"
        message="This Auth user does not have a PersonProfile yet."
      />
    );
  }

  if (resolution.status === "no_active_memberships") {
    return (
      <StateBlock
        title="No active tenant memberships"
        message="Authentication alone does not grant tenant access."
      />
    );
  }

  if (resolution.status === "tenant_selection_required") {
    return (
      <StateBlock
        title="Select a tenant"
        message="You have multiple active memberships. Use the tenant selector to choose the active workspace."
      />
    );
  }

  if (!selectedTenant || !summary) {
    return (
      <StateBlock
        title="Tenant data unavailable"
        message="The selected tenant could not be loaded."
      />
    );
  }

  return (
    <>
      <HeaderBlock resolution={resolution} selectedTenant={selectedTenant} summary={summary} />
      {activeView === "dashboard" ? (
        <Dashboard resolution={resolution} selectedTenant={selectedTenant} summary={summary} />
      ) : null}
      {activeView === "settings" ? (
        <SettingsPanel
          canManageTenant={canManageTenant}
          onRefresh={onRefresh}
          session={session}
          summary={summary}
        />
      ) : null}
      {activeView === "memberships" ? (
        <MembershipsPanel
          canManageTenant={canManageTenant}
          onRefresh={onRefresh}
          selectedMembershipId={selectedTenant.membership.membership_id}
          session={session}
          summary={summary}
        />
      ) : null}
      {activeView === "invitations" ? (
        <InvitationsPanel
          canManageTenant={canManageTenant}
          onRefresh={onRefresh}
          session={session}
          summary={summary}
        />
      ) : null}
      {activeView === "roles" ? <RolesPanel summary={summary} /> : null}
      {activeView === "capabilities" ? <CapabilitiesPanel summary={summary} /> : null}
      {activeView === "audit" ? <AuditPanel summary={summary} /> : null}
      {activeView === "drivers" ? (
        <DriversPanel
          canManageTenant={canManageTenant}
          onRefresh={onRefresh}
          session={session}
          summary={summary}
        />
      ) : null}
    </>
  );
}

function HeaderBlock({
  resolution,
  selectedTenant,
  summary,
}: {
  resolution: Extract<TenantContextResolution, { status: "ready" }>;
  selectedTenant: ActiveTenantOption;
  summary: TenantSummary;
}) {
  return (
    <header className="workspace-header">
      <div>
        <p className="eyebrow">Active tenant</p>
        <h2>{summary.configuration?.display_name ?? selectedTenant.tenant.tenant_id}</h2>
        <p className="muted">{summary.configuration?.legal_name ?? "No legal name configured"}</p>
      </div>
      <div className="header-meta">
        <span className={`status-pill ${selectedTenant.tenant.status}`}>
          {selectedTenant.tenant.status}
        </span>
        <span>{resolution.context.person.primary_email}</span>
        <span>{selectedTenant.roles.join(", ") || "No tenant role"}</span>
      </div>
    </header>
  );
}

function TenantContextPanel({
  tenant,
  options,
  onSelect,
}: {
  tenant: ActiveTenantOption;
  options: readonly ActiveTenantOption[];
  onSelect: (tenantId: string) => void;
}) {
  return (
    <section className="tenant-context">
      <span>Tenant</span>
      <select
        onChange={(event) => void onSelect(event.target.value)}
        value={tenant.tenant.tenant_id}
      >
        {options.map((option) => (
          <option key={option.tenant.tenant_id} value={option.tenant.tenant_id}>
            {option.configuration?.display_name ?? option.tenant.tenant_id}
          </option>
        ))}
      </select>
    </section>
  );
}

function Dashboard({
  resolution,
  selectedTenant,
  summary,
}: {
  resolution: Extract<TenantContextResolution, { status: "ready" }>;
  selectedTenant: ActiveTenantOption;
  summary: TenantSummary;
}) {
  const enabledCapabilities = summary.capabilities.filter(({ enabled }) => enabled);
  const stats = [
    { label: "Memberships", value: countActiveMemberships(summary.memberships) },
    { label: "Pending invitations", value: countPendingInvitations(summary.invitations) },
    { label: "Enabled capabilities", value: enabledCapabilities.length },
    { label: "Recent audit events", value: summary.auditEvents.length },
  ];

  return (
    <section className="content-stack">
      <div className="metric-grid">
        {stats.map((stat) => (
          <article className="metric" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>
      <div className="two-column">
        <InfoPanel
          title="Current person"
          rows={[
            ["Email", resolution.context.person.primary_email],
            ["Profile status", resolution.context.person.status],
            ["Membership", selectedTenant.membership.status],
            ["Tenant role", selectedTenant.roles.join(", ") || "None"],
          ]}
        />
        <InfoPanel
          title="Enabled capabilities"
          rows={enabledCapabilities.map(({ capability_key }) => [capability_key, "Enabled"])}
          empty="No capabilities are enabled."
        />
      </div>
      <AuditPanel summary={summary} compact />
    </section>
  );
}

function SettingsPanel({
  canManageTenant,
  onRefresh,
  session,
  summary,
}: {
  canManageTenant: boolean;
  onRefresh: () => void;
  session: SupabaseAuthSession;
  summary: TenantSummary;
}) {
  const initial = useMemo<EditableTenantConfiguration>(
    () => ({
      display_name: summary.configuration?.display_name ?? "",
      legal_name: summary.configuration?.legal_name ?? "",
      default_time_zone: summary.configuration?.default_time_zone ?? "",
      support_contact_email: summary.configuration?.support_contact_email ?? "",
      branding_reference: summary.configuration?.branding_reference ?? "",
    }),
    [summary.configuration],
  );
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => setForm(initial), [initial]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const result = await updateTenantSettings(session, summary.tenant.tenant_id, form);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    onRefresh();
  }

  return (
    <section className="panel">
      <PanelHeader
        title="Tenant settings"
        description="Platform-managed tenant configuration values."
      />
      {!canManageTenant ? (
        <p className="notice">
          You can view settings, but RLS does not permit this role to update them.
        </p>
      ) : null}
      <form className="settings-grid" onSubmit={(event) => void handleSubmit(event)}>
        <TextInput
          disabled={!canManageTenant}
          label="Display name"
          name="display_name"
          setForm={setForm}
          value={form.display_name}
        />
        <TextInput
          disabled={!canManageTenant}
          label="Legal name"
          name="legal_name"
          setForm={setForm}
          value={form.legal_name}
        />
        <TextInput
          disabled={!canManageTenant}
          label="Default time zone"
          name="default_time_zone"
          setForm={setForm}
          value={form.default_time_zone}
        />
        <TextInput
          disabled={!canManageTenant}
          label="Support contact email"
          name="support_contact_email"
          setForm={setForm}
          type="email"
          value={form.support_contact_email}
        />
        <TextInput
          disabled={!canManageTenant}
          label="Branding reference"
          name="branding_reference"
          setForm={setForm}
          value={form.branding_reference ?? ""}
        />
        {message ? <p className="form-error">{message}</p> : null}
        <button className="primary-button" disabled={!canManageTenant} type="submit">
          Save settings
        </button>
      </form>
    </section>
  );
}

function TextInput({
  disabled,
  label,
  name,
  setForm,
  type = "text",
  value,
}: {
  disabled: boolean;
  label: string;
  name: keyof EditableTenantConfiguration;
  setForm: (updater: (form: EditableTenantConfiguration) => EditableTenantConfiguration) => void;
  type?: string;
  value: string;
}) {
  return (
    <label>
      {label}
      <input
        disabled={disabled}
        name={String(name)}
        onChange={(event) => setForm((form) => ({ ...form, [name]: event.target.value }))}
        type={type}
        value={value}
      />
    </label>
  );
}

function MembershipsPanel({
  canManageTenant,
  onRefresh,
  selectedMembershipId,
  session,
  summary,
}: {
  canManageTenant: boolean;
  onRefresh: () => void;
  selectedMembershipId: string;
  session: SupabaseAuthSession;
  summary: TenantSummary;
}) {
  async function updateMembership(membershipId: string, status: "suspended" | "removed") {
    const result = await updateTenantMembershipStatus(
      session,
      summary.tenant.tenant_id,
      membershipId,
      status,
    );

    if (!result.ok) {
      window.alert(result.message);
      return;
    }

    onRefresh();
  }

  return (
    <section className="panel">
      <PanelHeader title="Memberships" description="Tenant-scoped access relationships." />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Status</th>
              <th>Roles</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {summary.memberships.map((membership) => (
              <tr key={membership.membership_id}>
                <td>
                  <strong>
                    {membership.person?.display_name ??
                      membership.person?.primary_email ??
                      "Profile restricted"}
                  </strong>
                  <span>{membership.person?.primary_email ?? membership.person_id}</span>
                </td>
                <td>{membership.status}</td>
                <td>{membership.roles.map(({ role_key }) => role_key).join(", ") || "None"}</td>
                <td>{formatDate(membership.updated_at)}</td>
                <td>
                  <div className="row-actions">
                    <button
                      className="secondary-button"
                      disabled={
                        !canManageTenant ||
                        membership.membership_id === selectedMembershipId ||
                        membership.status !== "active"
                      }
                      onClick={() => void updateMembership(membership.membership_id, "suspended")}
                      type="button"
                    >
                      Suspend
                    </button>
                    <button
                      className="danger-button"
                      disabled={
                        !canManageTenant ||
                        membership.membership_id === selectedMembershipId ||
                        membership.status === "removed"
                      }
                      onClick={() => void updateMembership(membership.membership_id, "removed")}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function InvitationsPanel({
  canManageTenant,
  onRefresh,
  session,
  summary,
}: {
  canManageTenant: boolean;
  onRefresh: () => void;
  session: SupabaseAuthSession;
  summary: TenantSummary;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<FoundationTenantRole>("tenant_member");
  const [message, setMessage] = useState<string | null>(null);

  async function submitInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const result = await createTenantInvitation(session, summary.tenant.tenant_id, email, role);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setEmail("");
    onRefresh();
  }

  async function cancelInvitation(invitationId: string) {
    const result = await cancelTenantInvitation(session, summary.tenant.tenant_id, invitationId);

    if (!result.ok) {
      window.alert(result.message);
      return;
    }

    onRefresh();
  }

  return (
    <section className="content-stack">
      <section className="panel">
        <PanelHeader
          title="Create invitation"
          description="Email-only tenant invitation for a foundation role."
        />
        <form className="inline-form" onSubmit={(event) => void submitInvitation(event)}>
          <input
            disabled={!canManageTenant}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="person@example.com"
            required
            type="email"
            value={email}
          />
          <select
            disabled={!canManageTenant}
            onChange={(event) => setRole(event.target.value as FoundationTenantRole)}
            value={role}
          >
            <option value="tenant_owner">tenant_owner</option>
            <option value="tenant_admin">tenant_admin</option>
            <option value="tenant_member">tenant_member</option>
          </select>
          <button className="primary-button" disabled={!canManageTenant} type="submit">
            Invite
          </button>
        </form>
        {message ? <p className="form-error">{message}</p> : null}
      </section>
      <section className="panel">
        <PanelHeader title="Invitations" description="Pending and historical tenant invitations." />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {summary.invitations.map((invitation) => (
                <tr key={invitation.invitation_id}>
                  <td>{invitation.email}</td>
                  <td>{invitation.intended_role}</td>
                  <td>{invitation.status}</td>
                  <td>{formatDate(invitation.expires_at)}</td>
                  <td>
                    <button
                      className="secondary-button"
                      disabled={!canManageTenant || invitation.status !== "pending"}
                      onClick={() => void cancelInvitation(invitation.invitation_id)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function DriversPanel({
  canManageTenant,
  onRefresh,
  session,
  summary,
}: {
  canManageTenant: boolean;
  onRefresh: () => void;
  session: SupabaseAuthSession;
  summary: TenantSummary;
}) {
  const enabled = summary.capabilities.some(
    ({ capability_key, enabled }) => capability_key === "driver.management" && enabled,
  );
  const [form, setForm] = useState({
    driverNumber: "",
    displayName: "",
    email: "",
    phone: "",
    onboardingDate: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const input = {
      ...form,
      email: form.email || null,
      phone: form.phone || null,
      personId: null,
      onboardingDate: form.onboardingDate || null,
    };
    const result = editingId
      ? await updateDriver(session, summary.tenant.tenant_id, editingId, input)
      : await createDriver(session, summary.tenant.tenant_id, input);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setEditingId(null);
    setForm({ driverNumber: "", displayName: "", email: "", phone: "", onboardingDate: "" });
    onRefresh();
  }

  async function changeStatus(
    driverProfileId: string,
    status: "draft" | "onboarding" | "active" | "suspended" | "inactive" | "archived",
  ) {
    const reason = ["suspended", "inactive", "archived"].includes(status)
      ? window.prompt("Reason required")
      : null;
    if (["suspended", "inactive", "archived"].includes(status) && !reason) return;
    const result = await transitionDriver(session, summary.tenant.tenant_id, driverProfileId, {
      status,
      reason,
    });
    if (!result.ok) window.alert(result.message);
    else onRefresh();
  }

  return (
    <section className="content-stack">
      <section className="panel">
        <PanelHeader
          title="Drivers"
          description="Tenant-scoped driver profiles and administrative lifecycle."
        />
        {!enabled ? (
          <p className="notice">Driver Management is not enabled for this tenant.</p>
        ) : null}
        <form className="settings-grid" onSubmit={(event) => void submit(event)}>
          <DriverTextInput
            disabled={!enabled || !canManageTenant}
            label="Driver number"
            name="driverNumber"
            setForm={(u) => setForm((current) => u(current))}
            value={form.driverNumber}
          />
          <DriverTextInput
            disabled={!enabled || !canManageTenant}
            label="Display name"
            name="displayName"
            setForm={(u) => setForm((current) => u(current))}
            value={form.displayName}
          />
          <DriverTextInput
            disabled={!enabled || !canManageTenant}
            label="Email"
            name="email"
            type="email"
            setForm={(u) => setForm((current) => u(current))}
            value={form.email}
          />
          <DriverTextInput
            disabled={!enabled || !canManageTenant}
            label="Phone"
            name="phone"
            setForm={(u) => setForm((current) => u(current))}
            value={form.phone}
          />
          <label>
            Onboarding date
            <input
              disabled={!enabled || !canManageTenant}
              type="date"
              value={form.onboardingDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, onboardingDate: event.target.value }))
              }
            />
          </label>
          <button className="primary-button" disabled={!enabled || !canManageTenant} type="submit">
            {editingId ? "Save driver" : "Create driver"}
          </button>
          {editingId ? (
            <button
              className="secondary-button"
              onClick={() => {
                setEditingId(null);
                setForm({ driverNumber: "", displayName: "", email: "", phone: "", onboardingDate: "" });
              }}
              type="button"
            >
              Cancel edit
            </button>
          ) : null}
        </form>
        {message ? <p className="form-error">{message}</p> : null}
      </section>
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Number</th>
                <th>Driver</th>
                <th>Status</th>
                <th>Contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {summary.drivers.map((driver) => (
                <tr key={driver.driver_profile_id}>
                  <td>{driver.driver_number}</td>
                  <td>
                    <strong>{driver.display_name}</strong>
                    <span>{driver.email ?? "No email"}</span>
                  </td>
                  <td>{driver.status}</td>
                  <td>{driver.phone ?? "No phone"}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="secondary-button"
                        disabled={!canManageTenant || !enabled}
                        onClick={() => {
                          setEditingId(driver.driver_profile_id);
                          setForm({
                            driverNumber: driver.driver_number,
                            displayName: driver.display_name,
                            email: driver.email ?? "",
                            phone: driver.phone ?? "",
                            onboardingDate: driver.onboarding_date ?? "",
                          });
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                      {driver.status === "draft" ? (
                        <button
                          className="secondary-button"
                          disabled={!canManageTenant || !enabled}
                          onClick={() => void changeStatus(driver.driver_profile_id, "onboarding")}
                          type="button"
                        >
                          Start onboarding
                        </button>
                      ) : null}
                      {driver.status === "onboarding" ? (
                        <button
                          className="secondary-button"
                          disabled={!canManageTenant || !enabled}
                          onClick={() => void changeStatus(driver.driver_profile_id, "active")}
                          type="button"
                        >
                          Activate
                        </button>
                      ) : null}
                      {driver.status === "active" ? (
                        <button
                          className="danger-button"
                          disabled={!canManageTenant || !enabled}
                          onClick={() => void changeStatus(driver.driver_profile_id, "suspended")}
                          type="button"
                        >
                          Suspend
                        </button>
                      ) : null}
                      {driver.status === "suspended" ? (
                        <button
                          className="secondary-button"
                          disabled={!canManageTenant || !enabled}
                          onClick={() => void changeStatus(driver.driver_profile_id, "active")}
                          type="button"
                        >
                          Reactivate
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {summary.drivers.length === 0 ? (
          <EmptyState message="No drivers have been created." />
        ) : null}
      </section>
    </section>
  );
}

type DriverForm = {
  driverNumber: string;
  displayName: string;
  email: string;
  phone: string;
  onboardingDate: string;
};

function DriverTextInput({
  disabled,
  label,
  name,
  setForm,
  type = "text",
  value,
}: {
  disabled: boolean;
  label: string;
  name: keyof DriverForm;
  setForm: (updater: (form: DriverForm) => DriverForm) => void;
  type?: string;
  value: string;
}) {
  return (
    <label>
      {label}
      <input
        disabled={disabled}
        name={name}
        onChange={(event) => setForm((form) => ({ ...form, [name]: event.target.value }))}
        type={type}
        value={value}
      />
    </label>
  );
}

function RolesPanel({ summary }: { summary: TenantSummary }) {
  return (
    <section className="panel">
      <PanelHeader title="Tenant roles" description="Foundation tenant role assignments only." />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Membership</th>
              <th>Role</th>
              <th>Status</th>
              <th>Assigned</th>
            </tr>
          </thead>
          <tbody>
            {summary.roleAssignments.map((assignment) => (
              <tr key={assignment.assignment_id}>
                <td>{assignment.membership_id}</td>
                <td>{assignment.role_key}</td>
                <td>{assignment.status}</td>
                <td>{formatDate(assignment.assigned_at ?? assignment.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CapabilitiesPanel({ summary }: { summary: TenantSummary }) {
  return (
    <section className="panel">
      <PanelHeader title="Capabilities" description="Tenant module and app capability state." />
      <div className="capability-grid">
        {summary.capabilities.map((capability) => (
          <article className="capability" key={capability.capability_key}>
            <strong>{capability.capability_key}</strong>
            <span className={capability.enabled ? "status-pill active" : "status-pill disabled"}>
              {capability.enabled ? "Enabled" : "Disabled"}
            </span>
          </article>
        ))}
      </div>
      <p className="notice">Capability management is platform-owned in V1.</p>
    </section>
  );
}

function AuditPanel({ compact = false, summary }: { compact?: boolean; summary: TenantSummary }) {
  return (
    <section className="panel">
      <PanelHeader
        title="Recent audit activity"
        description={compact ? undefined : "Authorized tenant audit events."}
      />
      {summary.auditEvents.length === 0 ? (
        <EmptyState message="No visible audit activity." />
      ) : (
        <div className="audit-list">
          {summary.auditEvents.slice(0, compact ? 5 : undefined).map((event) => (
            <article className="audit-event" key={event.audit_event_id}>
              <div>
                <strong>{event.event_name}</strong>
                <span>
                  {event.resource_type}:{event.resource_id}
                </span>
              </div>
              <p>{event.reason}</p>
              <time>{formatDate(event.occurred_at)}</time>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function InfoPanel({
  empty,
  rows,
  title,
}: {
  empty?: string;
  rows: readonly (readonly [string, string])[];
  title: string;
}) {
  return (
    <section className="panel">
      <PanelHeader title={title} />
      {rows.length === 0 ? <EmptyState message={empty ?? "No data available."} /> : null}
      {rows.length > 0 ? (
        <dl className="definition-list">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}

function PanelHeader({ description, title }: { description?: string | undefined; title: string }) {
  return (
    <header className="panel-header">
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
    </header>
  );
}

function StateBlock({ message, title, tone }: { message: string; title: string; tone?: "danger" }) {
  return (
    <section className={tone === "danger" ? "state-block danger" : "state-block"}>
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="empty-state">{message}</p>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
