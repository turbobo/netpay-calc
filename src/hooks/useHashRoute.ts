import { useState, useEffect, useCallback } from 'react'

interface RouteInfo {
  path: string
  params: URLSearchParams
  navigate: (path: string) => void
}

function parseHash(): { path: string; params: URLSearchParams } {
  const hash = window.location.hash.slice(1) || '/'
  const [pathname, search] = hash.split('?')
  return {
    path: pathname || '/',
    params: new URLSearchParams(search || ''),
  }
}

export function useHashRoute(): RouteInfo {
  const [route, setRoute] = useState(parseHash)

  useEffect(() => {
    const handler = () => setRoute(parseHash())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const navigate = useCallback((path: string) => {
    window.location.hash = path
  }, [])

  return { ...route, navigate }
}
