import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Federations() {
  const { refresh } = useAuth();
  const [list, setList] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => api.federations().then(setList);
  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      const fed = await api.createFederation({ name });
      await refresh();
      setName("");
      load();
      setMsg(`${fed.name} created — you're the admin.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const join = async (id) => {
    setError("");
    setMsg("");
    try {
      await api.joinFederation(id);
      setMsg("Request sent. The federation admin will review it.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-slate-900">Federations</h1>
      <p className="mt-1 text-sm text-slate-500">Join an existing cooperative or start your own.</p>

      <form onSubmit={create} className="mt-6 flex gap-2 rounded-2xl border border-slate-200 bg-white p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New federation name"
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <button className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400">
          Start Federation
        </button>
      </form>

      {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
      {msg && <p className="mt-3 text-sm font-medium text-emerald-600">{msg}</p>}

      <div className="mt-6 space-y-3">
        {list.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
            <div>
              <Link to={`/federations/${f.id}`} className="font-semibold text-slate-800 hover:text-amber-600">
                {f.name}
              </Link>
              <p className="text-xs text-slate-500">
                {f.memberCount} members · Welfare fund ₹{f.welfareFund}
              </p>
            </div>
            <button
              onClick={() => join(f.id)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Request to Join
            </button>
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-slate-400">No federations yet — be the first to start one.</p>}
      </div>
    </div>
  );
}
