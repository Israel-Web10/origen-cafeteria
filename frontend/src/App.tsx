import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import { PublicLayout } from './layouts/PublicLayout';
import { AdminLayout } from './layouts/AdminLayout';

import { Home } from './pages/Home';
import { Menu } from './pages/Menu';
import { ProductDetail } from './pages/ProductDetail';
import { CartPage } from './pages/CartPage';
import { Checkout } from './pages/Checkout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { OrderTicket } from './pages/OrderTicket';
import { OrderTracking } from './pages/OrderTracking';
import { MyOrders } from './pages/MyOrders';
import { Profile } from './pages/Profile';
import { NotFound } from './pages/NotFound';

import { Dashboard } from './pages/admin/Dashboard';
import { AdminOrders } from './pages/admin/Orders';
import { AdminOrderDetail } from './pages/admin/OrderDetail';
import { AdminPayments } from './pages/admin/Payments';
import { AdminProducts } from './pages/admin/Products';
import { AdminCategories } from './pages/admin/Categories';
import { AdminCustomers } from './pages/admin/Customers';
import { AdminImages } from './pages/admin/Images';
import { AdminSettings } from './pages/admin/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <Routes>
              {/* Sitio público / cliente */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/menu" element={<Menu />} />
                <Route path="/producto/:id" element={<ProductDetail />} />
                <Route path="/carrito" element={<CartPage />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Register />} />
                <Route path="/pedido/:orderNumber" element={<OrderTicket />} />
                <Route path="/seguimiento" element={<OrderTracking />} />
                <Route
                  path="/mis-pedidos"
                  element={
                    <ProtectedRoute role="client">
                      <MyOrders />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/perfil"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Route>

              {/* Panel administrativo */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute role="admin">
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="pedidos" element={<AdminOrders />} />
                <Route path="pedidos/:id" element={<AdminOrderDetail />} />
                <Route path="pagos" element={<AdminPayments />} />
                <Route path="productos" element={<AdminProducts />} />
                <Route path="categorias" element={<AdminCategories />} />
                <Route path="clientes" element={<AdminCustomers />} />
                <Route path="imagenes" element={<AdminImages />} />
                <Route path="configuracion" element={<AdminSettings />} />
              </Route>
            </Routes>
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
