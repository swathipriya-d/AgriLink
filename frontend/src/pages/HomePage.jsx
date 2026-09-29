import { useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronRight, CircleDot, MapPin, MoveUpRight, Sprout } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { HERO_IMAGE, formatRupees } from '../data/market.js';
import { useMarket } from '../App.jsx';
import ProductCard from '../components/ProductCard.jsx';

function MiniFarmPostcard() {
  return <aside className="hero-postcard" aria-label="AgriLink's fair-price promise">
    <span className="postcard-heading"><span className="freshness-dot" />A little clearer, a lot fairer</span>
    <div className="postcard-numbers"><span>₹100</span><span className="postcard-dash"><ArrowRight size={16} /></span><span>₹96</span></div>
    <div className="postcard-captions"><span>the produce</span><span>illustrative grower share</span></div>
    <p>Example using AgriLink's <b>proposed 4%</b> future service fee. No charge or payout happens here.</p>
  </aside>;
}

export default function HomePage() {
  const { products, user, openAuth } = useMarket();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const featured = products.slice(0, 3);
  const submitSearch = (event) => {
    event.preventDefault();
    navigate(`/market${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`);
  };

  return <>
    <div className="market-ledger-row page-shell">
      <span><span className="market-dot" />New week. New hands behind the harvest.</span>
      <span className="ledger-location"><MapPin size={13} /> First picking, western Maharashtra <span className="small-separator">—</span> and wherever you call home</span>
    </div>

    <section className="hero-section page-shell" aria-labelledby="hero-title">
      <img src={HERO_IMAGE} alt="A farmer's fresh mixed harvest being arranged at a warm morning farm market." className="hero-image" onError={(event) => { event.currentTarget.src = '/images/produce-fallback.svg'; }} fetchPriority="high" />
      <div className="hero-image-shade" />
      <div className="hero-vertical-note"><span>FROM THE FIELD</span><i /> <span>TO YOUR TABLE</span></div>
      <div className="hero-content">
        <div className="hero-kicker"><Sprout size={16} strokeWidth={1.8} /><span>FRESH PICKS. REAL PEOPLE. FAIRER TRADE.</span></div>
        <h1 id="hero-title">A good harvest <em>knows</em><br />where it's going.</h1>
        <p className="hero-description">Meet the people behind your produce. Buy closer to the soil, at a price everyone can see.</p>
        <form className="hero-search" onSubmit={submitSearch} role="search">
          <MapPin size={17} className="search-pin" />
          <label htmlFor="market-search" className="sr-only">Find a harvest, farmer or place</label>
          <input id="market-search" placeholder="Try ‘tomatoes’ or ‘Nashik’" value={search} onChange={(event) => setSearch(event.target.value)} />
          <button type="submit" aria-label="Search the market"><span>Find the good stuff</span><ArrowRight size={17} /></button>
        </form>
        <div className="hero-reassurance"><span><Check size={14} /> Grown with a name</span><span><Check size={14} /> Price you can trace</span><span><Check size={14} /> Orders go direct</span></div>
      </div>
      <div className="hero-note-card"><MiniFarmPostcard /></div>
      <div className="hero-edge-note"><span>OUR FARMERS' MORNING, YOUR TABLE BY NINE</span><ArrowDown size={13} /></div>
    </section>

    <section className="origin-ticker" aria-label="Marketplace promise">
      <div className="origin-ticker-inner"><span>ROOTED WHERE YOU ARE</span><i /><span>HARVESTED BY A NAME</span><i /><span>TRADED OUT IN THE OPEN</span><i /><span>SHARED WITH CARE</span><i /><span>ROOTED WHERE YOU ARE</span></div>
    </section>

    <section className="content-section page-shell market-featured-section" aria-labelledby="featured-heading">
      <div className="section-head featured-head">
        <div><p className="eyebrow">A FEW GOOD THINGS, GATHERED</p><h2 id="featured-heading">In from the <em>fields.</em></h2><p className="section-description">A small harvest picked for today's market. Every listing tells you who, where and when.</p></div>
        <Link className="text-arrow-link" to="/market">Walk the whole market <ArrowUpRight size={16} /></Link>
      </div>
      <div className="product-grid product-grid-home">
        {featured.map((product, index) => <ProductCard key={product._id} product={product} index={index} />)}
      </div>
      <div className="harvest-bottom-note"><div><span className="harvest-bottom-stamp">✳</span><p><b>Picked when it should be.</b> Every harvest note is written by the person who grew it.</p></div><Link to="/market">See where it came from <ChevronRight size={15} /></Link></div>
    </section>

    <section className="farm-trail-section" aria-labelledby="farm-trail-heading">
      <div className="farm-trail-wrap page-shell">
        <div className="farm-trail-copy"><p className="eyebrow eyebrow-light">THE AG RILINK PROMISE</p><h2 id="farm-trail-heading">Trace it back<br />to a <em>person.</em></h2><p>Not a warehouse code. Not another handoff. The farm story sits right next to the price because it belongs there.</p><div className="trail-stops"><div><span className="trail-pin"><Sprout size={16} /></span><div><b>The ground</b><small>Meet the grower</small></div></div><i className="trail-connector" /><div><span className="trail-pin"><CircleDot size={16} /></span><div><b>The picking</b><small>Read the harvest note</small></div></div><i className="trail-connector" /><div><span className="trail-pin"><MoveUpRight size={16} /></span><div><b>The market</b><small>See the whole price</small></div></div></div><Link className="button button-paper" to="/how-it-works">How we bring it closer <ArrowRight size={16} /></Link></div>
        <div className="story-stat-card"><div className="story-stat-head"><span>THE FARMER'S CUT</span><ArrowUpRight size={15} /></div><strong>96<span>%</span></strong><p>of each <b>₹100 of produce</b>, in our illustrative model.</p><div className="story-stat-line"><span /><i /></div><div className="story-stat-legend"><span><i className="legend-grower" />Grower share <b>₹96</b></span><span><i className="legend-link" />Proposed support <b>₹4</b></span></div><p className="story-stat-disclaimer">Example for discussion only. No subscription, transaction fee or payout is processed by this prototype.</p></div>
      </div>
    </section>

    <section className="grower-cta page-shell">
      <div className="grower-cta-mark"><Sprout size={27} /></div>
      <div><p className="eyebrow">A GOOD MARKET STARTS WITH A GROWER</p><h2>Have a harvest to share?</h2><p>Put a name and a fair price next to it. The right buyers are already looking.</p></div>
      <button className="button button-primary" type="button" onClick={() => user?.role === 'farmer' ? navigate('/farmer') : openAuth('farmer')}>{user?.role === 'farmer' ? 'Open your farm studio' : 'Set up your farm stand'} <ArrowRight size={17} /></button>
    </section>

    <footer className="site-footer">
      <div className="page-shell footer-main">
        <div><Link to="/" className="brand-lockup footer-brand"><img src="/brand/brand-mark.svg" className="brand-symbol" alt="" /><span className="brand-name"><span>agri</span><i>link</i><b className="brand-period">.</b></span></Link><p className="footer-mission">A shorter journey from good soil to a good table.</p></div>
        <div className="footer-links-group"><p className="eyebrow eyebrow-light">IN THE MARKET</p><Link to="/market">This week's harvests <ArrowUpRight size={13} /></Link><Link to="/how-it-works">How AgriLink works <ArrowUpRight size={13} /></Link><button type="button" onClick={() => user?.role === 'farmer' ? navigate('/farmer') : openAuth('farmer')}>Grow with AgriLink <ArrowUpRight size={13} /></button></div>
        <div className="footer-links-group footer-note"><p className="eyebrow eyebrow-light">A FAIR WORD</p><p>Origin and verification notes describe the marketplace demo—not food-safety or regulated certification. Sample activity is for illustration only.</p></div>
      </div>
      <div className="page-shell footer-bottom"><span>© AgriLink · Close to the people who grow it.</span><span>Built for the people behind your plate.</span></div>
    </footer>
  </>;
}
