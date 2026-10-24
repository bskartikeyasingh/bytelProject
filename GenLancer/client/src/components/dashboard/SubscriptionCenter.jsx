import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { authFetch } from '../../lib/supabase';
import { CreditCard, Clock3, ShieldCheck, X, Loader2, Megaphone } from 'lucide-react';

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => reject(new Error('Unable to load Razorpay checkout.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Unable to load Razorpay checkout.'));
    document.body.appendChild(script);
  });
}

function timeRemaining(expiresAt) {
  if (!expiresAt) return 'Not subscribed';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const days = Math.ceil(ms / 86400000);
  if (days < 1) return 'Less than 1 day left';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

export default function SubscriptionCenter({ role = 'creator' }) {
  const isCreator = ['creator', 'freelancer'].includes(String(role).toLowerCase());
  const [status, setStatus] = useState({ subscriptions: [], active: [] });
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(isCreator ? 'monthly' : 'monthly');
  const [agencyMonths, setAgencyMonths] = useState(1);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [showSponsoredPopup, setShowSponsoredPopup] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const response = await authFetch('/api/subscriptions/status');
      const payload = await response.json();
      if (response.ok && payload.success) setStatus({ subscriptions: payload.subscriptions || [], active: payload.active || [] });
    } catch (_) {
      // Keep the dashboard usable if subscriptions have not been configured yet.
    }
  }, []);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  useEffect(() => {
    if (isCreator) {
      let cancelled = false;
      let repeatTimer;
      const firstTimer = window.setTimeout(async () => {
        try {
          const response = await authFetch('/api/subscriptions/promotions/available');
          const payload = await response.json();
          if (!cancelled && response.ok && payload.available) {
            setShowSponsoredPopup(true);
            repeatTimer = window.setInterval(() => setShowSponsoredPopup(true), 10 * 60 * 1000);
          }
        } catch (_) { /* Sponsored placements remain hidden if the service is unavailable. */ }
      }, 10 * 60 * 1000);
      return () => { cancelled = true; window.clearTimeout(firstTimer); if (repeatTimer) window.clearInterval(repeatTimer); };
    }
  }, [isCreator]);

  const portfolioSubscription = useMemo(() => status.active.find(item => item.subscription_type === 'creator_portfolio'), [status.active]);
  const agencySubscription = useMemo(() => status.active.find(item => item.subscription_type === 'agency_access'), [status.active]);
  const promotionSubscription = useMemo(() => status.active.find(item => item.subscription_type === 'creator_promotion'), [status.active]);
  const primarySubscription = isCreator ? portfolioSubscription : agencySubscription;
  const expiresAt = primarySubscription?.expires_at;
  const remaining = expiresAt ? timeRemaining(expiresAt) : 'Inactive';

  const startPayment = async (subscriptionType, selectedPlan) => {
    setBusy(true);
    setNotice('');
    try {
      await loadRazorpay();
      const orderResponse = await authFetch('/api/subscriptions/order', {
        method: 'POST', body: JSON.stringify({ subscription_type: subscriptionType, plan: selectedPlan })
      });
      const orderPayload = await orderResponse.json();
      if (!orderResponse.ok || !orderPayload.success) throw new Error(orderPayload.error || 'Unable to start payment.');

      const options = {
        key: orderPayload.key_id,
        amount: orderPayload.order.amount,
        currency: orderPayload.order.currency,
        name: 'GenLancer',
        description: subscriptionType === 'creator_portfolio' ? 'Creator portfolio visibility' : subscriptionType === 'agency_access' ? 'Agency subscription' : 'AI Creator promotion',
        order_id: orderPayload.order.id,
        image: '/genlancer-logo.png',
        method: { upi: true, card: true, netbanking: true, wallet: true },
        handler: async (response) => {
          try {
            const verifyResponse = await authFetch('/api/subscriptions/verify', {
              method: 'POST', body: JSON.stringify(response)
            });
            const verifyPayload = await verifyResponse.json();
            if (!verifyResponse.ok || !verifyPayload.success) throw new Error(verifyPayload.error || 'Payment verification failed.');
            setNotice('Payment verified. Your subscription is active.');
            await refreshStatus();
            setOpen(false);
          } catch (error) {
            setNotice(error.message || 'Payment verification failed. Contact support with your payment ID.');
          } finally { setBusy(false); }
        },
        modal: { ondismiss: () => setBusy(false) },
        theme: { color: '#FF6B00' }
      };
      const checkout = new window.Razorpay(options);
      checkout.on('payment.failed', (event) => {
        setNotice(event?.error?.description || 'Payment failed. Please try again.');
        setBusy(false);
      });
      checkout.open();
    } catch (error) {
      setNotice(error.message || 'Could not open payment checkout.');
      setBusy(false);
    }
  };

  return (
    <>
      {isCreator && showSponsoredPopup && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="sponsored-creator-title">
        <div className="relative w-full max-w-sm rounded-2xl border border-orange-100 bg-white p-6 text-center shadow-2xl">
          <button type="button" onClick={() => setShowSponsoredPopup(false)} className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close sponsored creator promotion"><X className="h-4 w-4" /></button>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-[#FF6B00]"><Megaphone className="h-6 w-6" /></div>
          <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#FF6B00]">Sponsored</p>
          <h2 id="sponsored-creator-title" className="mt-1 text-lg font-extrabold text-slate-900">Discover AI creator opportunities</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">Explore promoted creative work and discover new ways to showcase your skills on GenLancer.</p>
          <button type="button" onClick={() => setShowSponsoredPopup(false)} className="mt-5 w-full rounded-xl bg-[#FF6B00] px-4 py-3 text-sm font-bold text-white">Continue working</button>
        </div>
      </div>}
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex flex-col items-end text-right leading-tight mr-1">
          <span className="text-[10px] uppercase tracking-wide font-bold text-slate-500">Subscription</span>
          <span className={`text-xs font-bold ${primarySubscription ? 'text-emerald-700' : 'text-amber-700'}`}>
            {primarySubscription ? remaining : 'Inactive'}
          </span>
        </div>
        <button type="button" onClick={() => { setNotice(''); setOpen(true); }} className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-[#E05E00] hover:bg-orange-100 transition-colors">
          <CreditCard className="h-3.5 w-3.5" /> {primarySubscription ? 'Manage plan' : 'Subscribe'}
        </button>
      </div>

      {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="subscription-title">
        <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="subscription-title" className="text-lg font-extrabold text-slate-900">GenLancer subscriptions</h2>
              <p className="mt-1 text-xs text-slate-500">Payments are verified by the server before access is activated.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="h-4 w-4" /></button>
          </div>

          <div className="mt-4 space-y-3">
            {isCreator ? <>
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 font-bold text-slate-900"><ShieldCheck className="h-4 w-4 text-[#FF6B00]" /> Creator portfolio visibility</div>
                <p className="mt-1 text-xs text-slate-500">Your portfolio appears in agency search while this subscription is active.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setPlan('weekly')} className={`rounded-lg border p-3 text-left ${plan === 'weekly' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}>
                    <span className="block text-sm font-bold">Weekly</span><span className="text-xs text-slate-500">7 days · ₹99</span>
                  </button>
                  <button type="button" onClick={() => setPlan('monthly')} className={`rounded-lg border p-3 text-left ${plan === 'monthly' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}>
                    <span className="block text-sm font-bold">Monthly</span><span className="text-xs text-slate-500">1 month · ₹299</span>
                  </button>
                </div>
                <button disabled={busy} onClick={() => startPayment('creator_portfolio', plan)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B00] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Pay securely with Razorpay
                </button>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><Clock3 className="mr-1 inline h-3.5 w-3.5" /> Current status: <strong>{primarySubscription ? 'Active' : 'Inactive'}</strong>{expiresAt ? ` · Expires ${new Date(expiresAt).toLocaleDateString()}` : ''}</div>
            </> : <>
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="font-bold text-slate-900">Agency access</div>
                <p className="mt-1 text-xs text-slate-500">Choose any duration from 1 month to 24 months.</p>
                <label className="mt-3 block text-xs font-semibold text-slate-700">Duration: {agencyMonths} month{agencyMonths === 1 ? '' : 's'}</label>
                <input type="range" min="1" max="24" value={agencyMonths} onChange={event => setAgencyMonths(Number(event.target.value))} className="mt-2 w-full accent-orange-500" />
                <div className="flex justify-between text-[10px] text-slate-400"><span>1 month</span><span>12 months</span><span>24 months</span></div>
                <button disabled={busy} onClick={() => startPayment('agency_access', `months:${agencyMonths}`)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B00] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Subscribe to agency access
                </button>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 font-bold text-slate-900"><Megaphone className="h-4 w-4 text-[#FF6B00]" /> AI creator promotion</div>
                <p className="mt-1 text-xs text-slate-500">Purchase a monthly promotional slot to promote an AI creator in the sponsored discovery experience.</p>
                <button disabled={busy} onClick={() => startPayment('creator_promotion', 'monthly')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 text-sm font-bold text-[#E05E00] disabled:opacity-60">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />} Subscribe to promotion · ₹499/month
                </button>
                {promotionSubscription && <p className="mt-2 text-xs text-emerald-700">Promotion active until {new Date(promotionSubscription.expires_at).toLocaleDateString()}.</p>}
              </div>
              {agencySubscription && <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Agency access: <strong>{timeRemaining(agencySubscription.expires_at)}</strong> · Expires {new Date(agencySubscription.expires_at).toLocaleDateString()}</div>}
            </>}
          </div>
          {notice && <p role="status" className={`mt-4 rounded-lg p-3 text-xs ${notice.toLowerCase().includes('active') ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{notice}</p>}
          <p className="mt-4 text-[10px] leading-relaxed text-slate-400">Razorpay checkout shows payment methods enabled for your account, including UPI. Desktop UPI QR availability depends on the Razorpay account and checkout configuration. Prices are configurable in server/.env.</p>
        </div>
      </div>}
    </>
  );
}
