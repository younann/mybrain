import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { signedImageUrl } from './entries'

/** Resolves a Storage path to a temporary signed URL (or null). */
export function useSignedImage(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    if (path) {
      signedImageUrl(supabase, path).then((u) => {
        if (alive) setUrl(u)
      })
    } else {
      setUrl(null)
    }
    return () => {
      alive = false
    }
  }, [path])
  return url
}
