import { createBrowserRouter } from "react-router-dom";
import Home from "./pages/Home";
import InvitePage from "./pages/InvitePage";
import Dashboard from "./pages/Dashboard";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/t/:slug",
    element: <InvitePage />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
]);

export default router;
