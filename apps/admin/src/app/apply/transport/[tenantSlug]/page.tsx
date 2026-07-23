"use client";
import { useEffect, useState, type FormEvent } from "react";

export default function TransportDriverApplication({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const [tenantSlug, setTenantSlug] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    void params.then(({ tenantSlug: slug }) => setTenantSlug(slug));
  }, [params]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("Uploading application…");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    for (const field of ["personalPhoto", "vehiclePhoto"] as const) {
      const file = form.get(field);
      if (file instanceof File && file.type.startsWith("image/"))
        form.set(field, await compressImage(file));
    }
    const document = form.get("document");
    if (document instanceof File && document.size > 3_000_000) {
      setMessage("Reference documents must be smaller than 3 MB.");
      setSubmitting(false);
      return;
    }
    form.set("tenantSlug", tenantSlug);
    try {
      const response = await fetch("/api/applications/driver", { method: "POST", body: form });
      const result = (await response.json()) as { message?: string };
      setMessage(
        response.ok
          ? "Application submitted for review."
          : (result.message ?? "Unable to submit application."),
      );
      if (response.ok) formElement.reset();
    } catch {
      setMessage("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <main className="auth-shell">
      <section className="panel">
        <h1>Become a driver</h1>
        <p>Apply to drive with this transportation company.</p>
        <form
          className="settings-grid"
          onSubmit={(event) => void submit(event)}
          onInvalid={() => setMessage("Please complete all required fields and select all files.")}
        >
          <label>
            Full name
            <input name="fullName" required />
          </label>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Phone
            <input name="phone" inputMode="tel" />
          </label>
          <label>
            Personal photo
            <input accept="image/*" capture="user" name="personalPhoto" type="file" required />
          </label>
          <label>
            Vehicle photo
            <input
              accept="image/*"
              capture="environment"
              name="vehiclePhoto"
              type="file"
              required
            />
          </label>
          <label>
            Reference document
            <input
              accept="image/*,application/pdf"
              capture="environment"
              name="document"
              type="file"
              required
            />
          </label>
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? "Uploading…" : "Submit application"}
          </button>
        </form>
        {message ? <p className="notice">{message}</p> : null}
      </section>
    </main>
  );
}

async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.78),
  );
  if (!blob) return file;
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
}
