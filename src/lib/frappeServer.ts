import { createServerFn } from '@tanstack/react-start'
import { getRequest, setResponseHeader } from '@tanstack/react-start/server'

const FRAPPE_URL = process.env.FRAPPE_BACKEND_URL || 'http://127.0.0.1:8000'

async function forwardRequest(path: string, options: RequestInit = {}): Promise<any> {
  const request = getRequest()
  const cookie = request?.headers?.get('cookie') || ''

  const url = `${FRAPPE_URL}${path}`
  const headers = new Headers(options.headers || {})
  if (cookie) {
    headers.set('cookie', cookie)
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Propagate set-cookie back to the client
  const setCookie = response.headers.get('set-cookie')
  if (setCookie) {
    setResponseHeader('set-cookie', setCookie)
  }

  if (!response.ok) {
    const errorText = await response.text()
    let errorJson
    try {
      errorJson = JSON.parse(errorText)
    } catch {
      errorJson = { message: errorText }
    }
    throw errorJson
  }

  return response.json()
}

export const frappeGetCall = createServerFn({
  method: 'GET',
})
  .inputValidator((d: { method: string; params?: any }) => d)
  .handler(async ({ data: input }) => {
    const query = input.params ? '?' + new URLSearchParams(
      Object.entries(input.params).reduce((acc, [k, v]) => {
        acc[k] = typeof v === 'object' ? JSON.stringify(v) : String(v)
        return acc
      }, {} as Record<string, string>)
    ).toString() : ''
    return forwardRequest(`/api/method/${input.method}${query}`, {
      method: 'GET',
    })
  })

export const frappePostCall = createServerFn({
  method: 'POST',
})
  .inputValidator((d: { method: string; args?: any }) => d)
  .handler(async ({ data: input }) => {
    return forwardRequest(`/api/method/${input.method}`, {
      method: 'POST',
      body: JSON.stringify(input.args || {}),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  })

export const frappeGetDoc = createServerFn({
  method: 'GET',
})
  .inputValidator((d: { doctype: string; name: string }) => d)
  .handler(async ({ data: input }) => {
    return forwardRequest(`/api/resource/${encodeURIComponent(input.doctype)}/${encodeURIComponent(input.name)}`, {
      method: 'GET',
    })
  })

export const frappeGetDocList = createServerFn({
  method: 'GET',
})
  .inputValidator((d: { doctype: string; params?: any }) => d)
  .handler(async ({ data: input }) => {
    // frappe-react-sdk fields, filters are stringified arrays
    const formattedParams: Record<string, string> = {}
    if (input.params) {
      if (input.params.fields) {
        formattedParams.fields = JSON.stringify(input.params.fields)
      }
      if (input.params.filters) {
        formattedParams.filters = JSON.stringify(input.params.filters)
      }
      if (input.params.limit) {
        formattedParams.limit_page_length = String(input.params.limit)
      }
      if (input.params.limit_page_length) {
        formattedParams.limit_page_length = String(input.params.limit_page_length)
      }
      if (input.params.limit_start) {
        formattedParams.limit_start = String(input.params.limit_start)
      }
      if (input.params.orderBy) {
        if (typeof input.params.orderBy === 'object' && input.params.orderBy.field) {
          formattedParams.order_by = `${input.params.orderBy.field} ${input.params.orderBy.order || 'asc'}`
        } else if (typeof input.params.orderBy === 'string') {
          formattedParams.order_by = input.params.orderBy
        }
      }
      // Copy other params
      for (const [key, val] of Object.entries(input.params)) {
        if (!['fields', 'filters', 'limit', 'limit_page_length', 'limit_start', 'orderBy'].includes(key)) {
          formattedParams[key] = typeof val === 'object' ? JSON.stringify(val) : String(val)
        }
      }
    }

    const query = '?' + new URLSearchParams(formattedParams).toString()
    return forwardRequest(`/api/resource/${encodeURIComponent(input.doctype)}${query}`, {
      method: 'GET',
    })
  })

export const frappeGetDocCount = createServerFn({
  method: 'GET',
})
  .inputValidator((d: { doctype: string; filters?: any }) => d)
  .handler(async ({ data: input }) => {
    const params: Record<string, string> = {
      doctype: input.doctype,
    }
    if (input.filters) {
      params.filters = JSON.stringify(input.filters)
    }
    const query = '?' + new URLSearchParams(params).toString()
    return forwardRequest(`/api/method/frappe.client.get_count${query}`, {
      method: 'GET',
    })
  })

export const frappeCreateDoc = createServerFn({
  method: 'POST',
})
  .inputValidator((d: { doctype: string; data: any }) => d)
  .handler(async ({ data: input }) => {
    return forwardRequest(`/api/resource/${encodeURIComponent(input.doctype)}`, {
      method: 'POST',
      body: JSON.stringify(input.data),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  })

export const frappeUpdateDoc = createServerFn({
  method: 'POST',
})
  .inputValidator((d: { doctype: string; name: string; data: any }) => d)
  .handler(async ({ data: input }) => {
    return forwardRequest(`/api/resource/${encodeURIComponent(input.doctype)}/${encodeURIComponent(input.name)}`, {
      method: 'PUT',
      body: JSON.stringify(input.data),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  })

export const frappeDeleteDoc = createServerFn({
  method: 'POST',
})
  .inputValidator((d: { doctype: string; name: string }) => d)
  .handler(async ({ data: input }) => {
    return forwardRequest(`/api/resource/${encodeURIComponent(input.doctype)}/${encodeURIComponent(input.name)}`, {
      method: 'DELETE',
    })
  })

export const frappeUploadFile = createServerFn({
  method: 'POST',
})
  .inputValidator((formData: FormData) => formData)
  .handler(async ({ data: formData }): Promise<any> => {
    // Retrieve headers/cookies on server side
    const request = getRequest()
    const cookie = request?.headers?.get('cookie') || ''

    const url = `${FRAPPE_URL}/api/method/upload_file`
    const headers = new Headers()
    if (cookie) {
      headers.set('cookie', cookie)
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers,
    })

    const setCookie = response.headers.get('set-cookie')
    if (setCookie) {
      setResponseHeader('set-cookie', setCookie)
    }

    if (!response.ok) {
      const errorText = await response.text()
      let errorJson
      try {
        errorJson = JSON.parse(errorText)
      } catch {
        errorJson = { message: errorText }
      }
      throw errorJson
    }

    return response.json()
  })
