let authToken = null
let activeOrgId = null

export function setAuthToken(token) {
  authToken = token
}

// only used by super_admin, who has no orgId of their own and must pick a
// target organization explicitly via the x-org-id header
export function setActiveOrgId(orgId) {
  activeOrgId = orgId
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(path, { method = 'GET', body, isForm = false, headers = {} } = {}) {
  const finalHeaders = { ...headers }
  if (authToken) finalHeaders.Authorization = `Bearer ${authToken}`
  if (activeOrgId) finalHeaders['x-org-id'] = activeOrgId
  if (!isForm && body !== undefined) finalHeaders['Content-Type'] = 'application/json'

  const res = await fetch(`/api${path}`, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  })

  if (res.status === 204) return null

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    throw new ApiError(data?.error || 'Xatolik yuz berdi', res.status)
  }
  return data
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData, isForm: true }),
}
