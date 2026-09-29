import { useMemo, useState } from 'react';
import { ArrowDownAZ, ArrowLeft, ArrowUpRight, Check, Filter, Leaf, MapPin, Search, ShieldCheck, SlidersHorizontal, Sprout, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { formatRupees, normaliseProduct } from '../data/market.js';
import ProductCard from '../components/ProductCard.jsx';
import { useMarket } from '../App.jsx';

const categories = ['All harvests', 'Vegetables', 'Fruits', 'Grains & pulses', 'Herbs & greens', 'Dairy & pantry'];

export default function MarketPage() {
  const { products, isRefreshing, notify } = useMarket();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchText, setSearchText] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'All harvests');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [maximumPrice, setMaximumPrice] = useState(250);
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verified') === 'true');
  const [inStockOnly, setInStockOnly] = useState(true);
  const [sort, setSort] = useState('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const normalisedProducts = useMemo(() => products.map(normaliseProduct), [products]);
  const shown = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    let result = normalisedProducts.filter((product) => {
      const haystack = [product.name, product.cultivar, product.farmName, product.sellerName, product.city, product.state, product.story, ...(product.tags || [])].join(' ').toLowerCase();
      return (!query || haystack.includes(query))
        && (category === 'All harvests' || product.category === category)
        && (!city.trim() || `${product.city} ${product.state}`.toLowerCase().includes(city.trim().toLowerCase()))
        && Number(product.pricePerKg) <= maximumPrice
        && (!verifiedOnly || Boolean(product.verified))
        && (!inStockOnly || Number(product.stockKg) > 0);
    });
    if (sort === 'price-low') result = [...result].sort((a, b) => a.pricePerKg - b.pricePerKg);
    else if (sort === 'price-high') result = [...result].sort((a, b) => b.pricePerKg - a.pricePerKg);
    else if (sort === 'stock') result = [...result].sort((a, b) => b.stockKg - a.stockKg);
    else result = [...result].sort((a, b) => new Date(b.harvestDate) - new Date(a.harvestDate));
    return result;
  }, [normalisedProducts, searchText, category, city, maximumPrice, verifiedOnly, inStockOnly, sort]);

  const submitSearch = (event) => {
    event.preventDefault();
    setSearchParams(Object.fromEntries(Object.entries({ search: searchText.trim(), category: category === 'All harvests' ? '' : category, city: city.trim(), verified: verifiedOnly ? 'true' : '' }).filter(([, value]) => value)));
  };
  const resetFilters = () => {
    setSearchText(''); setCategory('All harvests'); setCity(''); setMaximumPrice(250); setVerifiedOnly(false); setInStockOnly(true); setSort('newest'); setSearchParams({});
    notify('Every harvest is back on the table.');
  };

  return <div className="market-page page-shell">
    <div className="breadcrumbs"><Link to="/">AgriLink</Link><span>/</span><span>The market</span></div>
    <section className="market-intro">
      <div className="market-intro-copy"><p className="eyebrow"><span className="market-dot" /> HARVESTS WITH A NAME</p><h1>A market that's<br /><em>a little closer.</em></h1><p className="market-description">Small, real harvests from the people who raised them. Find the one that fits your kitchen.</p></div>
      <div className="market-count-card"><span className="count-card-stamp"><Sprout size={20} /></span><strong>{normalisedProducts.length}<sup>+</sup></strong><span>picks, direct from a grower</span><p>Every price is the grower's asking price—before delivery.</p></div>
    </section>
    <div className="market-snapshots"><span><i />Today's picking notes</span><span><MapPin size={14} />Local first · neighbours always welcome</span><span><ShieldCheck size={14} />Review status, made visible</span></div>

    <form className="market-toolbar" onSubmit={submitSearch} role="search">
      <label className="market-search-box"><Search size={17} /><span className="sr-only">Search harvests, farms or places</span><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="A vegetable, a farm, or a place…" /><button type="submit" className="search-submit" aria-label="Search the market"><ArrowUpRight size={17} /></button></label>
      <label className="market-place-box"><MapPin size={16} /><span className="sr-only">Filter by district or state</span><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="District or state" maxLength={80} /><button type="submit" className="place-enter" aria-label="Apply location"><ArrowUpRight size={15} /></button></label>
      <button className={`button market-filter-mobile ${filtersOpen ? 'selected' : ''}`} type="button" onClick={() => setFiltersOpen((value) => !value)}><SlidersHorizontal size={16} /> Filters <span>{verifiedOnly ? '1' : ''}</span></button>
      <label className="sort-box"><ArrowDownAZ size={16} /><span className="sr-only">Sort harvests</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Today's harvest first</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="stock">Most in stock</option></select></label>
    </form>

    <div className="market-layout">
      <aside className={`filter-sidebar ${filtersOpen ? 'filter-open' : ''}`} aria-label="Marketplace filters">
        <div className="filters-heading"><div><Filter size={16} /><b>Make it your market</b></div><button type="button" className="filters-reset" onClick={resetFilters}>Reset</button></div>
        <fieldset className="filter-group"><legend>On the table</legend><div className="category-choice-list">{categories.map((item, index) => <button className={`category-choice ${category === item ? 'active' : ''}`} type="button" key={item} onClick={() => setCategory(item)}>{index === 0 ? <Leaf size={15} /> : <span className={`category-symbol cat-${index}`} />}{item}<span>{item === 'All harvests' ? normalisedProducts.length : normalisedProducts.filter((product) => product.category === item).length}</span></button>)}</div></fieldset>
        <fieldset className="filter-group"><legend>Honest trade notes</legend>
          <label className="filter-check-row"><span className={`custom-check ${verifiedOnly ? 'is-checked' : ''}`}>{verifiedOnly && <Check size={13} />}</span><span className="filter-check-copy"><b>Market reviewed</b><small>Grower or listing checked</small></span><input type="checkbox" className="sr-only" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} /></label>
          <label className="filter-check-row"><span className={`custom-check ${inStockOnly ? 'is-checked' : ''}`}>{inStockOnly && <Check size={13} />}</span><span className="filter-check-copy"><b>In season & in stock</b><small>Harvest with some left to sell</small></span><input type="checkbox" className="sr-only" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} /></label>
        </fieldset>
        <fieldset className="filter-group price-filter"><legend>Maximum asking price</legend><div className="price-range-wrap"><input aria-label="Maximum grower asking price per kilogram" type="range" min="40" max="250" step="2" value={maximumPrice} onChange={(event) => setMaximumPrice(Number(event.target.value))} /><div className="range-labels"><span>₹40 / kg</span><b>up to {formatRupees(maximumPrice)} / kg</b></div></div></fieldset>
        <div className="filter-manifesto"><span className="manifesto-stamp"><Sprout size={17} /></span><p><b>Knowing who is not the same as knowing everything.</b> Verification is a marketplace review—not a food-safety certification.</p></div>
      </aside>

      <div className="market-results-area">
        <div className="results-overview"><div><p className="eyebrow">A FRESH LOOK AT THE GOOD STUFF</p><h2>{searchText.trim() ? <>A few picks for <em>“{searchText.trim()}”</em></> : 'Out of the field, into your hands.'}</h2><p className="result-count">Showing <b>{shown.length}</b> of {normalisedProducts.length} local harvest{normalisedProducts.length === 1 ? '' : 's'}<span className="middot"> · </span> prices set by each grower</p></div><div className="results-tools"><span className="sort-help"><span className="note-dot" /> {isRefreshing ? 'Gathering the basket…' : 'Updated from the open market'}</span></div></div>
        {shown.length ? <div className="product-grid market-product-grid">{shown.map((product, index) => <ProductCard key={product._id} product={product} index={index} />)}</div> : (
          <div className="empty-market"><span><Search size={25} /></span><p className="eyebrow">NOT IN THIS BASKET. YET.</p><h3>No harvests match that combination.</h3><p>Try another farm, a broader asking price, or look at every pick.</p><button type="button" className="button button-paper-dark" onClick={resetFilters}><ArrowLeft size={16} /> Clear all filters</button></div>
        )}
        <div className="demo-tail-note"><span className="demonstration-marker" />Sample market listings illustrate the experience; a crop review does not claim official certification. <Link to="/how-it-works">What review means here <ArrowUpRight size={13} /></Link></div>
      </div>
    </div>
  </div>;
}
