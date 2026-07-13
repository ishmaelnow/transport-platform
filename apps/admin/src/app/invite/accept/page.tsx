import { Suspense } from "react";
import { InvitationAcceptanceApp } from "@/components/invitations/InvitationAcceptanceApp";

export default function InvitationAcceptancePage() {
  return (
    <Suspense>
      <InvitationAcceptanceApp />
    </Suspense>
  );
}
