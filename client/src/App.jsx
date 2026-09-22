import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Nav from "./components/Nav";
import Login from "./pages/Login";
import FederationLogin from "./pages/FederationLogin";
import Signup from "./pages/Signup";
import Services from "./pages/Services";
import BookService from "./pages/BookService";
import BookingDetail from "./pages/BookingDetail";
import Profile from "./pages/Profile";
import WorkerHome from "./pages/WorkerHome";
import Federations from "./pages/Federations";
import FederationDashboard from "./pages/FederationDashboard";

function Protected({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-center text-slate-400">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && (Array.isArray(role) ? !role.includes(user.role) : user.role !== role)) return <Navigate to="/" replace />;
  return children;
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "worker" ? "/worker" : user.role === "federation" ? `/federations/${user.id}` : "/services"} replace />;
}

function Shell() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/federation-login" element={<FederationLogin />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          path="/services"
          element={
            <Protected role="household">
              <Services />
            </Protected>
          }
        />
        <Route
          path="/book/:service"
          element={
            <Protected role="household">
              <BookService />
            </Protected>
          }
        />
        <Route
          path="/bookings/:id"
          element={
            <Protected>
              <BookingDetail />
            </Protected>
          }
        />
        <Route
          path="/profile"
          element={
            <Protected role="household">
              <Profile />
            </Protected>
          }
        />

        <Route
          path="/worker"
          element={
            <Protected role="worker">
              <WorkerHome />
            </Protected>
          }
        />
        <Route
          path="/federations"
          element={
            <Protected role="worker">
              <Federations />
            </Protected>
          }
        />
        <Route
          path="/federations/:id"
          element={
            <Protected role={["worker", "federation"]}>
              <FederationDashboard />
            </Protected>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
