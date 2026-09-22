import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function FederationLogin() {
  const { federationLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await federationLogin(form);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4">
      <h1 className="font-display text-2xl font-bold text-slate-900">Federation admin login</h1>
      <p className="mt-1 text-sm text-slate-500">Use the email or phone of the worker who started the federation.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-600">Admin email or phone</label>
          <input
            value={form.identifier}
            onChange={(e) => setForm({ ...form, identifier: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-amber-500 focus:outline-none"
          />
        </div>
        {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded-xl bg-amber-500 py-3 font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
        >
          {busy ? "Logging in..." : "Log in to federation"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Worker account?{" "}
        <Link to="/login" className="font-medium text-amber-600">
          Worker login
        </Link>
      </p>
    </div>
  );
}
