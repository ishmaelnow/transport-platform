"use client";
import { useEffect, useState, type FormEvent } from "react";

export default function TransportDriverApplication({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const [tenantSlug, setTenantSlug] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { void params.then(({ tenantSlug: slug }) => setTenantSlug(slug)); }, [params]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("Uploading application…");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    form.set("tenantSlug", tenantSlug);
    try {
      const response = await fetch("/api/applications/driver", { method: "POST", body: form });
      const result = (await response.json()) as { message?: string };
      setMessage(response.ok ? "Application submitted for review." : result.message ?? "Unable to submit application.");
      if (response.ok) formElement.reset();
    } catch {
      setMessage("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }
  return <main className="auth-shell"><section className="panel"><h1>Become a driver</h1><p>Apply to drive with this transportation company.</p><form className="settings-grid" onSubmit={(event) => void submit(event)} onInvalid={() => setMessage("Please complete all required fields and select all files.")}><label>Full name<input name="fullName" required /></label><label>Email<input name="email" type="email" required /></label><label>Phone<input name="phone" inputMode="tel" /></label><label>Personal photo<input accept="image/*" capture="user" name="personalPhoto" type="file" required /></label><label>Vehicle photo<input accept="image/*" capture="environment" name="vehiclePhoto" type="file" required /></label><label>Reference document<input accept="image/*,application/pdf" capture="environment" name="document" type="file" required /></label><button className="primary-button" disabled={submitting} type="submit">{submitting ? "Uploading…" : "Submit application"}</button></form>{message ? <p className="notice">{message}</p> : null}</section></main>;
}
