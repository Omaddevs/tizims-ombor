import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

function qs(params) {
  if (!params) return ''
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  if (!entries.length) return ''
  return `?${new URLSearchParams(entries).toString()}`
}

// ---------- Organizations ----------
export function useOrgsPublic() {
  return useQuery({ queryKey: ['orgs-public'], queryFn: () => api.get('/auth/orgs') })
}

export function useOrgsAdmin(enabled) {
  return useQuery({ queryKey: ['orgs-admin'], queryFn: () => api.get('/orgs'), enabled })
}

export function useCreateOrg() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/orgs', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orgs-admin'] }),
  })
}

// ---------- Categories ----------
export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories') })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/categories', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/categories/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.del(`/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

// ---------- Products ----------
export function useProducts(params) {
  return useQuery({ queryKey: ['products', params], queryFn: () => api.get(`/products${qs(params)}`) })
}

export function useProduct(id) {
  return useQuery({ queryKey: ['product', id], queryFn: () => api.get(`/products/${id}`), enabled: Boolean(id) })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/products', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/products/${id}`, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['products'] })
      if (vars?.id) qc.invalidateQueries({ queryKey: ['product', vars.id] })
    },
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.del(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useImportProducts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items) => api.post('/products/import', { items }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

// ---------- Employees ----------
export function useEmployees() {
  return useQuery({ queryKey: ['employees'], queryFn: () => api.get('/employees') })
}

export function useEmployee(id) {
  return useQuery({ queryKey: ['employee', id], queryFn: () => api.get(`/employees/${id}`), enabled: Boolean(id) })
}

export function useEmployeeHistory(id) {
  return useQuery({
    queryKey: ['employee-history', id],
    queryFn: () => api.get(`/employees/${id}/history`),
    enabled: Boolean(id),
  })
}

function invalidateEmployees(qc) {
  qc.invalidateQueries({ queryKey: ['employees'] })
  qc.invalidateQueries({ queryKey: ['employee'] })
  qc.invalidateQueries({ queryKey: ['employee-history'] })
  qc.invalidateQueries({ queryKey: ['employee-report'] })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/employees', payload),
    onSuccess: () => invalidateEmployees(qc),
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/employees/${id}`, payload),
    onSuccess: () => invalidateEmployees(qc),
  })
}

export function useDeleteEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.del(`/employees/${id}`),
    onSuccess: () => invalidateEmployees(qc),
  })
}

// ---------- Transactions ----------
export function useTransactions(params) {
  return useQuery({ queryKey: ['transactions', params], queryFn: () => api.get(`/transactions${qs(params)}`) })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/transactions', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/transactions/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.del(`/transactions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUploadDocument() {
  return useMutation({
    mutationFn: (file) => {
      const form = new FormData()
      form.append('file', file)
      return api.upload('/transactions/upload', form)
    },
  })
}

// ---------- Assignments ----------
export function useAssignments(params) {
  return useQuery({ queryKey: ['assignments', params], queryFn: () => api.get(`/assignments${qs(params)}`) })
}

export function useAssignment(id) {
  return useQuery({ queryKey: ['assignment', id], queryFn: () => api.get(`/assignments/${id}`), enabled: Boolean(id) })
}

function invalidateAssignments(qc, id) {
  qc.invalidateQueries({ queryKey: ['assignments'] })
  if (id) qc.invalidateQueries({ queryKey: ['assignment', id] })
  else qc.invalidateQueries({ queryKey: ['assignment'] })
}

export function useCreateAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/assignments', payload),
    onSuccess: (row) => {
      invalidateAssignments(qc, row?.id)
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['rooms'] })
    },
  })
}

export function useUpdateAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/assignments/${id}`, payload),
    onSuccess: (_data, vars) => invalidateAssignments(qc, vars.id),
  })
}

export function useConfirmAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/assignments/${id}/confirm`, {}),
    onSuccess: (_data, id) => invalidateAssignments(qc, id),
  })
}

export function useReturnAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/assignments/${id}/return`, {}),
    onSuccess: (_data, id) => {
      invalidateAssignments(qc, id)
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useRooms() {
  return useQuery({ queryKey: ['rooms'], queryFn: () => api.get('/rooms') })
}

export function useCreateRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/rooms', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  })
}

export function usePrinters() {
  return useQuery({
    queryKey: ['printers'],
    queryFn: () => api.get('/printers'),
    staleTime: 15_000,
  })
}

export function usePrintLabel() {
  return useMutation({
    mutationFn: (payload) => api.post('/printers/print', payload),
  })
}

// ---------- Scan ----------
export function useScanLookup() {
  return useMutation({ mutationFn: (code) => api.get(`/scan/${encodeURIComponent(code)}`) })
}

// ---------- Phone-pairing scan (scan from a phone camera into this session) ----------
export function useCreateScanPairSession() {
  return useMutation({ mutationFn: () => api.post('/scan-pair', {}) })
}

export function useEndScanPairSession() {
  return useMutation({ mutationFn: (id) => api.del(`/scan-pair/${id}`) })
}

// ---------- Reports ----------
export function useReportSummary(params) {
  return useQuery({ queryKey: ['report-summary', params], queryFn: () => api.get(`/reports/summary${qs(params)}`) })
}

export function useLowStock() {
  return useQuery({ queryKey: ['low-stock'], queryFn: () => api.get('/reports/low-stock') })
}

export function useEmployeeReport(id) {
  return useQuery({
    queryKey: ['employee-report', id],
    queryFn: () => api.get(`/reports/employee/${id}`),
    enabled: Boolean(id),
  })
}

// ---------- Users ----------
export function useOrgUsers() {
  return useQuery({ queryKey: ['org-users'], queryFn: () => api.get('/users') })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/users', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-users'] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/users/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-users'] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.del(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-users'] }),
  })
}

// ---------- Auth / profile ----------
export function useMeStats() {
  return useQuery({ queryKey: ['me-stats'], queryFn: () => api.get('/auth/me/stats') })
}

export function useUpdateProfile() {
  return useMutation({ mutationFn: (payload) => api.patch('/auth/me', payload) })
}

export function useChangePassword() {
  return useMutation({ mutationFn: (payload) => api.post('/auth/change-password', payload) })
}

// ---------- Notifications ----------
export function useNotifications() {
  return useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/notifications'), refetchInterval: 30000 })
}

export function useMarkNotifRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkAllNotifsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/notifications/read-all', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
