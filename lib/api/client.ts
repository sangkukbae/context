// Lightweight HTTP API client for the app
// - Attaches Supabase access token automatically
// - Unwraps our standard { success, data, message } envelope
// - Throws typed ApiError on non-2xx responses

import { supabase } from '@/lib/supabase/client'

export class ApiError extends Error {
  status: number
  data?: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

type FetchOptions = Omit<RequestInit, 'method' | 'body' | 'headers'> & {
  headers?: HeadersInit
}

async function getAccessToken(): Promise<string | undefined> {
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  } catch {
    return undefined
  }
}

function mergeHeaders(base: HeadersInit, extra?: HeadersInit): HeadersInit {
  if (!extra) return base
  return { ...(base as Record<string, string>), ...(extra as Record<string, string>) }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || ''
  let payload: any = undefined

  if (contentType.includes('application/json')) {
    try {
      payload = await res.json()
    } catch {
      payload = undefined
    }
  } else {
    try {
      const text = await res.text()
      payload = text ? { message: text } : undefined
    } catch {
      payload = undefined
    }
  }

  const isEnvelope = payload && typeof payload === 'object' && 'success' in payload

  if (!res.ok) {
    const message = (isEnvelope ? payload.message : undefined) || res.statusText || 'Request failed'
    const error = new ApiError(res.status, message, payload)

    // Handle authentication errors
    if (res.status === 401) {
      // Sign out the user and redirect to sign-in
      try {
        await supabase.auth.signOut()
      } catch {
        // Ignore sign out errors
      }

      // Redirect to sign-in page with error message
      if (typeof window !== 'undefined') {
        const errorParam = encodeURIComponent('Your session has expired. Please sign in again.')
        window.location.href = `/auth/sign-in?error=session_expired&error_description=${errorParam}`
      }
    }

    throw error
  }

  if (isEnvelope) {
    return (payload.data as T) ?? (payload as T)
  }
  return payload as T
}

class HttpApiClient {
  async get<T>(url: string, options?: FetchOptions): Promise<T> {
    const token = await getAccessToken()
    const headers = mergeHeaders(
      { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      options?.headers
    )

    const res = await fetch(url, { method: 'GET', headers, ...options })
    return handleResponse<T>(res)
  }

  async post<T>(url: string, body?: unknown, options?: FetchOptions): Promise<T> {
    const token = await getAccessToken()
    const headers = mergeHeaders(
      {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      options?.headers
    )

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    })
    return handleResponse<T>(res)
  }

  async put<T>(url: string, body?: unknown, options?: FetchOptions): Promise<T> {
    const token = await getAccessToken()
    const headers = mergeHeaders(
      {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      options?.headers
    )

    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    })
    return handleResponse<T>(res)
  }

  async delete<T = void>(url: string, options?: FetchOptions): Promise<T> {
    const token = await getAccessToken()
    const headers = mergeHeaders(
      { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      options?.headers
    )

    const res = await fetch(url, { method: 'DELETE', headers, ...options })
    return handleResponse<T>(res)
  }
}

export const apiClient = new HttpApiClient()
