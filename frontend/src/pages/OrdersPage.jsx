import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, CircleCheck, Clock3, MapPin, PackageCheck, ShoppingBasket, Sprout } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMarket } from '../App.jsx';
import { get, patch } from '../lib/api.js';
import { formatRupees } from '../data/market.js';

const stateLabel = { placed: ['Request sent', 'order-step-placed'], confirmed: ['Grower confirmed', 'order-step-confirmed'], packing: ['Being packed', 'order-step-packing'], ready: ['Ready to arrange', 'order-step-ready'], delivered: ['Completed demo note', 'order-step-delivered'], cancelled: ['No longer active', 'order-step-cancelled'] };

function OrderCard({ order, refresh, notify }) {
  const [busy, setBusy] = useState(false);
  const canCancel = ['placed', 'confirmed'].includes(order.status);
  const cancel = async () => {
    setBusy(true);
    try { await patch(`/orders/${encodeURIComponent(order._id)}/cancel`, { status: 'cancelled' }); notify('Order request cancelled; its stock was returned to the grower.'); await refresh(); }
    catch (error) { notify(error.message); }
    finally { setBusy(false); }
  };
  return <article className="buyer-order-card"><div className="buyer-order-top"><div><span className="order-index">{order.orderNumber}</span><h3>From {order.farmerName}</h3><small><Clock3 size={13} /> {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</small></div><span className={`order-status-tag order-status-large ${stateLabel[order.status]?.[1] || 'order-step-placed'} `}><span className="order-status-dot" />{stateLabel[order.status]?.[0] || order.status}</span></div>
    <div className="buyer-order-items">{order.items?.map((item) => <div key={`${order._id}-${item.product}`}><span className="order-item-sprout"><Sprout size={14} /></span><span>{item.productName}<small>{item.quantityKg} kg × {formatRupees(item.pricePerKg)}/kg</small></span><b>{formatRupees(item.lineTotal)}</b></div>)}</div>
    <div className="order-item-total"><span>Produce subtotal</span><b>{formatRupees(order.subtotal)}</b></div>
    <div className="order-no-payment-note"><span><CircleCheck size={14} /></span><p><b>This was a request, not a charge.</b> No payment has been taken. The <b>{formatRupees(order.estimatedServiceFee)}</b> future-service example shown to sellers is not collected. {order.status === 'delivered' ? 'This is an illustrative sample order.' : 'Agree any next step directly after the grower confirms.'}</p></div>
    <div className="buyer-order-bottom"><Link to="/market" className="text-arrow-link">Go back for seconds <ArrowUpRight size={14} /></Link>{canCancel && <button type="button" className="button button-paper-dark" onClick={cancel} disabled={busy}>{busy ? 'Saving…' : 'Cancel request'}</button>}</div>
  </article>;
}

function BuyerSignIn({ openAuth }) {
  return <main className="orders-signin page-shell"><div className="orders-signin-card"><span className="orders-signin-mark"><ShoppingBasket size={20} /></span><p className="eyebrow">THE BUYER'S POCKET</p><h1>Keep the growers<br /><em>you know</em> close.</h1><p>Sign in to see the order requests you've sent straight to the farm.</p><div className="orders-signin-facts"><span><CircleCheck size={15} /> Your grower stays named</span><span><Clock3 size={15} /> Requests arrive before decisions</span><span><PackageCheck size={15} /> Status stays with each picking</span></div><button type="button" className="button button-primary" onClick={() => openAuth('buyer')}>Join or sign in <ArrowRight size={16} /></button><Link className="text-arrow-link" to="/market">Browse first; order when it feels right <ArrowUpRight size={15} /></Link></div></main>;
}

export default function OrdersPage() {
  const { user, openAuth, notify, health } = useMarket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!user || user.role !== 'buyer') return;
    setLoading(true); setError('');
    try { const response = await get('/orders'); setOrders(response.data.orders || []); }
    catch (reason) { setError(reason.message || 'The order notes could not be loaded.'); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => { refresh(); }, [refresh]);

  if (!user) return <BuyerSignIn openAuth={openAuth} />;
  if (user.role === 'farmer') return <main className="wrong-role page-shell"><p className="eyebrow">YOUR CUSTOMERS ARE HERE TOO</p><h1>Your buyer requests are in the farm studio.</h1><p>Orders sent to your farm live beside your listings and your growing notes.</p><Link className="button button-primary" to="/farmer">Go to the farm studio <ArrowRight size={16} /></Link></main>;
  if (user.role === 'admin') return <main className="wrong-role page-shell"><p className="eyebrow">BEHIND THE MARKET, NOT INSIDE A BASKET</p><h1>Use the market desk for review.</h1><p>Admin accounts do not place buyer orders or see private buyer account history.</p><Link className="button button-primary" to="/farmer">Open the market desk <ArrowRight size={16} /></Link></main>;

  const amountTotal = orders.reduce((sum, item) => sum + item.subtotal, 0);
  const activeOrders = orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)).length;
  return <div className="orders-page page-shell"><div className="breadcrumbs"><Link to="/">AgriLink</Link><span>/</span><span>Your orders</span></div>
    <section className="orders-welcome"><div><p className="eyebrow">YOUR MARKET NOTES <i>·</i> SIGNED IN AS {user.role.toUpperCase()}</p><h1>Grower notes<br /><em>you can come back to.</em></h1><p>Requests sent straight to the farm, at the grower's posted price.</p></div><Link to="/market" className="button button-paper-dark"><ShoppingBasket size={16} /> Find another harvest</Link></section>
    {health.demo && <div className="farm-demo-notice"><span className="demo-notice-sign"><Clock3 size={15} /></span><p><b>These are temporary sample notes.</b> They're held in process memory and reset if the API restarts. This demonstration does not record a payment, sale or farmer payout.</p></div>}
    <div className="orders-summary"><div><span><ShoppingBasket size={16} /></span><small>ORDER NOTES</small><b>{orders.length}</b><i>at a farm's door</i></div><div><span><Clock3 size={16} /></span><small>STILL OPEN</small><b>{activeOrders}</b><i>waiting on the farm</i></div><div><span><MapPin size={16} /></span><small>ILLUSTRATIVE VALUE</small><b>{formatRupees(amountTotal)}</b><i>produce subtotal · no charge</i></div></div>
    <section className="orders-list-section"><div className="farm-panel-heading"><div><p className="eyebrow"><Sprout size={13} /> THE SELLER KNOWS IT'S YOU</p><h2>Where the picking <em>stands.</em></h2></div><span className="farm-panel-status"><span className="market-dot" /> requests to named growers</span></div>
      {loading ? <div className="market-loading"><span className="loading-seed"><Sprout size={20} /></span> Gathering the market notes…</div> : error ? <div className="orders-empty-strip"><span>{error}</span><button type="button" className="text-arrow-link" onClick={refresh}>Try again <ArrowRight size={14} /></button></div> : orders.length ? <div className="buyer-order-grid">{orders.map((order) => <OrderCard key={order._id} order={order} refresh={refresh} notify={notify} />)}</div> : <div className="orders-empty"><span><ShoppingBasket size={21} /></span><p className="eyebrow">EMPTY HANDS, FULL MARKET</p><h3>No order notes yet.</h3><p>Find a grower and ask for the harvest you have in mind. They will confirm before anything is arranged.</p><Link to="/market" className="button button-primary">Find a neighbour's harvest <ArrowRight size={16} /></Link></div>}
    </section>
    <p className="orders-compliance"><CircleHelp size={14} /> Marketplace orders in this prototype are non-payment requests. Any currency, commission, transaction value or payout shown is illustrative; no funds move.</p>
  </div>;
}
