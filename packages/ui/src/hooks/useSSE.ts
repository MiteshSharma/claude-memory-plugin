import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function useSSE() {
  const [connected, setConnected] = useState(false)
  const queryClient = useQueryClient()
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    function connect() {
      const es = new EventSource('/api/stream')
      esRef.current = es

      es.addEventListener('connected', () => setConnected(true))

      es.addEventListener('new_activity', () => {
        queryClient.invalidateQueries({ queryKey: ['search'] })
        queryClient.invalidateQueries({ queryKey: ['stats'] })
      })

      es.addEventListener('new_summary', () => {
        queryClient.invalidateQueries({ queryKey: ['context'] })
        queryClient.invalidateQueries({ queryKey: ['sessions'] })
      })

      es.addEventListener('new_prompt', () => {
        queryClient.invalidateQueries({ queryKey: ['sessions'] })
      })

      es.addEventListener('processing_status', () => {
        queryClient.invalidateQueries({ queryKey: ['processing-status'] })
      })

      es.onerror = () => {
        setConnected(false)
        es.close()
        setTimeout(connect, 3000)
      }
    }

    connect()
    return () => esRef.current?.close()
  }, [queryClient])

  return { connected }
}
