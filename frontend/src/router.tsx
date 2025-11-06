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
    path: "/i/:slug",
    element: <InvitePage />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
]);

export default router;
