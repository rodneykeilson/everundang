import { createBrowserRouter } from "react-router-dom";
import Home from "./pages/Home";
import InvitePage from "./pages/InvitePage";
import Dashboard from "./pages/Dashboard";
import CreateInvitation from "./pages/CreateInvitation";
import OwnerDashboard from "./pages/OwnerDashboard";

const router = createBrowserRouter([
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
]);

export default router;
