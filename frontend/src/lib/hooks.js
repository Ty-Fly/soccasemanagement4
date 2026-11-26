import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribe } from '../api/realtime'

// Haalt data op en haalt opnieuw op bij een realtime-event (NFR-03, < 5 sec).
// `events`: lijst eventnamen waarop ververst wordt; leeg = op alle events.
export function useQuery(fetcher, deps = [], { events = [] } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const load = useCallback(async () => {
    try {
      const data = await fetcherRef.current()
      setState({ data, error: null, loading: false })
    } catch (error) {
      setState((s) => ({ data: s.data, error, loading: false }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }))
    load()
  }, [load])

  const eventKey = events.join(',')
  useEffect(
    () =>
      subscribe((name) => {
        if (!eventKey || eventKey.split(',').includes(name)) load()
      }),
    [load, eventKey],
  )

  return { ...state, reload: load }
}

// Tikt iedere seconde, voor live SLA-timers
export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(t)
  }, [interval])
  return now
}

// Voert een actie uit met laad- en foutstatus
export function useAction() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const run = useCallback(async (fn) => {
    setPending(true)
    setError(null)
    try {
      return await fn()
    } catch (e) {
      setError(e.message || 'Er ging iets mis.')
      return undefined
    } finally {
      setPending(false)
    }
  }, [])
  return { pending, error, setError, run }
}
