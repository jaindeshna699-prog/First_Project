import nodemailer from 'nodemailer';

let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function getIo(req) {
  return req?.app?.get('io') ?? null;
}

function emitToUsers(io, userIds, event, payload) {
  if (!io) return;
  for (const id of userIds) {
    io.to(`user:${id}`).emit(event, payload);
  }
}

function collectRecipients(donation) {
  const ids = [donation.donorId?.toString()];
  if (donation.matchedOrgId?.userId) ids.push(donation.matchedOrgId.userId.toString());
  else if (donation.matchedOrgId) ids.push(donation.matchedOrgId.toString());
  if (donation.driverId) ids.push(donation.driverId.toString());
  return ids.filter(Boolean);
}

async function sendEmail(to, subject, text) {
  if (!transporter) return;
  try {
    await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text });
  } catch (e) {
    console.error('Email failed:', e.message);
  }
}

function sendSms(_phone, _message) {
  // SMS stub — integrate Twilio / SNS here
}

export async function notifyStatus(req, donation, status) {
  const io = getIo(req);
  const payload = { donationId: donation._id, status, title: donation.title };

  console.log(`[notify] donation:${status} — ${donation.title} (${donation._id})`);
  emitToUsers(io, collectRecipients(donation), 'donation:status', payload);
}

export async function notifyMatched(req, donation) {
  const io = getIo(req);
  const payload = { donationId: donation._id, status: 'matched', title: donation.title };

  console.log(`[notify] donation:matched — ${donation.title}`);
  emitToUsers(io, collectRecipients(donation), 'donation:matched', payload);
  await sendEmail(null, `Donation matched: ${donation.title}`, `Your donation "${donation.title}" has been matched.`);
}

export async function notifyAccepted(req, donation) {
  await notifyStatus(req, donation, 'accepted');
}

export async function notifyPickedUp(req, donation) {
  await notifyStatus(req, donation, 'picked_up');
}

export async function notifyDelivered(req, donation) {
  await notifyStatus(req, donation, 'delivered');
}

export async function notifyExpired(req, donation) {
  await notifyStatus(req, donation, 'expired');
}

export function notifyDriversNewJob(req, donation) {
  const io = getIo(req);
  if (!io) return;
  io.emit('donation:new', { donationId: donation._id, title: donation.title, status: donation.status });
}
