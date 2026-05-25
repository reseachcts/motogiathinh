import React from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import StudentListPage from '@/pages/students/StudentListPage'

// Lazy pages
const StudentDetailPage = React.lazy(() => import('@/pages/students/StudentDetailPage'))
const StudentCreatePage = React.lazy(() => import('@/pages/students/StudentCreatePage'))
const ClassListPage = React.lazy(() => import('@/pages/classes/ClassListPage'))
const ClassDetailPage = React.lazy(() => import('@/pages/classes/ClassDetailPage'))
const InstructorListPage = React.lazy(() => import('@/pages/instructors/InstructorListPage'))
const SchedulePage = React.lazy(() => import('@/pages/schedule/SchedulePage'))
const VehicleListPage = React.lazy(() => import('@/pages/vehicles/VehicleListPage'))
const PromotionListPage = React.lazy(() => import('@/pages/promotions/PromotionListPage'))
const LeadListPage = React.lazy(() => import('@/pages/leads/LeadListPage'))
const PaymentListPage = React.lazy(() => import('@/pages/payments/PaymentListPage'))
const ReportsPage = React.lazy(() => import('@/pages/reports/ReportsPage'))
const AnalyticsPage = React.lazy(() => import('@/pages/reports/AnalyticsPage'))
const AdminUsersPage = React.lazy(() => import('@/pages/admin/AdminUsersPage'))
const AuditLogsPage = React.lazy(() => import('@/pages/admin/AuditLogsPage'))
const ProfilePage = React.lazy(() => import('@/pages/profile/ProfilePage'))

const ProtectedRoute: React.FC = () => {
  const token = useAuthStore(s => s.accessToken)
  if (!token) return <Navigate to="/login" replace />
  return <Outlet />
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/students', element: <StudentListPage /> },
          { path: '/students/new', element: <React.Suspense fallback={null}><StudentCreatePage /></React.Suspense> },
          { path: '/students/:id', element: <React.Suspense fallback={null}><StudentDetailPage /></React.Suspense> },
          { path: '/leads', element: <React.Suspense fallback={null}><LeadListPage /></React.Suspense> },
          { path: '/payments', element: <React.Suspense fallback={null}><PaymentListPage /></React.Suspense> },
          { path: '/reports', element: <Navigate to="/analytics" replace /> },
          { path: '/analytics', element: <React.Suspense fallback={null}><AnalyticsPage /></React.Suspense> },
          // Placeholder routes — to be implemented
          { path: '/classes', element: <React.Suspense fallback={null}><ClassListPage /></React.Suspense> },
          { path: '/classes/:id', element: <React.Suspense fallback={null}><ClassDetailPage /></React.Suspense> },
          { path: '/schedule', element: <React.Suspense fallback={null}><SchedulePage /></React.Suspense> },
          { path: '/exams', element: <div style={{padding:40,color:'var(--mgt-text-secondary)'}}>Exams — coming soon</div> },
          { path: '/certificates', element: <div style={{padding:40,color:'var(--mgt-text-secondary)'}}>Certificates — coming soon</div> },
          { path: '/instructors', element: <React.Suspense fallback={null}><InstructorListPage /></React.Suspense> },
          { path: '/vehicles', element: <React.Suspense fallback={null}><VehicleListPage /></React.Suspense> },
          { path: '/promotions', element: <React.Suspense fallback={null}><PromotionListPage /></React.Suspense> },
          { path: '/admin', element: <React.Suspense fallback={null}><AdminUsersPage /></React.Suspense> },
          { path: '/admin/users', element: <React.Suspense fallback={null}><AdminUsersPage /></React.Suspense> },
          { path: '/admin/logs', element: <React.Suspense fallback={null}><AuditLogsPage /></React.Suspense> },
          { path: '/profile', element: <React.Suspense fallback={null}><ProfilePage /></React.Suspense> },
        ],
      },
    ],
  },
])
