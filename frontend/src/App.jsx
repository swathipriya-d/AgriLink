import React, { Suspense, createContext, lazy, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { get, getToken, post, patch, del, setToken } from './lib/api.js';
import { INITIAL_PRODUCTS, listingReviewStatus, normaliseProduct } from './data/market.js';
import SiteHeader from './components/SiteHeader.jsx';
import AuthModal from './components/AuthModal.jsx';
import { Sprout, X } from 'lucide-react';

const MarketContext = createContext(null);
export const useMarket = () => {
  const value = useContext(MarketContext);
  if (!value) throw new Error('useMarket must be inside AgriLink.');
  return value;
};

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const MarketPage = lazy(() => import('./pages/MarketPage.jsx'));
const ProductPage = lazy(() => import('./pages/ProductPage.jsx'));
const FarmerPage = lazy(() => import('./pages/FarmerPage.jsx'));
const OrdersPage = lazy(() => import('./pages/OrdersPage.jsx'));
const StoryPage = lazy(() => import('./pages/StoryPage.jsx'));

function GlobalToasts({ toast, onDismiss }) {
  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast-icon"><Sprout size={17} strokeWidth={1.8} /></span>
      <span>{toast.message}</span>
      <button className="icon-button toast-close" onClick={onDismiss} aria-label="Dismiss notice"><X size={17} /></button>
    </div>
  );
}

function BusyScreen() {
  return <div className="route-loading" aria-label="Opening AgriLink"><span className="loading-seed"><Sprout size={21} /></span><span>opening the market</span></div>;
}

function MissingPage() {
  return (
    <main className="page-narrow missing-page">
      <span className="overline">LOST ON THE WAY TO THE MARKET?</span>
      <h1>This page is still in the field.</h1>
      <p>Take the path back to this week's harvest.</p>
      <a href="/market" className="button button-primary">Browse the market <Sprout size={17} /></a>
    </main>
  );
}

function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

