import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";

export default function BookService() {
  const { service } = useParams();
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);
  const [description, setDescription] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.services().then((all) => setMeta(all[service]));
  }, [service]);

  const onImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const booking = await api.createBooking({ service, description, imageDataUrl });
      navigate(`/bookings/${booking.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!meta) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="font-display text-xl font-bold text-slate-900">{meta.task}</h1>
      <div className="mt-2 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4">
        <span className="text-sm text-slate-600">Cooperative approved base price</span>
        <span className="text-lg font-bold text-slate-900">₹{meta.price}</span>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-600">Describe the problem</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-amber-500 focus:outline-none"
            placeholder="Tell the worker what's wrong..."
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Add a photo (optional)</label>
          <input type="file" accept="image/*" onChange={onImage} className="mt-1 w-full text-sm" />
          {imageDataUrl && <img src={imageDataUrl} alt="preview" className="mt-2 h-32 rounded-xl object-cover" />}
        </div>
        {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded-xl bg-amber-500 py-3 font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
        >
          {busy ? "Booking..." : "Book Now"}
        </button>
      </form>
    </div>
  );
}
