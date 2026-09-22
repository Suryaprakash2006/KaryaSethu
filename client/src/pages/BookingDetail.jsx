import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

const STATUS_LABEL = {
  requested: "Searching for an available worker...",
  assigned: "Waiting for worker to accept",
  accepted: "Worker is reviewing the issue",
  awaiting_approval: "Estimate sent — waiting for your approval",
  in_progress: "Work in progress",
  completed: "Work completed — ready for payment",
  paid: "Paid",
  reviewed: "Completed & reviewed",
};

export default function BookingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [disputeText, setDisputeText] = useState("");
  const [disputeOpen, setDisputeOpen] = useState(false);

  const load = useCallback(() => {
    api.getBooking(id).then(setBooking).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
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

  if (error && !booking) return <p className="p-8 text-center text-rose-600">{error}</p>;
  if (!booking) return null;

  const isOwner = user && booking.householdUserId === user.id;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="font-display text-xl font-bold text-slate-900">{booking.task}</h1>
      <p className="mt-1 text-sm text-slate-500">{booking.description}</p>
      {booking.imageDataUrl && (
        <img src={booking.imageDataUrl} alt="issue" className="mt-3 h-40 w-full rounded-xl object-cover" />
      )}

      <div className="mt-4 rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">Status</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {STATUS_LABEL[booking.status]}
          </span>
        </div>
        {booking.workerName && (
          <p className="mt-2 text-sm text-slate-600">
            Worker: <span className="font-semibold">{booking.workerName}</span>
            {booking.distanceKm ? ` · ${booking.distanceKm} km away` : ""}
          </p>
        )}

        <div className="mt-4 space-y-1 border-t border-slate-100 pt-4 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Base service charge</span>
            <span>₹{booking.baseServicePrice}</span>
          </div>
          {booking.extraExpenses.map((ex, i) => (
            <div key={i} className="flex justify-between text-slate-600">
              <span>{ex.label}</span>
              <span>₹{ex.amount}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-900">
            <span>Estimated total</span>
            <span>₹{booking.estimatedCost}</span>
          </div>
        </div>
      </div>

      {isOwner && booking.status === "awaiting_approval" && (
        <button
          onClick={() => act(() => api.approveEstimate(booking.id))}
          className="mt-4 w-full rounded-xl bg-amber-500 py-3 font-semibold text-slate-900 hover:bg-amber-400"
        >
          Approve Estimate & Let Worker Start
        </button>
      )}

      {isOwner && booking.status === "completed" && (
        <button
          onClick={() => act(() => api.payBooking(booking.id))}
          className="mt-4 w-full rounded-xl bg-amber-500 py-3 font-semibold text-slate-900 hover:bg-amber-400"
        >
          Pay ₹{booking.estimatedCost} via UPI
        </button>
      )}

      {isOwner && booking.status === "paid" && (
        <div className="mt-4 rounded-2xl border border-slate-200 p-5">
          <p className="font-semibold text-slate-800">Rate this service</p>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? "text-amber-500" : "text-slate-300"}`}>
                ★
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="How was the service?"
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-amber-500 focus:outline-none"
          />
          <button
            onClick={() => act(() => api.reviewBooking(booking.id, { rating, comment }))}
            className="mt-3 w-full rounded-xl bg-amber-500 py-2.5 font-semibold text-slate-900 hover:bg-amber-400"
          >
            Submit Review
          </button>
        </div>
      )}

      {booking.review && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          You rated this {booking.review.rating}★ — "{booking.review.comment}"
        </div>
      )}

      {isOwner && booking.status !== "requested" && (
        <div className="mt-4">
          {!disputeOpen ? (
            <button onClick={() => setDisputeOpen(true)} className="text-sm font-medium text-slate-400 hover:text-rose-600">
              Report a problem with this job
            </button>
          ) : (
            <div className="mt-2 rounded-xl border border-rose-200 p-4">
              <textarea
                value={disputeText}
                onChange={(e) => setDisputeText(e.target.value)}
                rows={2}
                placeholder="Describe the issue for the federation to review"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none"
              />
              <button
                onClick={() =>
                  act(async () => {
                    await api.disputeBooking(booking.id, { description: disputeText });
                    setDisputeOpen(false);
                    setDisputeText("");
                  })
                }
                className="mt-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400"
              >
                Escalate to Federation
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
    </div>
  );
}
