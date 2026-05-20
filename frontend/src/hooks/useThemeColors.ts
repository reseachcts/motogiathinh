import { useUiStore } from '@/store/uiStore'
import { themeTokens } from '@/theme/tokens'

export function useThemeColors() {
  const mode = useUiStore(s => s.themeMode)
  return themeTokens[mode]
}
