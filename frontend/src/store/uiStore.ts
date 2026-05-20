import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ThemeMode = 'dark' | 'light'

interface UiState {
  themeMode: ThemeMode
  toggleTheme: () => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      themeMode: 'dark',
      toggleTheme: () =>
        set({ themeMode: get().themeMode === 'dark' ? 'light' : 'dark' }),
    }),
    { name: 'mgt-ui' }
  )
)