function MarketApp() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [session, setSession] = useState(null);
  const [health, setHealth] = useState({ ready: false, mode: 'demo', database: 'unknown', cloudinaryConfigured: false });
  const [auth, setAuth] = useState({ open: false, role: 'buyer', view: 'choose' });
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savedIds, setSavedIds] = useState(() => {
    try { return new Set(JSON.parse(window.localStorage.getItem('agrilink.saved.v1') || '[]')); }
    catch { return new Set(); }
  });

  const notify = useCallback((message) => {
    setToast({ message });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4100);
  }, []);

  const dismissToast = useCallback(() => {
    window.clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  const refreshProducts = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const response = await get('/products?sort=newest&limit=48');
      setProducts(Array.isArray(response.data?.products) ? response.data.products.map(normaliseProduct) : INITIAL_PRODUCTS);
    } catch {
      setProducts(INITIAL_PRODUCTS.map(normaliseProduct));
      if (!quiet) notify('Showing the saved AgriLink sample market while the API reconnects.');
    } finally {
      if (!quiet) setIsRefreshing(false);
    }
  }, [notify]);

  useEffect(() => {
    let ignore = false;
    async function openMarket() {
      const savedToken = getToken();
      const tasks = [
        get('/health').then((response) => {
          if (!ignore && response.data) setHealth({ ready: true, ...response.data });
        }).catch(() => {
          if (!ignore) setHealth({ ready: false, mode: 'demo', database: 'offline', cloudinaryConfigured: false });
        }),
        get('/products?sort=newest&limit=48').then((response) => {
          if (!ignore && Array.isArray(response.data?.products)) setProducts(response.data.products.map(normaliseProduct));
        }).catch(() => { if (!ignore) setProducts(INITIAL_PRODUCTS.map(normaliseProduct)); }),
      ];
      if (savedToken) tasks.push(get('/auth/me').then((response) => {
        if (!ignore && response.data?.user) setSession(response.data.user);
      }).catch(() => { setToken(null); }));
      await Promise.all(tasks);
      if (!ignore) setLoading(false);
    }
    openMarket();
    return () => { ignore = true; window.clearTimeout(toastTimer.current); };
  }, []);

  const openAuth = useCallback((role = 'buyer', view = 'choose') => setAuth({ open: true, role, view }), []);
  const closeAuth = useCallback(() => setAuth((current) => ({ ...current, open: false })), []);
  const establishSession = useCallback((data) => {
    setToken(data.token);
    setSession(data.user);
    setAuth((current) => ({ ...current, open: false }));
    notify(`Welcome to AgriLink, ${data.user.fullName.split(' ')[0]}.`);
  }, [notify]);

  const signIn = useCallback(async ({ email, password }) => {
    const response = await post('/auth/login', { email, password });
    establishSession(response.data);
    return response.data.user;
  }, [establishSession]);

  const register = useCallback(async (profile) => {
    const response = await post('/auth/register', profile);
    establishSession(response.data);
    return response.data.user;
  }, [establishSession]);

  const signInAsDemo = useCallback(async (role) => {
    if (!health.ready || !health.demo) throw new Error('The local demo service is not available yet.');
    const response = await post('/auth/demo-session', { role });
    establishSession(response.data);
    notify('Demo account only — session and sample changes reset when the API restarts.');
    return response.data.user;
  }, [establishSession, health, notify]);

  const signOut = useCallback(() => {
    setToken(null);
    setSession(null);
    notify('You have safely signed out.');
  }, [notify]);

  const toggleSaved = useCallback((productId) => {
    setSavedIds((current) => {
      const next = new Set(current);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      try { window.localStorage.setItem('agrilink.saved.v1', JSON.stringify([...next])); } catch { /* Saved for this tab. */ }
      return next;
    });
  }, []);

  const createOrder = useCallback(async (product, quantityKg) => {
    if (!session || session.role !== 'buyer') {
      openAuth('buyer');
      return null;
    }
    if (listingReviewStatus(product) === 'rejected') {
      throw new Error('This harvest is paused while the grower updates its listing details.');
    }
    const response = await post('/orders', { items: [{ productId: product._id, quantityKg }] });
    await refreshProducts(true);
    notify(`Order request sent to ${product.farmName}. No payment was taken.`);
    return response.data.order;
  }, [session, openAuth, notify, refreshProducts]);

  const createListing = useCallback(async (listing, imageFile) => {
    let imageUrl = listing.imageUrl || '/images/produce-fallback.svg';
    if (imageFile) {
      if (health.cloudinaryConfigured && !health.demo) {
        const form = new FormData();
        form.append('image', imageFile);
        const uploaded = await post('/uploads/image', form);
        imageUrl = uploaded.data.imageUrl;
      } else {
        notify('Photo preview is local only in this demo. Connect Cloudinary to store it; a market illustration will be used on the listing.');
      }
    }
    const response = await post('/products', { ...listing, imageUrl });
    await refreshProducts(true);
    return response.data.product;
  }, [health, notify, refreshProducts]);

  const updateListing = useCallback(async (productId, changes, imageFile) => {
    let payload = { ...changes };
    if (imageFile && health.cloudinaryConfigured && !health.demo) {
      const form = new FormData();
      form.append('image', imageFile);
      const uploaded = await post('/uploads/image', form);
      payload.imageUrl = uploaded.data.imageUrl;
    } else if (imageFile) {
      notify('This farm photo is only previewed in your browser; configure Cloudinary for a real image upload.');
    }
    const response = await patch(`/products/${encodeURIComponent(productId)}`, payload);
    await refreshProducts(true);
    return response.data.product;
  }, [health, notify, refreshProducts]);

  const archiveListing = useCallback(async (productId) => {
    const response = await del(`/products/${encodeURIComponent(productId)}`);
    await refreshProducts(true);
    return response.data;
  }, [refreshProducts]);

  const value = useMemo(() => ({
    products, session, user: session, health, auth, loading, isRefreshing, savedIds,
    setProducts, refreshProducts, openAuth, closeAuth, signIn, register, signInAsDemo,
    signOut, toggleSaved, createOrder, createListing, updateListing, archiveListing,
    notify, dismissToast,
  }), [products, session, health, auth, loading, isRefreshing, savedIds,
    refreshProducts, openAuth, closeAuth, signIn, register, signInAsDemo,
    signOut, toggleSaved, createOrder, createListing, updateListing, archiveListing,
    notify, dismissToast]);

  return (
    <MarketContext.Provider value={value}>
      <ToastContext.Provider value={notify}>
        <GlobalToasts toast={toast} onDismiss={dismissToast} />
        <BrowserRouter>
          <ScrollReset />
          <AuthModal />
          <SiteHeader />
          <main className="site-main">
            <Suspense fallback={<BusyScreen />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/market" element={<MarketPage />} />
                <Route path="/product/:id" element={<ProductPage />} />
                <Route path="/farmer" element={<FarmerPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/how-it-works" element={<StoryPage />} />
                <Route path="/404" element={<MissingPage />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </Suspense>
          </main>
        </BrowserRouter>
      </ToastContext.Provider>
    </MarketContext.Provider>
  );
}

export default function App() {
  return <MarketApp />;
}
