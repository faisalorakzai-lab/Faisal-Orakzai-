import { Slot } from "expo-router";

// Use Slot (transparent wrapper) instead of Stack so the admin/ folder
// does not register a SECOND "admin" navigator in the root Stack —
// that would conflict with the top-level app/admin.tsx leaf screen.
export default function AdminLayout() {
  return <Slot />;
}
