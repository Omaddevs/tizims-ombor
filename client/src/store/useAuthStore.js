import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, setActiveOrgId, setAuthToken } from '../api/client'

function syncToken(state) {
  setAuthToken(state?.token || null)
  setActiveOrgId(state?.user?.role === 'super_admin' ? state?.pickedOrgId || null : null)
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      org: null,
      pickedOrgId: null, // super_admin only: which org they're currently viewing

      pickOrg: (orgId) => {
        set({ pickedOrgId: orgId })
        syncToken(get())
      },

      login: async (orgId, identity, password) => {
        try {
          const res = await api.post('/auth/login', { orgId, identity, password })
          set({ token: res.token, user: res.user, org: res.org, pickedOrgId: orgId })
          syncToken(get())
          return { ok: true, user: res.user }
        } catch (e) {
          return { ok: false, error: e.message }
        }
      },

      logout: () => {
        set({ token: null, user: null, org: null, pickedOrgId: null })
        syncToken({})
      },

      refreshMe: async () => {
        try {
          const res = await api.get('/auth/me')
          set({ user: res.user, org: res.org })
        } catch {
          get().logout()
        }
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'tizims-ombor-auth',
      onRehydrateStorage: () => (state) => syncToken(state),
    },
  ),
)

export function useCurrentUser() {
  return useAuthStore((s) => s.user)
}
