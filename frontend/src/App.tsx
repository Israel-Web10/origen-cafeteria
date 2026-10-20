import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { ConfigProvider, useCalmMotion } from './context/ConfigContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PageLoading } from './components/Loading';
import { PublicLayout } from './layouts/PublicLayout';

import { Home } from './pages/Home';
import { Menu } from './pages/Menu';
import { ProductDetail } from './pages/ProductDetail';
import { Promotions } from './pages/Promotions';
import { CartPage } from './pages/CartPage';
import { Checkout } from './pages/Checkout';
import { OrderPage } from './pages/OrderPage';
import { OrderTracking } from './pages/OrderTracking';
import { ContentPage } from './pages/ContentPage';
import { Visit } from './pages/Visit';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { MyOrders } from './pages/MyOrders';
import { Profile } from './pages/Profile';
import { NotFound } from './pages/NotFound';

// El panel administrativo se descarga solo cuando el personal entra en él.
const AdminApp = lazy(() => import('./admin/AdminApp'));

function Motion({ children }: { children: React.ReactNode }) {
  const calm = useCalmMotion();
  return <MotionConfig reducedMotion={calm ? 'always' : 'user'}>{children}</MotionConfig>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ConfigProvider>
        <Motion>
          <AuthProvider>
            <CartProvider>
              <ToastProvider>
                <Routes>
                  <Route element={<PublicLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/carta" element={<Menu />} />
                    <Route path="/carta/:category" element={<Menu />} />
                    <Route path="/producto/:slug" element={<ProductDetail />} />
                    <Route path="/promociones" element={<Promotions />} />
                    <Route path="/historia" element={<ContentPage slug="history" />} />
                    <Route path="/la-cafeteria" element={<ContentPage slug="facilities" />} />
                    <Route path="/preguntas-frecuentes" element={<ContentPage slug="faq" />} />
                    <Route path="/visitanos" element={<Visit />} />
                    <Route path="/legal/:slug" element={<ContentPage />} />
                    <Route path="/carrito" element={<CartPage />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/pedido/:orderNumber" element={<OrderPage />} />
                    <Route path="/seguimiento" element={<OrderTracking />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/registro" element={<Register />} />
                    <Route path="/mis-pedidos" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
                    <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    {/* Rutas anteriores, se conservan como redirección */}
                    <Route path="/menu" element={<Navigate to="/carta" replace />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                  <Route
                    path="/admin/*"
                    element={
                      <ProtectedRoute staff>
                        <Suspense fallback={<PageLoading />}><AdminApp /></Suspense>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </ToastProvider>
            </CartProvider>
          </AuthProvider>
        </Motion>
      </ConfigProvider>
    </BrowserRouter>
  );
}
