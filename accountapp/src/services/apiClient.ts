import axios from 'axios'

const ____API_BASE = process.env.REACT_APP_API_URL || ''
const ____ACCESS_TOKEN_KEY = 'authToken'

function ____formatAuthHeader(token: string): string {
  return token.split('.').length === 3 ? `Bearer ${token}` : `Token ${token}`
}

function ____rewriteToVersionedApi(url?: string): string | undefined {
  if (!url || !url.startsWith('/api/') || url.startsWith('/api/v1/')) {
    return url
  }
  return url.replace('/api/', '/api/v1/')
}

function ____unwrapEnvelope(payload: any) {
  if (payload && typeof payload === 'object' && 'success' in payload) {
    return payload.data
  }
  return payload
}

const client = axios.create({
  baseURL: ____API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

// Add request interceptor to include auth token if available
let ____currentToken: string | null = null

export function setAuthToken(token: string | null) {
  ____currentToken = token
  if (token) {
    client.defaults.headers = client.defaults.headers || {}
    client.defaults.headers.Authorization = ____formatAuthHeader(token)
  } else if (client.defaults.headers) {
    delete (client.defaults.headers as any).Authorization
  }
}

// initialize from localStorage if present for backward compatibility
____currentToken = localStorage.getItem(____ACCESS_TOKEN_KEY)
if (____currentToken) setAuthToken(____currentToken)

client.interceptors.request.use(
  (config) => {
    config.url = ____rewriteToVersionedApi(config.url)
    if (____currentToken) {
      config.headers = config.headers || {}
      config.headers.Authorization = ____formatAuthHeader(____currentToken)
    }
    return config
  },
  (error) => Promise.reject(error)
)

client.interceptors.response.use(
  (response) => {
    response.data = ____unwrapEnvelope(response.data)
    return response
  },
  (error) => Promise.reject(error)
)

export function clearAuthToken() {
  ____currentToken = null
  if (client.defaults.headers) {
    delete (client.defaults.headers as any).Authorization
  }
}

export default client
