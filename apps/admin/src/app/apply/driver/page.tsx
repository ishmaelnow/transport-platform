"use client";
import { FormEvent, useState } from "react";

export default function DriverApplicationPage() {
  const [message, setMessage] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/applications/driver", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    const result = (await response.json()) as { message?: string };
    setMessage(response.ok ? "Application submitted for review." : result.message ?? "Unable to submit application.");
    if (response.ok) event.currentTarget.reset();
  }
  return <main className="auth-shell"><section className="panel"><h1>Apply to drive</h1><p>Submit your details to begin the driver application process.</p><form className="settings-grid" onSubmit={(event) => void submit(event)}><label>Tenant ID<input name="tenantId" required /></label><label>Full name<input name="fullName" required /></label><label>Email<input name="email" type="email" required /></label><label>Phone<input name="phone" /></label><button className="primary-button" type="submit">Submit application</button></form>{message ? <p className="notice">{message}</p> : null}</section></main>;
}
