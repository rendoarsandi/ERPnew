import React, { useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import {
  frappeGetCall,
  frappePostCall,
  frappeGetDoc,
  frappeGetDocList,
  frappeGetDocCount,
  frappeCreateDoc,
  frappeUpdateDoc,
  frappeDeleteDoc,
  frappeUploadFile
} from '../lib/frappeServer'

export { useSWRConfig }

export interface FrappeError {
  message?: string
  exception?: string
  _server_messages?: string
  status_code?: number
}

export interface FrappeConfig {
  socketPort?: string
  siteName?: string
}

export const FrappeContext = React.createContext<any>(null)

export type Filter = [string, string, any] | [string, any]

export function useFrappeGetCall<T = any>(
  method: string,
  params?: any,
  key?: string | null,
  config?: any,
  methodType: 'GET' | 'POST' = 'GET'
) {
  const swrKey = key !== null && key !== undefined
    ? key
    : method ? [method, params, methodType] : null

  const { data, error, mutate, isValidating } = useSWR<T>(
    swrKey,
    async (k: any) => {
      let m = method
      let p = params
      let mt = methodType
      if (Array.isArray(k)) {
        m = k[0]
        p = k[1]
        mt = k[2] || 'GET'
      }
      if (mt === 'POST') {
        const res = await frappePostCall({ data: { method: m, args: p } })
        return res as T
      } else {
        const res = await frappeGetCall({ data: { method: m, params: p } })
        return res as T
      }
    },
    config
  )

  return {
    data,
    error,
    isLoading: !data && !error,
    isValidating,
    mutate,
  }
}

export function useFrappePostCall<T = any>(method: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const call = async (args?: any) => {
    setLoading(true)
    setError(null)
    try {
      const res = await frappePostCall({ data: { method, args } })
      return res as T
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    call,
    loading,
    error,
  }
}

export function useFrappeGetDoc<T = any>(
  doctype: string,
  name?: string | null,
  key?: string | null,
  config?: any
) {
  const swrKey = key !== null && key !== undefined
    ? key
    : doctype && name ? [`doc`, doctype, name] : null

  const { data, error, mutate, isValidating } = useSWR<T>(
    swrKey as any,
    (async () => {
      if (!doctype || !name) return undefined
      const res = await frappeGetDoc({ data: { doctype, name } })
      return res.data as T
    }) as any,
    config
  )

  return {
    data,
    error,
    isLoading: !data && !error,
    isValidating,
    mutate,
  }
}

export function useFrappeGetDocList<T = any>(
  doctype: string,
  params?: any,
  key?: string | null,
  config?: any
) {
  const swrKey = key !== null && key !== undefined
    ? key
    : doctype ? [`doclist`, doctype, params] : null

  const { data, error, mutate, isValidating } = useSWR<T>(
    swrKey as any,
    (async () => {
      if (!doctype) return undefined
      const res = await frappeGetDocList({ data: { doctype, params } })
      return res.data as T
    }) as any,
    config
  )

  return {
    data,
    error,
    isLoading: !data && !error,
    isValidating,
    mutate,
  }
}

export function useFrappeGetDocCount<T = any>(
  doctype: string,
  filters?: any,
  key?: string | null,
  config?: any
) {
  const swrKey = key !== null && key !== undefined
    ? key
    : doctype ? [`doccount`, doctype, filters] : null

  const { data, error, mutate, isValidating } = useSWR<T>(
    swrKey as any,
    (async () => {
      if (!doctype) return undefined
      const res = await frappeGetDocCount({ data: { doctype, filters } })
      return res.message as T
    }) as any,
    config
  )

  return {
    data,
    error,
    isLoading: !data && !error,
    isValidating,
    mutate,
  }
}

export function useFrappeCreateDoc<T = any>(defaultDoctype?: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const createDoc = async (arg1: any, arg2?: any) => {
    setLoading(true)
    setError(null)
    try {
      let targetDoctype = defaultDoctype
      let data = arg1
      if (arg2 !== undefined) {
        targetDoctype = arg1
        data = arg2
      }
      if (!targetDoctype) {
        throw new Error('Doctype is required to create document')
      }
      const res = await frappeCreateDoc({ data: { doctype: targetDoctype, data } })
      return res.data as T
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    createDoc,
    loading,
    error,
  }
}

export function useFrappeUpdateDoc<T = any>(defaultDoctype?: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const updateDoc = async (arg1: any, arg2?: any, arg3?: any) => {
    setLoading(true)
    setError(null)
    try {
      let targetDoctype = defaultDoctype
      let name: string
      let data: any
      if (arg3 !== undefined) {
        targetDoctype = arg1
        name = arg2
        data = arg3
      } else {
        name = arg1
        data = arg2
      }
      if (!targetDoctype) {
        throw new Error('Doctype is required to update document')
      }
      const res = await frappeUpdateDoc({ data: { doctype: targetDoctype, name, data } })
      return res.data as T
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    updateDoc,
    loading,
    error,
  }
}

export function useFrappeDeleteDoc(defaultDoctype?: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const deleteDoc = async (arg1: any, arg2?: any) => {
    setLoading(true)
    setError(null)
    try {
      let targetDoctype = defaultDoctype
      let name: string
      if (arg2 !== undefined) {
        targetDoctype = arg1
        name = arg2
      } else {
        name = arg1
      }
      if (!targetDoctype) {
        throw new Error('Doctype is required to delete document')
      }
      const res = await frappeDeleteDoc({ data: { doctype: targetDoctype, name } })
      return res
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    deleteDoc,
    loading,
    error,
  }
}

export function useFrappeFileUpload() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const upload = async (
    file: File,
    args: { isPrivate?: boolean; doctype?: string; docname?: string; fieldname?: string }
  ) => {
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (args.isPrivate) {
        formData.append('is_private', '1')
      }
      if (args.doctype) {
        formData.append('doctype', args.doctype)
      }
      if (args.docname) {
        formData.append('docname', args.docname)
      }
      if (args.fieldname) {
        formData.append('fieldname', args.fieldname)
      }

      const res = await frappeUploadFile({ data: formData }) as any
      return res.message || res
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    upload,
    loading,
    error,
  }
}

export function useFrappeEventListener(_event: string, _callback: (event: any) => void) {
  // No-op on client side for now
}

export function useFrappeDocumentEventListener(_doctype: string, _name: string, _callback: (event: any) => void) {
  // No-op on client side for now
}
