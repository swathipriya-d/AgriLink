import { useEffect, useState } from 'react';
import { ArrowRight, Check, Leaf, Shield, ShoppingBasket, Sprout, Store } from 'lucide-react';
import { useMarket } from '../App.jsx';
import Modal from './Modal.jsx';

const blankForm = { fullName: '', email: '', password: '', role: 'buyer', buyerType: 'retailer', farmName: '', district: '', state: 'Maharashtra', bio: '', practices: '' };

function RoleCard({ selected, role, onSelect, icon: Icon, name, description }) {
  return (
    <button type="button" className={`role-card ${selected ? 'is-selected' : ''}`} aria-pressed={selected} onClick={() => onSelect(role)}>
      <span className="role-icon"><Icon size={21} strokeWidth={1.7} /></span>
      <span className="role-card-copy"><strong>{name}</strong><small>{description}</small></span>
      <span className="radio-dot" aria-hidden="true">{selected && <Check size={13} />}</span>
    </button>
  );
}

export default function AuthModal() {
  const { auth, health, closeAuth, signIn, register, signInAsDemo, notify } = useMarket();
  const [view, setView] = useState('choose');
  const [form, setForm] = useState(blankForm);
  const [role, setRole] = useState('buyer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const open = auth.open;
  useEffect(() => {
    if (!open) return;
    const initialRole = auth.role || 'buyer';
    setView(auth.view || 'choose');
    setRole(initialRole);
    setForm({ ...blankForm, role: initialRole });
    setError('');
  }, [open, auth.role, auth.view]);

  const selectedRole = role;
  const patchForm = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const run = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (view === 'register') await register({ ...form, role: selectedRole });
      else await signIn({ email: form.email, password: form.password });
    } catch (reason) { setError(reason.message || 'The market could not sign you in. Please try again.'); }
    finally { setBusy(false); }
  };

  const runDemo = async (demoRole) => {
    setBusy(true); setError('');
    try {
      await signInAsDemo(demoRole);
      setView('choose'); setForm(blankForm);
    } catch (reason) { setError(reason.message || 'The demonstration account could not be opened.'); }
    finally { setBusy(false); }
  };

  const selectAccount = (nextRole) => { setRole(nextRole); setForm((current) => ({ ...current, role: nextRole })); };
  const modalClose = () => { setError(''); setView('choose'); setForm(blankForm); closeAuth(); };
  const changeView = (nextView) => { setError(''); setView(nextView); setForm((current) => ({ ...current, role: selectedRole })); };

  return (
    <Modal open={open} onClose={modalClose} title={view === 'choose' ? 'Find your side of the market.' : view === 'register' ? 'Make room at the market.' : 'Good to see you again.'} eyebrow="A CLOSER KIND OF MARKET" size="medium">
      {view === 'choose' ? (
        <>
          <p className="auth-intro">Browse as a buyer, or set up your farm stand in a minute.</p>
          <div className="role-picker" role="group" aria-label="Choose an AgriLink role">
            <RoleCard selected={selectedRole === 'buyer'} role="buyer" onSelect={selectAccount} icon={ShoppingBasket} name="I buy good food" description="Shop direct from independent growers." />
            <RoleCard selected={selectedRole === 'farmer'} role="farmer" onSelect={selectAccount} icon={Sprout} name="I grow it" description="List a harvest and manage the field-to-market." />
          </div>
          <div className="auth-choice-buttons">
            <button type="button" className="button button-primary button-full" onClick={() => changeView('register')}>Get started <ArrowRight size={17} /></button>
            <button type="button" className="text-button" onClick={() => changeView('login')}>Already on AgriLink? Sign in <ArrowRight size={15} /></button>
          </div>
          {health.ready && health.demo ? (
            <div className="demo-signin">
              <div className="demo-signin-heading"><span><Shield size={15} /></span><strong>Explore the judge demo</strong></div>
              <p>Temporary session · illustrative records · no actual purchase or payment.</p>
              <div className="demo-role-row">
                <button disabled={busy} onClick={() => runDemo('buyer')} type="button"><ShoppingBasket size={15} /> Buyer</button>
                <button disabled={busy} onClick={() => runDemo('farmer')} type="button"><Sprout size={15} /> Farmer</button>
                <button disabled={busy} onClick={() => runDemo('admin')} type="button"><Store size={15} /> Moderator</button>
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
            </div>
          ) : health.ready ? (
            <div className="demo-connection"><Shield size={17} /><p>The live account service is on. Demo-only logins are unavailable when MongoDB persistence is enabled.</p></div>
          ) : (
            <div className="demo-connection"><Leaf size={17} /><p>You can still look around. To save or order, start the API locally with <code>pnpm dev</code>.</p></div>
          )}
          <small className="auth-terms">Your marketplace role only grants its documented actions. Farmers are not certified food-safety providers.</small>
        </>
      ) : (
        <form className="auth-form" onSubmit={run}>
          {view === 'register' && (
            <div className="form-field"><label htmlFor="auth-name">Name</label><input id="auth-name" name="fullName" value={form.fullName} onChange={patchForm} required minLength={2} maxLength={80} placeholder="Your first and last name" autoComplete="name" /></div>
          )}
          {view === 'register' && selectedRole === 'farmer' && (
            <>
              <div className="form-field"><label htmlFor="auth-farm">Farm or collective name</label><input id="auth-farm" name="farmName" value={form.farmName} onChange={patchForm} required maxLength={100} placeholder="The name on your produce crate" /></div>
              <div className="form-grid-two">
                <div className="form-field"><label htmlFor="auth-district">District</label><input id="auth-district" name="district" value={form.district} onChange={patchForm} required maxLength={80} placeholder="Your district" /></div>
                <div className="form-field"><label htmlFor="auth-state">State</label><input id="auth-state" name="state" value={form.state} onChange={patchForm} required maxLength={80} /></div>
              </div>
              <div className="form-field"><label htmlFor="auth-practices">What do you grow, and how?</label><input id="auth-practices" name="practices" value={form.practices} onChange={patchForm} maxLength={160} placeholder="Seasonal produce, open-field, seed saved…" /></div>
            </>
          )}
          <div className="form-field"><label htmlFor="auth-email">Email address</label><input id="auth-email" name="email" type="email" value={form.email} onChange={patchForm} required autoComplete="email" maxLength={254} placeholder="you@example.com" /></div>
          <div className="form-field"><label htmlFor="auth-password">Password</label><input id="auth-password" name="password" type="password" value={form.password} onChange={patchForm} required minLength={view === 'register' ? 10 : 1} maxLength={128} autoComplete={view === 'register' ? 'new-password' : 'current-password'} placeholder={view === 'register' ? 'At least 10 characters' : 'Your password'} /><small>{view === 'register' ? 'Ten characters or more; password is never saved in plain text.' : 'Your password is checked only by the server.'}</small></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-full" type="submit" disabled={busy}>{busy ? 'One moment…' : view === 'register' ? `Create ${selectedRole === 'farmer' ? 'farm' : 'buyer'} account` : 'Sign in'} <ArrowRight size={16} /></button>
          <button className="text-button auth-back" type="button" onClick={() => changeView(view === 'register' ? 'choose' : 'choose')}>Back to AgriLink <span>↗</span></button>
          {view === 'login' && <p className="auth-security-note">In this no-database demo, new email/password accounts reset when the API restarts. Seeded sample roles use the demo buttons. Administrator access cannot be created through public sign-up.</p>}
        </form>
      )}
    </Modal>
  );
}
