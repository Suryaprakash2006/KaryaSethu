const BASE = "http://localhost:4000/api";

function authHeaders() {
  const token = localStorage.getItem("ks_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

export const api = {
  signup: (payload) => request("/auth/signup", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  federationLogin: (payload) => request("/auth/federation-login", { method: "POST", body: payload }),
  me: () => request("/auth/me"),

  services: () => request("/services"),

  createBooking: (payload) => request("/bookings", { method: "POST", body: payload }),
  myBookings: () => request("/bookings/mine"),
  getBooking: (id) => request(`/bookings/${id}`),
  approveEstimate: (id) => request(`/bookings/${id}/approve-estimate`, { method: "POST" }),
  payBooking: (id) => request(`/bookings/${id}/pay`, { method: "POST" }),
  reviewBooking: (id, payload) => request(`/bookings/${id}/review`, { method: "POST", body: payload }),
  disputeBooking: (id, payload) => request(`/bookings/${id}/dispute`, { method: "POST", body: payload }),

  updateWorkerProfile: (payload) => request("/worker/profile", { method: "PUT", body: payload }),
  verifyAadhaar: (payload) => request("/worker/aadhaar-verify", { method: "POST", body: payload }),
  setDuty: (onDuty) => request("/worker/duty", { method: "PATCH", body: { onDuty } }),
  incomingJobs: () => request("/worker/incoming"),
  activeJobs: () => request("/worker/active"),
  jobHistory: () => request("/worker/history"),
  acceptJob: (id) => request(`/worker/bookings/${id}/accept`, { method: "POST" }),
  declineJob: (id) => request(`/worker/bookings/${id}/decline`, { method: "POST" }),
  addExpense: (id, payload) => request(`/worker/bookings/${id}/expenses`, { method: "POST", body: payload }),
  sendEstimate: (id) => request(`/worker/bookings/${id}/send-estimate`, { method: "POST" }),
  startJob: (id) => request(`/worker/bookings/${id}/start`, { method: "POST" }),
  completeJob: (id) => request(`/worker/bookings/${id}/complete`, { method: "POST" }),

  federations: () => request("/federations"),
  createFederation: (payload) => request("/federations", { method: "POST", body: payload }),
  joinFederation: (id) => request(`/federations/${id}/join`, { method: "POST" }),
  getFederation: (id) => request(`/federations/${id}`),
  decideJoinRequest: (fedId, reqId, decision) =>
    request(`/federations/${fedId}/join-requests/${reqId}/${decision}`, { method: "POST" }),
  postAnnouncement: (fedId, text) => request(`/federations/${fedId}/announcements`, { method: "POST", body: { text } }),
  disburseWelfare: (fedId, payload) => request(`/federations/${fedId}/welfare/disburse`, { method: "POST", body: payload }),
  resolveDispute: (fedId, disputeId, resolution) =>
    request(`/federations/${fedId}/disputes/${disputeId}/resolve`, { method: "POST", body: { resolution } }),
};
