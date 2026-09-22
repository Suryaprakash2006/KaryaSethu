import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Nav() {
  const { user, federation, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user || location.pathname === "/login" || location.pathname === "/federation-login" || location.pathname === "/signup") return null;

  const links =
    user.role === "household"
      ? [
        { to: "/services", label: "Services" },
        { to: "/profile", label: "Profile" },
      ]
      : user.role === "federation"
        ? [{ to: `/federations/${user.id}`, label: "Dashboard" }]
        : [
          { to: "/worker", label: "Dashboard" },
          { to: "/federations", label: "Federations" },
          ...(federation ? [{ to: `/federations/${federation.id}`, label: federation.name }] : []),
        ];

  return (
    <div className="border-b border-slate-800 bg-slate-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 font-bold text-slate-900">
            KS
          </span>
          <span className="font-display font-bold text-white">Karya Sethu</span>
        </Link>

        <div className="flex items-center gap-4">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm font-medium ${location.pathname === l.to ? "text-amber-400" : "text-slate-300 hover:text-white"
                }`}
            >
              {l.label}
            </Link>
          ))}
          <span className="hidden text-sm text-slate-400 sm:inline">{user.name}</span>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
