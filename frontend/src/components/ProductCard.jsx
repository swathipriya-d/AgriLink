import { useState } from 'react';
import { ArrowUpRight, Check, CircleHelp, Heart, MapPin, PackageCheck, Sprout } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatRupees, listingReviewStatus, PRODUCT_FALLBACK_IMAGE } from '../data/market.js';
import { useMarket } from '../App.jsx';

export default function ProductCard({ product, index = 0, compact = false }) {
  const { user, openAuth, savedIds, toggleSaved, createOrder, notify } = useMarket();
  const [ordering, setOrdering] = useState(false);
  if (!product) return null;
  const reviewStatus = listingReviewStatus(product);
  const listingRejected = reviewStatus === 'rejected';
  const saved = savedIds.has(String(product._id));
  const quantity = Math.max(1, Number(product.minOrderKg) || 1);
  const image = product.imageUrl || PRODUCT_FALLBACK_IMAGE;
  const order = async () => {
    if (!user || user.role !== 'buyer') {
      openAuth('buyer');
      return;
    }
    setOrdering(true);
    try { await createOrder(product, quantity); }
    catch (error) { notify(error.message || 'This harvest could not be reserved right now.'); }
    finally { setOrdering(false); }
  };
  const doSave = () => {
    toggleSaved(String(product._id));
    notify(saved ? 'Removed from your saved harvests.' : 'Saved for a closer look later.');
  };

  return <article className={`product-card ${compact ? 'product-card-compact' : ''}`} style={{ '--card-index': index }}>
    <div className="product-photo">
      <Link to={`/product/${encodeURIComponent(product._id)}`} className="photo-link" aria-label={`See details: ${product.name}`} tabIndex="-1">
        <img className="product-image" src={image} alt={`Harvest of ${product.name}, grown by ${product.farmName}`} loading={index < 3 ? 'eager' : 'lazy'} onError={(event) => { const img = event.currentTarget; if (!img.src.endsWith(PRODUCT_FALLBACK_IMAGE)) img.src = PRODUCT_FALLBACK_IMAGE; }} />
      </Link>
      <div className="product-stamps">
        {reviewStatus === 'verified' ? <span className="stamp stamp-verified" aria-label="Listing status: reviewed"><Check size={12} /> MARKET REVIEWED</span> : reviewStatus === 'rejected' ? <span className="stamp stamp-rejected" aria-label="Listing status: details need review"><CircleHelp size={12} /> DETAILS NEED REVIEW</span> : <span className="stamp stamp-pending" aria-label="Listing status: review pending"><Sprout size={12} /> GROWER PENDING</span>}
        {product.tags?.[0] && <span className="stamp stamp-seasonal">{product.tags[0].toUpperCase()}</span>}
      </div>
      <button className={`save-button ${saved ? 'is-saved' : ''}`} onClick={doSave} type="button" aria-pressed={saved} aria-label={saved ? `Remove ${product.name} from saved harvests` : `Save ${product.name}`}><Heart size={17} fill={saved ? 'currentColor' : 'none'} strokeWidth={1.7} /></button>
    </div>
    <div className="product-info">
      <div className="product-region"><MapPin size={12} /><span>{product.city}, {product.state}</span><span className="region-dot">·</span><span>{product.category === 'Fruits' ? 'Fruit' : 'Vegetable'}</span></div>
      <Link to={`/product/${encodeURIComponent(product._id)}`} className="product-title-link"><h3>{product.name}</h3></Link>
      <p className="product-variety">{product.cultivar || product.tags?.[1] || 'Small-batch harvest'}</p>
      <Link to={`/product/${encodeURIComponent(product._id)}`} className="farm-line"><span className="farm-avatar"><Sprout size={13} /></span><span>{product.farmName}</span>{product.farmerVerified && <span className="farm-verified" aria-label="Verified farmer"><Check size={11} /></span>}</Link>
      <div className="product-detail-row"><div className="product-price"><strong>{formatRupees(product.pricePerKg)}</strong><span> / kg</span></div><span className={`stock-pill ${product.stockKg <= 8 ? 'stock-low' : ''}`}><PackageCheck size={12} />{product.stockKg > 0 ? `${product.stockKg} kg` : 'Just sold out'}</span></div>
      <div className="product-card-bottom"><span className="harvest-caption">{product.deliveryWindow || 'Fresh from the grower'}</span><button className="card-order-button" type="button" disabled={ordering || listingRejected || product.stockKg < quantity} aria-label={listingRejected ? `${product.name} is paused for a listing update` : `Reserve at least ${quantity} kg of ${product.name}`} onClick={order}>{listingRejected ? <span>Paused for a review update</span> : ordering ? 'Sending…' : <><span>Ask to reserve</span><ArrowUpRight size={15} /></>}</button></div>
    </div>
  </article>;
}
