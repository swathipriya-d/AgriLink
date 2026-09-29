import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, ArrowUpRight, BarChart3, Boxes, Camera, Check, CircleCheck, CircleHelp, Clock3, Edit3, Eye, FileCheck2, ImagePlus, Leaf, LoaderCircle, MapPin, Package, PackageCheck, Plus, Send, ShieldCheck, Sprout, Store, Trash2, Truck, UserRoundCheck, X } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useMarket, useToast } from '../App.jsx';
import { get, patch, post } from '../lib/api.js';
import { formatRupees, listingReviewStatus, normaliseProduct, PRODUCT_FALLBACK_IMAGE } from '../data/market.js';
import ProductCard from '../components/ProductCard.jsx';
import Modal from '../components/Modal.jsx';

const categories = ['Vegetables', 'Fruits', 'Grains & pulses', 'Herbs & greens', 'Dairy & pantry'];
const blankListing = () => ({ name: '', cultivar: '', category: 'Vegetables', pricePerKg: '', stockKg: '', minOrderKg: '1', harvestDate: new Date().toISOString().slice(0, 10), deliveryWindow: 'Tomorrow, 7–10 am', story: '', description: '', tags: '' });
const nextStep = { placed: 'confirmed', confirmed: 'packing', packing: 'ready', ready: 'delivered' };
const nextLabel = { placed: 'Confirm order', confirmed: 'Start packing', packing: 'Mark ready', ready: 'Mark delivered' };

function ListingReviewStamp({ product }) {
  const status = listingReviewStatus(product);
  return <span className={`stamp stamp-${status}`} aria-label={`Marketplace listing review: ${status}`}>{status === 'verified' ? <><Check size={11} /> REVIEWED</> : status === 'rejected' ? <><CircleHelp size={11} /> DETAILS NEEDED</> : 'REVIEW PENDING'}</span>;
}

function FarmAccess({ openAuth }) {
  return <main className="farm-access page-shell">
    <div className="farm-access-sticker"><Sprout size={23} /><span>THE GROWER'S SIDE</span></div>
    <p className="eyebrow">YOUR PLACE AT THE MARKET</p><h1>A stand with <em>your name on it.</em></h1>
    <p>Bring your current harvest and honest asking price. We'll give you a small, clear place to put them together.</p>
    <div className="farm-access-promises"><span><Check size={15} /> List a harvest</span><span><Check size={15} /> Track each order</span><span><Check size={15} /> See the shape of your market</span></div>
    <div className="farm-access-actions"><button className="button button-primary" onClick={() => openAuth('farmer')} type="button">Set up a grower account <ArrowRight size={16} /></button><Link className="text-arrow-link" to="/market">Or buy from your neighbours <ArrowUpRight size={15} /></Link></div>
    <p className="farm-access-note"><ShieldCheck size={14} /> A marketplace profile review is a grower-origin check, not food-safety certification.</p>
  </main>;
}

