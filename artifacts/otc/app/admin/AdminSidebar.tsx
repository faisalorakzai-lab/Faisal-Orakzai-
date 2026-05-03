// Shared admin sidebar — re-exported from components so all admin screens can import from here.
// Default export is required by Expo Router (this file sits inside app/admin/).
export { AdminSidebar, ADMIN_NAV_ITEMS } from "../../components/admin/AdminSidebar";
export default function AdminSidebarRoute() { return null; }
