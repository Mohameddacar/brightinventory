export const AUTH_TOKEN_STORAGE_KEY = "ims_auth_token"
export const ACTIVE_USER_STORAGE_KEY = "ims_active_user_id"
export const ACTIVE_USER_PROFILE_KEY = "ims_active_user_profile"

type SessionUser = {
  id: number
  name: string
  email: string
  role_id: number
  role_name: string
  permissions?: string[]
}

const writeSessionStorage = (rememberMe: boolean, key: string, value: string) => {
  if (rememberMe) {
    window.localStorage.setItem(key, value)
    window.sessionStorage.removeItem(key)
  } else {
    window.sessionStorage.setItem(key, value)
    window.localStorage.removeItem(key)
  }
}

const readSessionStorage = (key: string) => {
  const localValue = window.localStorage.getItem(key)
  if (localValue) {
    return localValue
  }

  return window.sessionStorage.getItem(key)
}

export const setAuthSession = (token: string, user: SessionUser, rememberMe = true) => {
  if (typeof window === "undefined") {
    return
  }

  writeSessionStorage(rememberMe, AUTH_TOKEN_STORAGE_KEY, token)
  writeSessionStorage(rememberMe, ACTIVE_USER_STORAGE_KEY, String(user.id))
  writeSessionStorage(rememberMe, ACTIVE_USER_PROFILE_KEY, JSON.stringify(user))

  const cookieValue = rememberMe
    ? `ims_token=${encodeURIComponent(token)}; Path=/; Max-Age=${60 * 60 * 12}; SameSite=Lax`
    : `ims_token=${encodeURIComponent(token)}; Path=/; SameSite=Lax`
  document.cookie = cookieValue
  window.dispatchEvent(new Event("ims-access-updated"))
}

export const clearAuthSession = () => {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  window.localStorage.removeItem(ACTIVE_USER_STORAGE_KEY)
  window.sessionStorage.removeItem(ACTIVE_USER_STORAGE_KEY)
  window.localStorage.removeItem(ACTIVE_USER_PROFILE_KEY)
  window.sessionStorage.removeItem(ACTIVE_USER_PROFILE_KEY)
  document.cookie = "ims_token=; Path=/; Max-Age=0; SameSite=Lax"
  window.dispatchEvent(new Event("ims-access-updated"))
}

export const getStoredUserProfile = (): SessionUser | null => {
  if (typeof window === "undefined") {
    return null
  }

  const raw = readSessionStorage(ACTIVE_USER_PROFILE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") {
      return null
    }
    return parsed as SessionUser
  } catch {
    return null
  }
}

export const hasAuthSession = () => {
  if (typeof window === "undefined") {
    return false
  }
  return Boolean(readSessionStorage(AUTH_TOKEN_STORAGE_KEY))
}
