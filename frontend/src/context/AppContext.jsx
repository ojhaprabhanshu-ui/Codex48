import { useEffect, useMemo, useRef, useState } from 'react'
import { getBrands } from '../services/brandsApi'
import { AppContext } from './appContext.js'

export function AppProvider({ children }) {
  const [brands, setBrands] = useState([])
  const [brandsLoading, setBrandsLoading] = useState(true)
  const [brandError, setBrandError] = useState('')
  const [activeBrandId, setActiveBrandIdState] = useState(
    () => window.localStorage.getItem('brandproof.active-brand') || '',
  )
  const activeBrandIdRef = useRef(activeBrandId)
  const [theme, setTheme] = useState(
    () => window.localStorage.getItem('brandproof.theme') || 'light',
  )

  useEffect(() => {
    let alive = true
    getBrands()
      .then((items) => {
        if (!alive) return
        const list = Array.isArray(items) ? items : (items?.brands || [])
        setBrands(list)
        if (!list.some((brand) => String(brand.id) === String(activeBrandIdRef.current))) {
          setActiveBrandIdState(list[0]?.id ? String(list[0].id) : '')
        }
      })
      .catch((error) => {
        if (alive) setBrandError(error?.message || 'Could not load brands.')
      })
      .finally(() => {
        if (alive) setBrandsLoading(false)
      })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    activeBrandIdRef.current = activeBrandId
  }, [activeBrandId])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('brandproof.theme', theme)
  }, [theme])

  const activeBrand = brands.find((brand) => String(brand.id) === String(activeBrandId)) || brands[0] || null
  const value = useMemo(() => ({
    brands,
    brandsLoading,
    brandError,
    activeBrand,
    activeBrandId: activeBrand?.id || activeBrandId,
    setActiveBrandId: (id) => {
      const value = String(id)
      setActiveBrandIdState(value)
      window.localStorage.setItem('brandproof.active-brand', value)
    },
    theme,
    setTheme,
    toggleTheme: () => setTheme((current) => current === 'light' ? 'dark' : 'light'),
  }), [brands, brandsLoading, brandError, activeBrand, activeBrandId, theme])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
