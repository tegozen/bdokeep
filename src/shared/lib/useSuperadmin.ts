import { useConfirm } from './useConfirm'

export function useSuperadmin() {
  const isSuperadmin = useState('superadmin', () => false)
  const { confirm } = useConfirm()

  async function refresh() {
    try {
      const res = await $fetch<{ ok: boolean }>('/api/admin/me')
      isSuperadmin.value = Boolean(res.ok)
    } catch {
      isSuperadmin.value = false
    }
  }

  async function login(password: string) {
    await $fetch('/api/admin/login', {
      method: 'POST',
      body: { password },
    })
    isSuperadmin.value = true
  }

  async function logout() {
    const ok = await confirm({
      title: 'Выход',
      message: 'Выйти из режима суперадмина?',
      confirmLabel: 'Выйти',
      cancelLabel: 'Отмена',
    })
    if (!ok) return false
    await $fetch('/api/admin/logout', { method: 'POST' }).catch(() => {})
    isSuperadmin.value = false
    return true
  }

  return { isSuperadmin, refresh, login, logout }
}
