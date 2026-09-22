import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { api } from "../api";

export default function Services() {
  const [services, setServices] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    api.services().then(setServices);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-slate-900">What do you need help with?</h1>
      <p className="mt-1 text-sm text-slate-500">All rates are fixed by the cooperative. No surge pricing.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {Object.entries(services).map(([key, s]) => {
          const Icon = Icons[s.icon] || Icons.Wrench;
          return (
            <button
              key={key}
              onClick={() => navigate(`/book/${key}`)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-5 text-center transition hover:border-amber-400 hover:bg-amber-50"
            >
              <span className="rounded-full bg-slate-50 p-3 text-slate-700">
                <Icon size={22} />
              </span>
              <span className="text-sm font-semibold text-slate-800">{key}</span>
              <span className="text-xs text-slate-500">{s.task}</span>
              <span className="text-sm font-bold text-slate-900">₹{s.price}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
