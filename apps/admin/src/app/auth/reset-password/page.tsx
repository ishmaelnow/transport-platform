import { Suspense } from "react";
import { PasswordResetApp } from "@/components/auth/PasswordResetApp";

export default function PasswordResetPage() {
  return (
    <Suspense>
      <PasswordResetApp />
    </Suspense>
  );
}
