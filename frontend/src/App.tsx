import router from "./router";
import { RouterProvider } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary scope="App">
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

export default App;
