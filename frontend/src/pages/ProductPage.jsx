import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, CircleHelp, Clock3, MapPin, MessageCircle, PackageCheck, ShieldCheck, Sprout, Sun, Wheat } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useMarket } from '../App.jsx';
import { get } from '../lib/api.js';
import { formatRupees, listingReviewStatus, normaliseProduct, PRODUCT_FALLBACK_IMAGE } from '../data/market.js';

export default function ProductPage() {
  const { id } = useParams();
  const { products, user, openAuth, createOrder, notify, health } = useMarket();
  const [extraProduct, setExtraProduct] = useState(null);
  const [amount, setAmount] = useState(0);
  const [busy, setBusy] = useState(false);
  const product = useMemo(() => normaliseProduct(products.find((item) => String(item._id) === id) || extraProduct), [products, id, extraProduct]);

  useEffect(() => {
    let active = true;
    const known = products.some((item) => String(item._id) === id);
    if (!known) get(`/products/${encodeURIComponent(id)}`).then((response) => { if (active) setExtraProduct(response.data?.product || null); }).catch(() => { if (active) setExtraProduct(null); });
    return () => { active = false; };
  }, [id, products]);

  useEffect(() => { setAmount(product ? Math.max(Number(product.minOrderKg), 1) : 1); }, [product?._id]);
  if (!product) return <main className="page-narrow product-missing"><p className="eyebrow">THIS HARVEST MOVED ON</p><h1>There is nothing in this basket.</h1><p>The grower may have sold through this picking. Have a look at the next one.</p><Link to="/market" className="button button-primary"><ArrowLeft size={16} /> Back to the market</Link></main>;

  const reviewStatus = listingReviewStatus(product);
  const listingRejected = reviewStatus === 'rejected';
  const total = Number((product.pricePerKg * amount).toFixed(2));
  const feeExample = Number((total * 0.04).toFixed(2));
  const farmerShareExample = Number((total - feeExample).toFixed(2));
  const isOwn = user?.role === 'farmer' && String(user._id) === String(product.farmerId);
  const addOrder = async () => {
    if (listingRejected) return notify('The market requested a detail update. New order requests are paused until the listing is reviewed again.');
    if (!user || user.role !== 'buyer') { openAuth('buyer'); return; }
    if (amount < product.minOrderKg || amount > product.stockKg) return notify('Choose an amount that meets this harvest’s minimum and available stock.');
    setBusy(true);
    try { await createOrder(product, amount); }
    catch (error) { notify(error.message || 'We could not send your request. Please try again.'); }
    finally { setBusy(false); }
  };

  return <div className="product-detail page-shell">
    <div className="breadcrumbs"><Link to="/">AgriLink</Link><span>/</span><Link to="/market">The market</Link><span>/</span><span>{product.name}</span></div>
    <Link className="detail-back-link" to="/market"><ArrowLeft size={15} /> Back to the market</Link>
    <div className="detail-grid">
      <div className="detail-image-column"><div className="detail-photo-frame"><img src={product.imageUrl} alt={`${product.name} as offered by ${product.farmName}.`} onError={(event) => { event.currentTarget.src = PRODUCT_FALLBACK_IMAGE; }} /><span className={`stamp detail-verification stamp-${reviewStatus}`}>{reviewStatus === 'verified' ? <><Check size={13} /> MARKET REVIEWED</> : reviewStatus === 'rejected' ? <><CircleHelp size={13} /> DETAILS NEED REVIEW</> : <><Sprout size={13} /> GROWER PENDING REVIEW</>}</span><div className="photo-corner-label">{product.harvestDate === new Date().toISOString().slice(0, 10) ? 'PICKED TODAY' : 'ON THE HARVEST LIST'}</div></div>
        <div className="detail-mini-grid"><div className="mini-detail-card"><span><Sun size={15} /></span><small>PICKING WINDOW</small><b>{product.deliveryWindow}</b></div><div className="mini-detail-card"><span><PackageCheck size={15} /></span><small>AVAILABILITY</small><b>{product.stockKg} kg, updated by the farm</b></div></div>
      </div>
      <div className="detail-main-column">
        <div className="detail-pretitle"><span className="product-region"><MapPin size={13} /> {product.city}, {product.state}</span><span className="detail-dot" /><span>{product.category}</span></div>
        <h1 className="detail-title">{product.name}<em>{product.cultivar}</em></h1>
        <Link to={`/market?search=${encodeURIComponent(product.farmName)}`} className="detail-farm-card"><span className="detail-farm-sprout"><Sprout size={19} /></span><span className="detail-farm-copy"><small>GROWN BY</small><b>{product.farmName}</b><span>{product.sellerName}</span></span><span className="detail-farm-location"><MapPin size={14} />{product.city}, {product.state}</span><ArrowUpRight size={15} className="farm-open-arrow" /></Link>
        <div className="detail-note"><div className="detail-note-icon"><Wheat size={17} /></div><p>{product.description || product.story}</p></div>
        <div className="detail-price"><strong>{formatRupees(product.pricePerKg)}</strong><span> per kg <i>·</i> the grower's asking price</span><span className={`stock-pill detail-stock ${product.stockKg <= 8 ? 'stock-low' : ''}`}><PackageCheck size={12} />{product.stockKg} kg available</span></div>
        <div className="origin-trail" aria-label="Harvest provenance"><span className="trail-line" /><div className="origin-stage"><span className="origin-stage-icon"><MapPin size={15} /></span><div><small>GROWN IN</small><b>{product.city}, {product.state}</b></div></div><div className="origin-stage"><span className="origin-stage-icon"><Sun size={15} /></span><div><small>HARVEST NOTE</small><b>{new Date(product.harvestDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</b></div></div><div className="origin-stage"><span className="origin-stage-icon"><Sprout size={15} /></span><div><small>SELLER STATUS</small><b>{product.farmerVerified ? 'Grower profile reviewed' : 'Grower review is pending'}</b></div></div></div>
        <div className="transparency-slab"><div className="transparency-heading"><span><CircleHelp size={16} /></span><b>A clear price, no hidden maths.</b></div><div className="share-breakdown"><div><span>Your produce, at asking price</span><b>{formatRupees(total)}</b></div><div className="share-progress"><i /></div><div><span>Indicative grower share · 96%</span><b>{formatRupees(farmerShareExample)}</b></div><div><span>Proposed support · 4% example</span><b>{formatRupees(feeExample)}</b></div></div><p>Illustrative business model only. Nothing is charged, withheld or paid out in this prototype.</p></div>
        <div className="detail-order-box"><div className="detail-order-first"><div className="quantity-control"><button type="button" aria-label="Remove one kilogram" disabled={amount <= product.minOrderKg} onClick={() => setAmount((value) => Math.max(product.minOrderKg, value - 1))}>−</button><span><b>{amount}</b> kg</span><button type="button" aria-label="Add one kilogram" disabled={amount + 1 > product.stockKg} onClick={() => setAmount((value) => Math.min(product.stockKg, value + 1))}>+</button></div><span className="order-total"><small>PRODUCE TOTAL</small><b>{formatRupees(total)}</b></span></div><button className="button button-primary button-full detail-order-button" type="button" disabled={busy || isOwn || listingRejected || product.stockKg <= 0 || amount < product.minOrderKg} onClick={addOrder}>{isOwn ? 'This is your harvest' : listingRejected ? 'Paused until details are reviewed' : busy ? 'Sending your request…' : <>{user?.role === 'buyer' ? 'Send a no-payment order request' : 'Ask the grower about this pick'}<ArrowRight size={17} /></>}</button><p className="order-terms">{listingRejected ? <><CircleHelp size={13} /> A market reviewer requested a listing update; new order requests are paused.</> : <><Check size={13} /> A request—not a payment. Your seller confirms before anything is arranged.</>}</p>{product.stockKg < product.minOrderKg && <p className="form-error">This picking has sold through.</p>}</div>
        <p className="verification-footnote"><ShieldCheck size={14} /> “Market reviewed” refers to an in-market profile/listing review only. It does not certify produce, safety, organic status or other regulated standards.</p>
      </div>
    </div>
    <section className="detail-story-end"><div><p className="eyebrow">THE GROWER'S WORD</p><h2>“{product.story || 'Good food only has to make one honest trip.'}”</h2><span>— {product.sellerName}, {product.farmName}</span></div><Link to="/market" className="button button-paper-dark">See what else is growing <ArrowRight size={15} /></Link></section>
  </div>;
}
