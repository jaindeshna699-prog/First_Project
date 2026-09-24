import { useState, useEffect } from 'react';

export default function ExpiryCountdown({ expiresAt }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeRemaining(expiresAt));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining(expiresAt));
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  function getTimeRemaining(target) {
    const diff = new Date(target).getTime() - Date.now();
    if (diff <= 0) return { expired: true, text: 'Expired', urgent: true };

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const urgent = diff < 30 * 60 * 1000; // Under 30 minutes is urgent
    let text = '';
    if (hours > 0) {
      text = `${hours}h ${minutes}m ${seconds}s`;
    } else {
      text = `${minutes}m ${seconds}s`;
    }

    return { expired: false, text, urgent };
  }

  if (timeLeft.expired) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
        <span>⏱️</span>
        <span>Expired</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${
        timeLeft.urgent
          ? 'text-rose-700 bg-rose-50 border-rose-300 animate-pulse'
          : 'text-amber-800 bg-amber-50 border-amber-200'
      }`}
    >
      <span>⏱️</span>
      <span>Expires in: {timeLeft.text}</span>
    </span>
  );
}
