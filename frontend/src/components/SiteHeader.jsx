import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, Menu, ShieldCheck, ShoppingBasket, Sprout, UserRound, X } from 'lucide-react';
import { useMarket } from '../App.jsx';

function Wordmark() {
  return <Link to="/" className="brand-lockup" aria-label="AgriLink home">
    <img src="/brand/agrilink-icon.png" alt="" className="brand-symbol" onError={(event) => { event.currentTarget.src = '/brand/brand-mark.svg'; }} />
    <span className="brand-name"><span>agri</span><i>link</i><b className="brand-period">.</b></span>
  </Link>;
}

const navItems = [
  { to: '/market', label: 'The market', end: true },
  { to: '/how-it-works', label: 'The difference' },
];

export default function SiteHeader() {
  const { user, health, openAuth, signOut } = useMarket();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const go = () => setMenuOpen(false);
  const showOrders = user?.role === 'buyer';
  const showFarm = user?.role === 'farmer';
  const showDesk = user?.role === 'admin';
  return <>
    <div className="market-note">
      <span className="note-dot" /> <span>MARKET OPEN <i>·</i> harvesting in your corner of the world</span>
      <span className="note-spacer" />
      <Link to="/how-it-works">From real farms, never a middleman <ArrowUpRight size={13} /></Link>
    </div>
    <header className="site-header">
      <div className="header-inner">
        <Wordmark />
        <nav className={`main-nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Main navigation">
          {navItems.map((item) => <NavLink key={item.to} to={item.to} end={item.end} onClick={go} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>{item.label}</NavLink>)}
          {showOrders && <NavLink to="/orders" onClick={go} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}><ShoppingBasket size={16} /> Your orders</NavLink>}
          {(showFarm || showDesk) && <NavLink to="/farmer" onClick={go} className={({ isActive }) => `nav-link nav-workspace ${isActive ? 'nav-link-active' : ''}`}>{showDesk ? <ShieldCheck size={16} /> : <Sprout size={16} />}{showDesk ? 'Market desk' : 'Farm studio'} <ArrowDown size={13} className="nav-arrow" /></NavLink>}
        </nav>
        <div className="header-actions">
          <span className={`connection-badge ${health.ready ? health.demo ? 'is-demo' : 'is-live' : 'is-offline'}`} title={health.ready ? health.demo ? 'Development demonstration; in-memory sample data.' : 'Connected to the live MongoDB-backed API.' : 'Browse-only fallback; API is not connected.'}>
            <span /> {health.ready ? health.demo ? 'DEMO MARKET' : 'LIVE MARKET' : 'MARKET PREVIEW'}
          </span>
          {user ? (
            <div className="account-menu">
              <button className="account-trigger" type="button" aria-label={`Signed in as ${user.fullName}; click to sign out`} title={`${user.fullName} · sign out`} onClick={signOut}><span className="account-avatar"><UserRound size={17} /></span><span className="account-first-name">{user.fullName.split(' ')[0]}</span><span className="account-role">{user.role === 'admin' ? 'market keeper' : user.role}</span></button>
            </div>
          ) : <button className="button button-header" onClick={() => openAuth('buyer')} type="button"><span>Join the market</span><ArrowUpRight size={15} /></button>}
          <button className="mobile-toggle icon-button" type="button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label={menuOpen ? 'Close the site menu' : 'Open the site menu'}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
        </div>
      </div>
    </header>
  </>;
}
