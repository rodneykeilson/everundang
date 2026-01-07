import { createHashRouter } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import DashboardHome from "./pages/DashboardHome";
import InvitePage from "./pages/InvitePage";
import Dashboard from "./pages/Dashboard";
import CreateInvitation from "./pages/CreateInvitation";
import OwnerDashboard from "./pages/OwnerDashboard";
import AdminConsole from "./pages/AdminConsole";
import NotFound from "./pages/NotFound";

const router = createHashRouter([
  {
    path: "/",
    element: (
      <AppLayout>
        <DashboardHome />
      </AppLayout>
    ),
  },
  {
    path: "/new",
    element: (
      <AppLayout>
        <CreateInvitation />
      </AppLayout>
    ),
  },
  {
    path: "/edit/:id",
    element: (
      <AppLayout>
        <OwnerDashboard />
      </AppLayout>
    ),
  },
  {
    path: "/i/:slug",
    element: <InvitePage />,
  },
  {
    path: "/dashboard",
    element: (
      <AppLayout>
        <Dashboard />
      </AppLayout>
    ),
  },
  {
    path: "/admin",
    element: (
      <AppLayout>
        <AdminConsole />
      </AppLayout>
    ),
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default router;
