import { useEffect } from 'react'

const APP_NAME = 'CrowdMix'

export function usePageTitle(title?: string | null) {
  useEffect(() => {
    document.title = title?.trim() ? `${title.trim()} · ${APP_NAME}` : APP_NAME

    return () => {
      document.title = APP_NAME
    }
  }, [title])
}
