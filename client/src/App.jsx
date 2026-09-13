import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Categories from './pages/Categories'
import StockIn from './pages/StockIn'
import StockOut from './pages/StockOut'
import Scan from './pages/Scan'
import Employees from './pages/Employees'
import EmployeeDetail from './pages/EmployeeDetail'
import Assignments from './pages/Assignments'
import AssignmentDetail from './pages/AssignmentDetail'
import Transactions from './pages/Transactions'
import Reports from './pages/Reports'
import Users from './pages/Users'
import Organizations from './pages/Organizations'
import Settings from './pages/Settings'
import Notifications from './pages/Notifications'
import ScanPairMobile from './pages/ScanPairMobile'
import { useAuthStore, useCurrentUser } from './store/useAuthStore'

function useHydrated() {
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated())
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    setHydrated(useAuthStore.persist.hasHydrated())
    return unsub
  }, [])
  return hydrated
}

function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f4f6fb]">
      <div className="flex flex-col items-center gap-3">
        <img src="/logo.svg" alt="" className="h-12 w-12 rounded-2xl" />
        <p className="text-sm font-medium text-slate-400">Yuklanmoqda...</p>
      </div>
    </div>
  )
}

function Guard({ roles }) {
  const me = useCurrentUser()
  const hydrated = useHydrated()
  if (!hydrated) return <Loading />
  if (!me) return <Navigate to="/login" replace />
  if (roles && !roles.includes(me.role)) return <Navigate to="/" replace />
  return <Outlet />
}

function Guest() {
  const me = useCurrentUser()
  const hydrated = useHydrated()
  if (!hydrated) return <Loading />
  if (me) return <Navigate to="/" replace />
  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/scan/pair/:id" element={<ScanPairMobile />} />
        <Route element={<Guest />}>
          <Route path="/login" element={<Login />} />
        </Route>
        <Route element={<Guard />}>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route element={<Guard roles={['admin', 'manager']} />}>
              <Route path="products" element={<Products />} />
              <Route path="products/:id" element={<ProductDetail />} />
              <Route path="categories" element={<Categories />} />
              <Route path="stock-in" element={<StockIn />} />
              <Route path="stock-out" element={<StockOut />} />
              <Route path="scan" element={<Scan />} />
              <Route path="employees" element={<Employees />} />
              <Route path="employees/:id" element={<EmployeeDetail />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="reports" element={<Reports />} />
            </Route>
            <Route path="assignments" element={<Assignments />} />
            <Route path="assignments/:id" element={<AssignmentDetail />} />
            <Route element={<Guard roles={['admin']} />}>
              <Route path="users" element={<Users />} />
            </Route>
            <Route element={<Guard roles={['super_admin']} />}>
              <Route path="organizations" element={<Organizations />} />
            </Route>
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
