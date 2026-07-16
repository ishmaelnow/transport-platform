"use client";
import { useState, type FormEvent } from "react";

export default function DriverApplicationPage({ params }: { params: { tenantSlug: string } }) {
  const [message, setMessage] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("tenantSlug", params.tenantSlug);
    const response = await fetch("/api/applications/driver", { method: "POST", body: form });
    const result = (await response.json()) as { message?: string };
    setMessage(response.ok ? "Application submitted for review." : result.message ?? "Unable to submit application.");
    if (response.ok) event.currentTarget.reset();
  }
  return <main className="auth-shell"><section className="panel"><h1>Apply to drive</h1><p>Submit your details and required files.</p><form className="settings-grid" onSubmit={(event) => void submit(event)}><label>Full name<input name="fullName" required /></label><label>Email<input name="email" type="email" required /></label><label>Phone<input name="phone" /></label><label>Personal photo<input accept="image/*" capture="user" name="personalPhoto" type="file" required /></label><label>Vehicle photo<input accept="image/*" capture="environment" name="vehiclePhoto" type="file" required /></label><label>Reference document<input accept="image/*,application/pdf" capture="environment" name="document" type="file" required /></label><button className="primary-button" type="submit">Submit application</button></form>{message ? <p className="notice">{message}</p> : null}</section></main>;
}