function ListingEditor({ open, onClose, existing, onCreate, onUpdate, notify }) {
  const [form, setForm] = useState(() => existing ? {
    name: existing.name, cultivar: existing.cultivar || '', category: existing.category || 'Vegetables', pricePerKg: String(existing.pricePerKg), stockKg: String(existing.stockKg), minOrderKg: String(existing.minOrderKg || 1), harvestDate: existing.harvestDate || new Date().toISOString().slice(0, 10), deliveryWindow: existing.deliveryWindow || '', story: existing.story || '', description: existing.description || '', tags: existing.tags?.join(', ') || '',
  } : blankListing());
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setError(''); setBusy(false); setPhoto(null); setPreview(existing?.imageUrl || null);
    setForm(existing ? { name: existing.name, cultivar: existing.cultivar || '', category: existing.category || 'Vegetables', pricePerKg: String(existing.pricePerKg), stockKg: String(existing.stockKg), minOrderKg: String(existing.minOrderKg || 1), harvestDate: existing.harvestDate || new Date().toISOString().slice(0, 10), deliveryWindow: existing.deliveryWindow || '', story: existing.story || '', description: existing.description || '', tags: existing.tags?.join(', ') || '' } : blankListing());
  }, [existing, open]);

  const update = (event) => setForm((value) => ({ ...value, [event.target.name]: event.target.value }));
  const selectPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Choose a JPEG, PNG, WebP or AVIF image up to 5 MB.'); event.target.value = ''; return; }
    const objectUrl = URL.createObjectURL(file);
    setPhoto(file); setPreview(objectUrl); setError('');
  };
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    const payload = {
      name: form.name.trim(), cultivar: form.cultivar.trim(), category: form.category,
      pricePerKg: Number(form.pricePerKg), stockKg: Number(form.stockKg), minOrderKg: Number(form.minOrderKg || 1),
      harvestDate: form.harvestDate, deliveryWindow: form.deliveryWindow.trim(), story: form.story.trim(), description: form.description.trim(),
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 8),
    };
    try {
      if (existing) await onUpdate(existing._id, payload, photo);
      else await onCreate(payload, photo);
      notify(existing ? 'The farm listing is updated.' : 'Your harvest is on the market and awaiting a listing review.');
      onClose();
    } catch (reason) { setError(reason.message || 'The listing could not be saved. Please try again.'); }
    finally { setBusy(false); }
  };

  return <Modal open={open} onClose={onClose} title={existing ? 'Make a market-note edit.' : 'Put this harvest on the table.'} eyebrow={existing ? 'THE FARM STUDIO · LISTING EDIT' : 'THE FARM STUDIO · NEW HARVEST'} size="large">
    <form onSubmit={submit} className="listing-form">
      <div className="listing-form-main">
        <div className="form-grid-two"><div className="form-field"><label htmlFor="listing-name">What are you picking? <i>*</i></label><input id="listing-name" name="name" required minLength={3} maxLength={100} value={form.name} onChange={update} placeholder="e.g. Sunrise field tomatoes" /></div><div className="form-field"><label htmlFor="listing-cultivar">Variety / kind</label><input id="listing-cultivar" name="cultivar" maxLength={90} value={form.cultivar} onChange={update} placeholder="The bit a good buyer asks about" /></div></div>
        <div className="form-grid-three"><div className="form-field"><label htmlFor="listing-category">Market section <i>*</i></label><select id="listing-category" name="category" value={form.category} onChange={update}>{categories.map((category) => <option key={category}>{category}</option>)}</select></div><div className="form-field"><label htmlFor="listing-price">Your asking price / kg <i>*</i></label><div className="field-prefix"><span>₹</span><input id="listing-price" name="pricePerKg" type="number" required min="1" max="100000" step="0.5" value={form.pricePerKg} onChange={update} placeholder="84" /></div></div><div className="form-field"><label htmlFor="listing-stock">Available today / kg <i>*</i></label><input id="listing-stock" name="stockKg" type="number" required min="0" max="1000000" step="0.5" value={form.stockKg} onChange={update} placeholder="28" /></div></div>
        <div className="form-grid-three"><div className="form-field"><label htmlFor="listing-minimum">Minimum order / kg</label><input id="listing-minimum" name="minOrderKg" type="number" required min="0.25" max="10000" step="0.25" value={form.minOrderKg} onChange={update} /></div><div className="form-field"><label htmlFor="listing-harvest">Harvest date <i>*</i></label><input id="listing-harvest" name="harvestDate" type="date" required value={form.harvestDate} onChange={update} /></div><div className="form-field"><label htmlFor="listing-dispatch">Dispatch note</label><input id="listing-dispatch" name="deliveryWindow" maxLength={100} value={form.deliveryWindow} onChange={update} placeholder="Tomorrow morning" /></div></div>
        <div className="form-field"><label htmlFor="listing-story">A note from your farm</label><textarea id="listing-story" name="story" rows={2} maxLength={420} value={form.story} onChange={update} placeholder="What makes this picking yours? Tell us the honest detail." /><span className="field-meter">{form.story.length} / 420</span></div>
        <div className="form-field"><label htmlFor="listing-description">The useful buyer details</label><textarea id="listing-description" name="description" rows={2} maxLength={800} value={form.description} onChange={update} placeholder="What should someone know before placing a market request?" /></div>
        <div className="form-field"><label htmlFor="listing-tags">Market notes <span className="label-optional">OPTIONAL · SEPARATE WITH COMMAS</span></label><input id="listing-tags" name="tags" value={form.tags} maxLength={150} onChange={update} placeholder="Picked today, small batch, no cold storage" /></div>
      </div>
      <div className="listing-form-side"><div className="photo-preview-tile"><img src={preview || PRODUCT_FALLBACK_IMAGE} alt={preview ? 'Selected crop photo preview' : 'A market illustration will be used until a crop photo is uploaded'} onError={(event) => { event.currentTarget.src = PRODUCT_FALLBACK_IMAGE; }} /><div className="photo-preview-tag"><Camera size={13} /> {photo ? 'YOUR PHOTO PREVIEW' : existing?.imageUrl ? 'CURRENT LISTING PHOTO' : 'AN HONEST LITTLE ILLUSTRATION'}</div></div><button className="button button-paper-dark photo-select-button" type="button" onClick={() => inputRef.current?.click()}><ImagePlus size={16} />{photo ? 'Choose a different photo' : 'Add a harvest photo'}</button><input ref={inputRef} className="visually-hidden-input" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={selectPhoto} /><p className="photo-upload-note">Max 5 MB · JPEG, PNG, WebP or AVIF. The selected file is only sent to Cloudinary when it is configured. Otherwise it stays in this browser.</p><div className="review-note"><ShieldCheck size={17} /><p>New listings are labelled pending until an authorised moderator reviews the listing. This is a marketplace screen—not official crop or food-safety certification.</p></div><div className="field-checklist"><span><Check size={14} /> Your asking price stays yours</span><span><Check size={14} /> Stock can be updated any time</span><span><Check size={14} /> Orders ask before they confirm</span></div></div>
      {error && <div className="listing-form-error form-error" role="alert"><AlertCircle size={15} /> {error}</div>}
      <div className="listing-form-footer"><button className="text-button" type="button" onClick={onClose}>Keep this in the field</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={16} /> Saving…</> : <>{existing ? 'Save farm changes' : 'Put it on the table'}<ArrowRight size={16} /></>}</button></div>
    </form>
  </Modal>;
}

