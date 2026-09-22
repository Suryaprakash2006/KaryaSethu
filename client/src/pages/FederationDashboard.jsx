import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function FederationDashboard() {
  const { id } = useParams();
  const { user, workerProfile } = useAuth();
  const [fed, setFed] = useState(null);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [disburseAmt, setDisburseAmt] = useState("");
  const [disburseNote, setDisburseNote] = useState("");

  const load = useCallback(() => {
    api.getFederation(id).then(setFed).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (fn) => {
    try {
      await fn();
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!fed) return null;
  const isAdmin = user?.role === "federation" || (workerProfile && workerProfile.federationId === Number(id) && workerProfile.federationRole === "admin");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-slate-900">{fed.name}</h1>
      <p className="text-sm text-slate-500">
        {fed.memberCount} members{isAdmin ? " · You are the admin" : ""}
      </p>
      {error && <p className="mt-2 text-sm font-medium text-rose-600">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Welfare Fund</p>
          <p className="text-2xl font-bold text-slate-900">₹{fed.welfareFund}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Maintenance Fund</p>
          <p className="text-2xl font-bold text-slate-900">₹{fed.maintenanceFund}</p>
        </div>
      </div>

      {isAdmin && (
        <>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-800">Pending Join Requests</h2>
            <div className="mt-3 space-y-2">
              {(!fed.pendingRequests || fed.pendingRequests.length === 0) && (
                <p className="text-sm text-slate-400">None right now.</p>
              )}
              {fed.pendingRequests?.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2">
                  <span className="text-sm font-medium text-slate-700">{r.user?.name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => act(() => api.decideJoinRequest(fed.id, r.id, "approve"))}
                      className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-amber-400"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => act(() => api.decideJoinRequest(fed.id, r.id, "reject"))}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-800">Disburse Welfare Fund</h2>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                placeholder="Amount"
                type="number"
                value={disburseAmt}
                onChange={(e) => setDisburseAmt(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-28"
              />
              <input
                placeholder="Reason (e.g. medical cover for Ramesh)"
                value={disburseNote}
                onChange={(e) => setDisburseNote(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                onClick={() =>
                  act(async () => {
                    await api.disburseWelfare(fed.id, { amount: disburseAmt, note: disburseNote });
                    setDisburseAmt("");
                    setDisburseNote("");
                  })
                }
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400"
              >
                Disburse
              </button>
            </div>
            <div className="mt-6">
              <h2 className="font-semibold text-slate-800">Welfare Ledger</h2>
            <div className="mt-3 space-y-1">
              {fed.welfareLedger?.map((l) => (
                <div key={l.id} className="flex justify-between text-sm text-slate-500">
                  <span>{l.note}</span>
                  <span>₹{l.amount}</span>
                </div>
              ))}
            </div>
            </div>
            
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-800">Post an Announcement</h2>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="e.g. Monthly meet on Sunday, 10am"
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                onClick={() =>
                  act(async () => {
                    await api.postAnnouncement(fed.id, announcement);
                    setAnnouncement("");
                  })
                }
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400"
              >
                Post
              </button>
            </div>
          </div>

          {fed.disputes?.length > 0 && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-800">Disputes</h2>
              <div className="mt-3 space-y-2">
                {fed.disputes.map((d) => (
                  <div key={d.id} className="rounded-xl border border-slate-100 p-3">
                    <p className="text-sm text-slate-700">{d.description}</p>
                    <p className="text-xs text-slate-400">
                      Status: {d.status}
                      {d.resolution ? ` — ${d.resolution}` : ""}
                    </p>
                    {d.status === "open" && (
                      <button
                        onClick={() => act(() => api.resolveDispute(fed.id, d.id, "Reviewed and resolved by federation"))}
                        className="mt-2 rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-50"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {fed.members && fed.members.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-800">Members</h2>
          <div className="mt-3 space-y-2">
            {fed.members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-700">
                    {m.name} <span className="text-xs text-slate-400">· {m.profession}</span>
                  </p>
                  <p className="text-xs text-slate-400">{m.rating ? `${m.rating}★ (${m.ratingCount})` : "No ratings yet"}</p>
                </div>
                <span className="font-semibold text-slate-800">₹{m.wallet}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {fed.announcements?.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-800">Announcements</h2>
          <div className="mt-3 space-y-2">
            {fed.announcements.map((a) => (
              <div key={a.id} className="text-sm text-slate-600">
                <span className="font-medium text-slate-800">{new Date(a.createdAt).toLocaleDateString()}:</span> {a.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
