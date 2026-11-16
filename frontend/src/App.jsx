import { Suspense, lazy, useEffect } from "react";
import { AuthProvider, useAuth } from "./auth.jsx";
import { Aurora, Spinner, ToastProvider } from "./components/ui.jsx";
import { ForgotPasswordPage, ForgotUsernamePage, LoginPage, SignupPage, VerifyPage } from "./pages/Auth.jsx";
import Home from "./pages/Home.jsx";
import { RouterProvider, useRouter } from "./router.jsx";
import { ThemeProvider, ThemeToggle } from "./theme.jsx";

// heavy 3D / admin code is loaded on demand so the login page stays tiny and fast
const Studio = lazy(() => import("./pages/Studio.jsx"));
const SharedView = lazy(() => import("./pages/Viewer.jsx"));
const AdminApp = lazy(() => import("./admin/AdminApp.jsx"));

const PUBLIC = ["/login", "/signup", "/verify", "/forgot-password", "/forgot-username"];

function Routes() {
  const { path, go } = useRouter();
  const { user, ready } = useAuth();
  const isAdmin = path.startsWith("/admin");
  const isView = path.startsWith("/view/");

  useEffect(() => {
    if (!ready || isAdmin || isView) return;
    if (!user && !PUBLIC.includes(path)) go("/login", { replace: true });
    else if (user && (PUBLIC.includes(path) || path === "/login")) go("/", { replace: true });
  }, [ready, user, path, isAdmin, isView, go]);

  const fallback = <><Aurora /><Spinner label="Loading…" /></>;
  if (isAdmin) return <Suspense fallback={fallback}><AdminApp /></Suspense>;
  if (isView) return <Suspense fallback={fallback}><SharedView token={path.split("/")[2]} /></Suspense>;
  if (!ready) return fallback;
  switch (path) {
    case "/login": return <LoginPage />;
    case "/signup": return <SignupPage />;
    case "/verify": return <VerifyPage />;
    case "/forgot-password": return <ForgotPasswordPage />;
    case "/forgot-username": return <ForgotUsernamePage />;
    default: break;
  }
  if (!user) return fallback;
  if (path.startsWith("/studio/")) return <Suspense fallback={fallback}><Studio key={path} id={path.split("/")[2]} /></Suspense>;
  return <Home />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <RouterProvider>
          <AuthProvider>
            <Routes />
            <ThemeToggle />
          </AuthProvider>
        </RouterProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