function VerificationForm({ open, close, user, notify, onSubmitted }) {
  const [form, setForm] = useState({ farmName: user?.farmProfile?.name || '', district: user?.farmProfile?.district || '', state: user?.farmProfile?.state || '', crops: '', practices: user?.farmProfile?.practices || '', growerNote: user?.farmProfile?.bio || '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = (event) => setForm((value) => ({ ...value, [event.target.name]: event.target.value }));
  useEffect(() => { if (open) setError(''); }, [open]);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await post('/verification', { ...form, crops: form.crops.split(',').map((crop) => crop.trim()).filter(Boolean).slice(0, 12) });
      onSubmitted(response.data.verification);
      notify('Your origin note is in the moderator queue.'); close();
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };
  return <Modal open={open} onClose={close} title="Put your farm on the map." eyebrow="A CONVERSATION ABOUT ORIGIN" size="medium">
    <p className="verification-form-intro">The market reviews a grower profile and the details they submit. This is about who and where—not a food-safety or organic certification.</p>
    <form onSubmit={submit} className="auth-form"><div className="form-field"><label htmlFor="verify-farm">Farm or collective name</label><input id="verify-farm" name="farmName" required value={form.farmName} onChange={change} maxLength={100} /></div><div className="form-grid-two"><div className="form-field"><label htmlFor="verify-district">District</label><input id="verify-district" name="district" required value={form.district} onChange={change} maxLength={80} /></div><div className="form-field"><label htmlFor="verify-state">State</label><input id="verify-state" name="state" required value={form.state} onChange={change} maxLength={80} /></div></div><div className="form-field"><label htmlFor="verify-crops">Crops you grow <i>*</i></label><input id="verify-crops" name="crops" required value={form.crops} onChange={change} maxLength={280} placeholder="Tomatoes, roots, mangoes… separated by commas" /></div><div className="form-field"><label htmlFor="verify-practices">A little about how you farm</label><input id="verify-practices" name="practices" value={form.practices} onChange={change} maxLength={240} placeholder="The plain-spoken version" /></div><div className="form-field"><label htmlFor="verify-story">A word from your farm</label><textarea id="verify-story" name="growerNote" rows={3} value={form.growerNote} onChange={change} maxLength={640} /></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary button-full" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send origin note for review'} <ArrowRight size={16} /></button></form>
  </Modal>;
}

function VerificationStatus({ status, lastDecision, user, onRequest }) {
  const meta = {
    verified: { icon: <CircleCheck size={19} />, headline: 'Your grower profile has been reviewed.', text: 'This market identity check recognises your farm details, not food safety or organic credentials.', tone: 'verified' },
    pending: { icon: <Clock3 size={19} />, headline: 'Your origin note is in the review queue.', text: 'Market moderation is still a conversation, not an official certification.', tone: 'pending' },
    rejected: { icon: <CircleHelp size={19} />, headline: 'Your origin note needs another detail.', text: lastDecision || 'You can update the farm and crop details, then send an updated request.', tone: 'rejected' },
    not_requested: { icon: <Sprout size={19} />, headline: 'A grower story worth tracing.', text: 'Ask the market to review your name, farm and crops. No documents or official certification are implied.', tone: 'unrequested' },
  }[status] || { icon: <Sprout size={19} />, headline: 'A grower story worth tracing.', text: 'Share your farm, place and crops so shoppers can see the person behind the listing.', tone: 'unrequested' };
  return <div className={`verification-status-card status-${meta.tone}`}><span className="verification-status-icon">{meta.icon}</span><div className="verification-status-copy"><b>{meta.headline}</b><p>{meta.text}</p></div>{status !== 'verified' && status !== 'pending' && <button className="button button-paper-dark" onClick={onRequest} type="button">{status === 'rejected' ? 'Update your origin note' : 'Start a grower review'} <ArrowRight size={15} /></button>}</div>;
}

function OrderDeskRow({ order, refresh, notify }) {
  const [busy, setBusy] = useState(false);
  const next = nextStep[order.status];
  const handle = async () => {
    if (!next) return;
    setBusy(true);
    try { await patch(`/orders/${encodeURIComponent(order._id)}/status`, { status: next }); await refresh(); notify(`Order ${order.orderNumber} moved to ${next}.`); }
    catch (error) { notify(error.message); }
    finally { setBusy(false); }
  };
  return <div className="order-desk-row"><span className="order-list-icon"><PackageCheck size={18} /></span><div className="order-desk-main"><b>{order.orderNumber}</b><span>{order.buyerName} · {order.items?.map((item) => `${item.quantityKg} kg ${item.productName}`).join(', ')}</span><small>no payment collected · created in {order.status}</small></div><div className="order-desk-total"><b>{formatRupees(order.subtotal)}</b>{next && <button className="text-arrow-link" onClick={handle} disabled={busy} type="button">{busy ? 'Saving…' : nextLabel[order.status]} <ArrowUpRight size={14} /></button>}<span className={`order-status-tag status-${order.status}`}>{order.status}</span></div></div>;
}

function GrowerMetrics({ data }) {
  const metricData = [
    { icon: Package, label: 'Active picks', value: data?.activeListings ?? '—', caption: 'offered today' },
    { icon: Boxes, label: 'Stock running low', value: data?.lowStockListings ?? '—', caption: 'under 10 kg' },
    { icon: Store, label: 'Open requests', value: data?.openOrders ?? '—', caption: 'across your farm' },
    { icon: BarChart3, label: 'Order value', value: data ? formatRupees(data.grossOrderValue || 0) : '—', caption: 'illustrative; not payout' },
  ];
  return <div className="farm-metrics-grid">{metricData.map(({ icon: Icon, label, value, caption }) => <article className="farm-metric-card" key={label}><span className="metric-icon"><Icon size={17} strokeWidth={1.7} /></span><span className="metric-label">{label}</span><strong>{value}</strong><small>{caption}</small></article>)}</div>;
}

function AdminMarketDesk({ notify }) {
  const [verifications, setVerifications] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [verificationResponse, listingResponse] = await Promise.all([get('/verification/queue'), get('/products/review-queue')]);
      setVerifications(verificationResponse.data.verifications || []);
      setListings(listingResponse.data.products || []);
    } catch (reason) { setError(reason.message || 'Could not open the review queue.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const reviewVerification = async (record, status) => {
    setBusyId(record._id);
    try { await patch(`/verification/${encodeURIComponent(record._id)}/review`, { status, reviewNote: status === 'verified' ? 'Grower origin details reviewed in the AgriLink demo.' : 'Please share one clearer piece of origin information.' }); notify(`Grower profile marked ${status}.`); await refresh(); }
    catch (reason) { notify(reason.message); }
    finally { setBusyId(null); }
  };
  const reviewProduct = async (product, status) => {
    setBusyId(product._id);
    try { await patch(`/products/${encodeURIComponent(product._id)}/verification`, { status }); notify(`Listing marked ${status}.`); await refresh(); }
    catch (reason) { notify(reason.message); }
    finally { setBusyId(null); }
  };

  return <section className="moderation-desk">
    <div className="farm-panel-heading"><div><p className="eyebrow"><ShieldCheck size={14} /> MARKET MODERATION</p><h2>A good market checks the <em>details.</em></h2><p>Human review of the submitted grower/listing details—not food-safety certification.</p></div><button onClick={refresh} className="button button-paper-dark" type="button"><Eye size={15} /> Refresh queue</button></div>
    {loading ? <div className="market-loading"><LoaderCircle className="spin" size={18} /> Looking at the review cards…</div> : error ? <div className="queue-empty"><AlertCircle size={17} /><p>{error}</p></div> : <>
      <div className="admin-queue-heading"><span><UserRoundCheck size={16} /><b>Grower origin notes</b></span><span className="queue-count">{verifications.length} WAITING</span></div>
      {verifications.length ? <div className="moderation-cards">{verifications.map((item) => <article className="moderation-card" key={item._id}><div className="moderation-card-intro"><span className="seller-card-avatar"><Sprout size={18} /></span><div><b>{item.farmName}</b><small>{item.fullName} · {item.district}, {item.state}</small></div><span className="stamp stamp-pending"><Clock3 size={12} />PENDING</span></div><p><b>Crop notes:</b> {item.crops.join(', ')}</p><p className="grower-note">“{item.growerNote || item.practices || 'A new market neighbour.'}”</p><div className="moderation-actions"><button type="button" className="button button-review-yes" onClick={() => reviewVerification(item, 'verified')} disabled={Boolean(busyId)}>{busyId === item._id ? 'Saving…' : <><Check size={15} /> Review profile</>}</button><button type="button" className="button button-review-no" onClick={() => reviewVerification(item, 'rejected')} disabled={Boolean(busyId)}>Needs a detail</button></div></article>)}</div> : <div className="queue-empty"><CircleCheck size={17} /><p>The grower queue is clear.</p></div>}
      <div className="admin-queue-heading"><span><FileCheck2 size={16} /><b>Listing detail checks</b></span><span className="queue-count">{listings.length} WAITING</span></div>
      {listings.length ? <div className="moderation-cards">{listings.map((item) => <article className="moderation-card listing-review-card" key={item._id}><div className="listing-review-line"><img src={item.imageUrl || PRODUCT_FALLBACK_IMAGE} alt="" onError={(event) => { event.currentTarget.src = PRODUCT_FALLBACK_IMAGE; }} /><div className="listing-review-copy"><b>{item.name}</b><small>{item.farmName} · {item.city}, {item.state}</small><small>{item.stockKg} kg · {formatRupees(item.pricePerKg)}/kg</small></div></div><div className="moderation-actions"><button type="button" className="button button-review-yes" onClick={() => reviewProduct(item, 'verified')} disabled={Boolean(busyId)}><Check size={15} /> Review listing</button><button type="button" className="button button-review-no" onClick={() => reviewProduct(item, 'rejected')} disabled={Boolean(busyId)}>Needs a detail</button></div></article>)}</div> : <div className="queue-empty"><CircleCheck size={17} /><p>There are no listings waiting for review.</p></div>}
      <p className="admin-demo-warning"><CircleHelp size={14} /> In this local demo, the Market Keeper role is intentionally available to illustrate permissions. Production moderator access must come from a protected account-management process.</p>
    </>}
  </section>;
}

function FarmerDashboard() {
  const { user, products, createListing, updateListing, archiveListing, notify } = useMarket();
  const [listingModal, setListingModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [verifyModal, setVerifyModal] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [verification, setVerification] = useState(null);
  const [refreshing, setRefreshing] = useState(true);
  const isFarmer = user?.role === 'farmer';

  const refresh = useCallback(async () => {
    if (!isFarmer) return;
    setRefreshing(true);
    try {
      const [analyticsResponse, orderResponse, verifyResponse] = await Promise.all([get('/analytics/farmer'), get('/orders'), get('/verification/me')]);
      setAnalytics(analyticsResponse.data.analytics || null);
      setOrders(orderResponse.data.orders || []);
      setVerification(verifyResponse.data.verification || null);
    } catch (error) { notify(error.message || 'Farm records are temporarily unavailable.'); }
    finally { setRefreshing(false); }
  }, [isFarmer, notify]);
  useEffect(() => { refresh(); }, [refresh]);

  const ownListings = useMemo(() => products.filter((product) => String(product.farmerId) === String(user._id)), [products, user._id]);
  const verificationStatus = verification?.status || user.verificationStatus || 'not_requested';

  const newListing = () => { setEditing(null); setListingModal(true); };
  const editListing = (product) => { setEditing(product); setListingModal(true); };
  const remove = async (product) => {
    try { await archiveListing(product._id); notify(`${product.name} is off the market.`); await refresh(); }
    catch (error) { notify(error.message); }
  };

  if (!isFarmer) return null;
  return <>
    <div className="farmer-page page-shell">
      <div className="breadcrumbs"><Link to="/">AgriLink</Link><span>/</span><span>Farm studio</span></div>
      <section className="farm-welcome"><div><p className="eyebrow"><span className="market-dot" /> THE GROWER'S STUDIO <i className="eyebrow-separator">·</i> {user.farmProfile?.district || 'YOUR PLACE IN THE MARKET'}</p><h1>Good morning,<br /><em>{(user.farmProfile?.name || user.fullName).split(' ')[0]}.</em></h1><p className="farm-welcome-message">Your stand, your asking price, your harvest. Here is what's going out today.</p><div className="farm-welcome-chips"><span><Sprout size={14} /> {(user.farmProfile?.name || 'Independent farm')}</span><span><MapPin size={13} />{user.farmProfile?.district ? `${user.farmProfile.district}, ${user.farmProfile.state}` : 'Market origin not yet set'}</span></div></div><div className="farm-welcome-aside"><div className="farm-aside-stamp"><Sprout size={18} /><span>YOUR<br />FARM</span></div><p>Every good listing begins with a good growing story.</p><button className="button button-paper-dark" type="button" onClick={newListing}><Plus size={16} /> Put a harvest on the table</button></div></section>
      <div className="farm-demo-notice"><span className="demo-notice-sign"><CircleHelp size={15} /></span><p><b>{refreshing ? 'Gathering your farm notes…' : 'These are marketplace notes, not bank statements.'}</b> Demo records reset on API restart. Order value is illustrative, no money moves, and the 4% support fee below is a proposed model only.</p><span className="farm-note-pick">THIS SEASON / DEMO</span></div>
      <GrowerMetrics data={analytics} />
      <div className="farm-content-grid">
        <section className="farm-work-panel listing-panel"><div className="farm-panel-heading"><div><p className="eyebrow"><Package size={14} /> THE OPEN BASKET</p><h2>Your harvests <em>on the market.</em></h2><p>Set your own price; update availability while the crop is still in the field.</p></div><button className="button button-primary" type="button" onClick={newListing}><Plus size={16} /> New harvest</button></div>
          {ownListings.length ? <div className="farm-listing-cards">{ownListings.map((item) => <article className="farm-listing-row" key={item._id}><div className="farm-listing-mini-image"><img src={item.imageUrl || PRODUCT_FALLBACK_IMAGE} alt="" onError={(event) => { event.currentTarget.src = PRODUCT_FALLBACK_IMAGE; }} /><span className="farm-listing-origin-stamp"><Sprout size={12} /></span></div><div className="farm-listing-main"><div><h3>{item.name}</h3><span className="farm-listing-variety">{item.cultivar || item.category}</span></div><ListingReviewStamp product={item} /><div className="farm-listing-stats"><span><b>{formatRupees(item.pricePerKg)}</b> / kg</span><span><b>{item.stockKg} kg</b> in the basket</span><span><Clock3 size={12} /> {item.deliveryWindow}</span></div></div><div className="farm-listing-actions"><button onClick={() => editListing(item)} type="button" className="icon-button" aria-label={`Edit ${item.name}`} title="Edit harvest"><Edit3 size={16} /></button><button onClick={() => remove(item)} type="button" className="icon-button farm-listing-delete" aria-label={`Remove ${item.name} from market`} title="Remove from market"><Trash2 size={16} /></button></div></article>)}</div> : <div className="empty-farm"><span><Package size={21} /></span><h3>Nothing in your basket yet.</h3><p>Start with one harvest: the name, the asking price, what's left to pick.</p><button type="button" className="button button-primary" onClick={newListing}><Plus size={15} /> Add your first market note</button></div>}
        </section>
        <aside className="farm-work-panel origin-panel"><div className="farm-panel-heading origin-panel-title"><div><p className="eyebrow"><ShieldCheck size={14} /> YOUR GROWER CARD</p><h2>Origin, out in the open.</h2></div><span className={`stamp ${verificationStatus === 'verified' ? 'stamp-verified' : verificationStatus === 'rejected' ? 'stamp-rejected' : 'stamp-pending'}`}>{verificationStatus === 'verified' ? 'REVIEWED' : verificationStatus === 'rejected' ? 'UPDATE NEEDED' : verificationStatus === 'pending' ? 'IN REVIEW' : 'NOT REQUESTED'}</span></div><div className="origin-business-card"><span className="origin-business-mark"><Sprout size={22} /></span><div><b>{verification?.farmName || user.farmProfile?.name || user.fullName}</b><span>{(verification?.district || user.farmProfile?.district) ? `${verification?.district || user.farmProfile?.district}, ${verification?.state || user.farmProfile?.state}` : 'Farm origin to be added'}</span></div></div><VerificationStatus status={verificationStatus} lastDecision={verification?.reviewNote} user={user} onRequest={() => setVerifyModal(true)} />{verification?.crops?.length ? <div className="verified-crop-list"><small>ON THE FARM'S CROP NOTE</small>{verification.crops.map((crop) => <span key={crop}>{crop}</span>)}</div> : null}<div className="origin-card-footer"><ShieldCheck size={15} /><p>Verification confirms the submitted grower identity and origin details only—not food safety, organic claims or other certification.</p></div></aside>
      </div>

      <section className="farm-work-panel farmer-orders-panel"><div className="farm-panel-heading"><div><p className="eyebrow"><Truck size={14} /> FROM THEIR INBOX TO YOUR FIELD</p><h2>Order notes <em>from buyers.</em></h2><p>Each order starts with a no-payment request; the grower confirms before you arrange anything.</p></div><span className="farm-panel-status"><span className="market-dot" /> {orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)).length} open requests</span></div>{orders.length ? <div className="order-desk-list">{orders.map((order) => <OrderDeskRow key={order._id} order={order} refresh={refresh} notify={notify} />)}</div> : <div className="orders-empty-strip"><Clock3 size={18} /><span>No buyer requests yet. They will appear here as soon as somebody finds your harvest.</span><Link to="/market">Take a look at the open market <ArrowUpRight size={13} /></Link></div>}</section>
      <section className="analytics-note-panel"><div className="analytics-note-icon"><BarChart3 size={18} /></div><div><b>Numbers with their shoes on the ground.</b><p>{analytics?.feeDisclosure || 'Illustrative demo metrics. No actual transactions, commissions, withdrawals or payouts are processed.'}</p></div><div className="analytics-tags"><span>Stock in kg</span><span>Orders by status</span><span>No money moved</span></div></section>
    </div>
    <ListingEditor open={listingModal} onClose={() => setListingModal(false)} existing={editing} onCreate={createListing} onUpdate={updateListing} notify={notify} />
    <VerificationForm open={verifyModal} close={() => setVerifyModal(false)} user={user} notify={notify} onSubmitted={setVerification} />
  </>;
}

export default function FarmerPage() {
  const { user, openAuth } = useMarket();
  const notify = useToast();
  if (!user) return <FarmAccess openAuth={openAuth} />;
  if (user.role === 'buyer') return <div className="wrong-role page-shell"><p className="eyebrow">A DIFFERENT SIDE OF THE MARKET</p><h1>You're looking at a grower's studio.</h1><p>Your buyer account is just right for discovering and ordering harvests.</p><Link className="button button-primary" to="/market">Browse the harvests <ArrowRight size={16} /></Link></div>;
  if (user.role === 'admin') return <div className="farmer-page page-shell admin-page"><div className="breadcrumbs"><Link to="/">AgriLink</Link><span>/</span><span>Market desk</span></div><section className="farm-welcome admin-welcome"><div><p className="eyebrow"><ShieldCheck size={14} /> THE MARKET KEEPER</p><h1>Good details make<br /><em>good neighbours.</em></h1><p className="farm-welcome-message">A human hand on the origin notes and listing details that enter the open market.</p></div><div className="market-note-rotation"><span className="market-dot" /><span>ADMIN-ONLY ACTIONS · LOCAL DEMO</span></div></section><div className="farm-demo-notice"><CircleHelp size={16} /><p><b>Administrators do not self-register.</b> This narrow role can review user-submitted origin and listing details. In demo mode only, the example moderator session is available so judges can see role enforcement.</p></div><AdminMarketDesk notify={notify} /></div>;
  return <FarmerDashboard />;
}
