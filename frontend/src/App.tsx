import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import viVN from 'antd/locale/vi_VN'
import { Toaster } from 'react-hot-toast'
import { router } from './router'
import { useUiStore } from '@/store/uiStore'
import { themeTokens, antdTokens } from '@/theme/tokens'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

export default function App() {
  const themeMode = useUiStore(s => s.themeMode)
  const isDark = themeMode === 'dark'

  useEffect(() => {
    const vars = themeTokens[themeMode]
    const root = document.documentElement
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
    root.style.setProperty('color-scheme', themeMode)
    root.setAttribute('data-theme', themeMode)
  }, [themeMode])

  const antdTheme = {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      ...antdTokens[themeMode],
      colorPrimary: isDark ? '#00E5FF' : '#0077AA',
      borderRadius: 14,
      fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    },
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={viVN} theme={antdTheme}>
        <RouterProvider router={router} />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--ink-2)',
              color: 'var(--fg-1)',
              border: '1px solid var(--glass-stroke-strong)',
              backdropFilter: 'blur(24px)',
              fontFamily: '"SF Pro Display", -apple-system, system-ui, sans-serif',
            },
          }}
        />
      </ConfigProvider>
    </QueryClientProvider>
  )
}
