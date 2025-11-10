import { createHashRouter } from "react-router-dom";
import Home from "./pages/Home";
import InvitePage from "./pages/InvitePage";
import Dashboard from "./pages/Dashboard";
import CreateInvitation from "./pages/CreateInvitation";
import OwnerDashboard from "./pages/OwnerDashboard";
import AdminConsole from "./pages/AdminConsole";

const router = createHashRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/new",
    element: <CreateInvitation />,
  },
  {
    path: "/edit/:id",
    element: <OwnerDashboard />,
  },
  {
    path: "/i/:slug",
    element: <InvitePage />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
  {
    path: "/admin",
    element: <AdminConsole />,
  },
]);

export default router;
