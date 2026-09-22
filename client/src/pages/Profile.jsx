import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    api.myBookings().then(setBookings);
  }, []);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h1 className="font-display text-xl font-bold text-slate-900">{user.name}</h1>
        <p className="text-sm text-slate-500">
          {user.phone} · {user.email}
        </p>
      </div>

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">Booking history</h2>
      <div className="mt-3 space-y-2">
        {bookings.length === 0 && <p className="text-sm text-slate-400">No bookings yet.</p>}
        {bookings.map((b) => (
          <Link
            key={b.id}
            to={`/bookings/${b.id}`}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-amber-300"
          >
            <div>
              <p className="text-sm font-semibold text-slate-800">{b.task}</p>
              <p className="text-xs text-slate-400">{new Date(b.createdAt).toLocaleDateString()}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-600">
              {b.status.replace("_", " ")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
