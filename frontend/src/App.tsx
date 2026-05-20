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
  }, [themeMode])

  const antdTheme = {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#1677ff',
      ...antdTokens[themeMode],
      borderRadius: 8,
      fontFamily: "'Barlow', -apple-system, sans-serif",
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
              background: 'var(--mgt-bg-container)',
              color: 'var(--mgt-text-primary)',
              border: '1px solid var(--mgt-border-strong)',
              fontFamily: "'Barlow', sans-serif",
            },
          }}
        />
      </ConfigProvider>
    </QueryClientProvider>
  )
}
