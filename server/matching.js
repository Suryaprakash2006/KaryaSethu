// Mocks a geofence scan: picks an on-duty, verified, federation-linked
// worker whose profession matches the booked service, and stamps a
// plausible distance. Excludes a specific worker (used when re-matching
// after a decline).
function assignCandidate(db, booking, excludeWorkerId) {
  const candidates = db.workerProfiles.filter(
    (w) =>
      w.profession === booking.service &&
      w.onDuty &&
      w.aadhaarVerified &&
      w.federationId &&
      w.userId !== excludeWorkerId
  );

  if (candidates.length > 0) {
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    booking.assignedWorkerId = pick.userId;
    booking.distanceKm = Number((0.5 + Math.random() * 4.4).toFixed(1));
    booking.status = "assigned";
  } else {
    booking.assignedWorkerId = null;
    booking.distanceKm = null;
    booking.status = "requested";
  }
}

module.exports = { assignCandidate };
