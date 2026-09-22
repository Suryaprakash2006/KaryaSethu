import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

const SERVICE_KEYS = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "Painter",
  "Mason",
  "Cleaner",
  "ACMechanic",
  "ApplianceRepair",
  "Welder",
  "Tailor",
];

export default function WorkerHome() {
  const { user, workerProfile, federation, refresh } = useAuth();
  const [profession, setProfession] = useState(SERVICE_KEYS[0]);
  const [experience, setExperience] = useState(0);
  const [aadhaar, setAadhaar] = useState("");
  const [incoming, setIncoming] = useState([]);
  const [active, setActive] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [expenseForm, setExpenseForm] = useState({});

  const loadJobs = useCallback(() => {
    api.incomingJobs().then(setIncoming).catch(() => {});
    api.activeJobs().then(setActive).catch(() => {});
    api.jobHistory().then(setHistory).catch(() => {});
  }, []);

  useEffect(() => {
    loadJobs();
    const t = setInterval(loadJobs, 4000);
    return () => clearInterval(t);
  }, [loadJobs]);

  const act = async (fn) => {
    try {
      await fn();
      await refresh();
      loadJobs();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!user || !workerProfile) return null;

  const profileComplete = !!workerProfile.profession;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-slate-900">Welcome, {user.name}</h1>
      {error && <p className="mt-2 text-sm font-medium text-rose-600">{error}</p>}

      {!profileComplete && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-800">Complete your profile</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-500">Trade</label>
              <select
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                {SERVICE_KEYS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-500">Experience (years)</label>
              <input
                type="number"
                min="0"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>
          </div>
          <button
            onClick={() => act(() => api.updateWorkerProfile({ profession, experienceYears: experience }))}
            className="mt-3 w-full rounded-xl bg-amber-500 py-2.5 font-semibold text-slate-900 hover:bg-amber-400"
          >
            Save Profile
          </button>
        </div>
      )}

      {profileComplete && !workerProfile.aadhaarVerified && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-800">Verify your Aadhaar</h2>
          <input
            value={aadhaar}
            onChange={(e) => setAadhaar(e.target.value)}
            placeholder="12-digit Aadhaar number"
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
          />
          <button
            onClick={() => act(() => api.verifyAadhaar({ aadhaarNumber: aadhaar }))}
            className="mt-3 w-full rounded-xl bg-amber-500 py-2.5 font-semibold text-slate-900 hover:bg-amber-400"
          >
            Verify
          </button>
        </div>
      )}

      {profileComplete && workerProfile.aadhaarVerified && !workerProfile.federationId && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold text-slate-800">Join a cooperative</h2>
          <p className="mt-1 text-sm text-slate-600">
            You need to belong to a federation before you can go on duty and take up jobs. You can also start your
            own.
          </p>
          <Link
            to="/federations"
            className="mt-3 inline-block rounded-xl bg-amber-500 px-4 py-2.5 font-semibold text-slate-900 hover:bg-amber-400"
          >
            Browse Federations
          </Link>
        </div>
      )}

      {profileComplete && workerProfile.aadhaarVerified && workerProfile.federationId && (
        <>
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5">
            <div>
              <p className="font-semibold text-slate-800">{workerProfile.onDuty ? "On Duty" : "Off Duty"}</p>
              <p className="text-xs text-slate-500">
                {federation?.name}
                {workerProfile.federationRole === "admin" ? " · Admin" : ""}
              </p>
            </div>
            <button
              onClick={() => act(() => api.setDuty(!workerProfile.onDuty))}
              className={`relative h-7 w-12 rounded-full transition ${workerProfile.onDuty ? "bg-emerald-500" : "bg-slate-300"}`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                  workerProfile.onDuty ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Wallet balance</p>
            <p className="text-2xl font-bold text-slate-900">₹{workerProfile.wallet}</p>
            <p className="text-xs text-slate-400">
              Rating:{" "}
              {workerProfile.ratingCount
                ? `${(workerProfile.ratingSum / workerProfile.ratingCount).toFixed(1)}★ (${workerProfile.ratingCount})`
                : "No ratings yet"}
            </p>
          </div>

          {incoming.map((job) => (
            <div key={job.id} className="mt-4 rounded-2xl border-2 border-rose-300 bg-rose-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-rose-600">New Job</p>
              <p className="mt-1 font-bold text-slate-900">{job.task}</p>
              <p className="text-sm text-slate-600">{job.description}</p>
              <p className="mt-1 text-sm text-slate-600">
                Distance: {job.distanceKm} km · Base: ₹{job.baseServicePrice}
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  onClick={() => act(() => api.acceptJob(job.id))}
                  className="flex-1 rounded-xl bg-amber-500 py-2.5 font-semibold text-slate-900 hover:bg-amber-400"
                >
                  Accept
                </button>
                <button
                  onClick={() => act(() => api.declineJob(job.id))}
                  className="flex-1 rounded-xl border border-rose-300 bg-white py-2.5 font-semibold text-rose-600 hover:bg-rose-100"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}

          {active.map((job) => (
            <div key={job.id} className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="font-semibold text-slate-800">{job.task}</p>
              <p className="text-sm text-slate-500">{job.description}</p>
              <p className="mt-1 text-xs font-medium text-slate-400">Estimated cost: ₹{job.estimatedCost}</p>

              {job.status === "accepted" && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      placeholder="Part / expense"
                      value={expenseForm[job.id]?.label || ""}
                      onChange={(e) =>
                        setExpenseForm({ ...expenseForm, [job.id]: { ...expenseForm[job.id], label: e.target.value } })
                      }
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="₹"
                      type="number"
                      value={expenseForm[job.id]?.amount || ""}
                      onChange={(e) =>
                        setExpenseForm({ ...expenseForm, [job.id]: { ...expenseForm[job.id], amount: e.target.value } })
                      }
                      className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => act(() => api.addExpense(job.id, expenseForm[job.id]))}
                      className="rounded-xl border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex gap-3">
                    {job.extraExpenses.length > 0 ? (
                      <button
                        onClick={() => act(() => api.sendEstimate(job.id))}
                        className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-slate-900 hover:bg-amber-400"
                      >
                        Send Estimate to Customer
                      </button>
                    ) : (
                      <button
                        onClick={() => act(() => api.startJob(job.id))}
                        className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-slate-900 hover:bg-amber-400"
                      >
                        Start Work
                      </button>
                    )}
                  </div>
                </div>
              )}

              {job.status === "awaiting_approval" && (
                <p className="mt-3 text-sm font-medium text-amber-600">Waiting for customer to approve the estimate...</p>
              )}

              {job.status === "in_progress" && (
                <button
                  onClick={() => act(() => api.completeJob(job.id))}
                  className="mt-3 w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-slate-900 hover:bg-amber-400"
                >
                  Complete Job
                </button>
              )}
            </div>
          ))}

          {incoming.length === 0 && active.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
              No jobs right now. Stay on duty to receive new requests.
            </div>
          )}

          {history.length > 0 && (
            <>
              <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">Recent jobs</h2>
              <div className="mt-2 space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm">
                    <span className="font-medium text-slate-700">{h.task}</span>
                    <span className="text-slate-500">
                      ₹{h.estimatedCost} · {h.status}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
