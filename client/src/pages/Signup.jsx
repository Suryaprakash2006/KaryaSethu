import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", role: "household" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signup(form);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-slate-900">Create your account</h1>
      <p className="mt-1 text-sm text-slate-500">
        Choose how you'll use Karya Sethu. Use a different email for each role if you want to test both.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          { key: "household", label: "Household", desc: "Book trusted services" },
          { key: "worker", label: "Worker", desc: "Take up jobs & join a cooperative" },
        ].map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setForm({ ...form, role: r.key })}
            className={`rounded-xl border p-4 text-left ${
              form.role === r.key ? "border-amber-500 bg-amber-50" : "border-slate-200"
            }`}
          >
            <p className="font-semibold text-slate-800">{r.label}</p>
            <p className="text-xs text-slate-500">{r.desc}</p>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-600">Full name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Phone number</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
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
          {busy ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-amber-600">
          Log in
        </Link>
      </p>
    </div>
  );
}
