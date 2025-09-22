import { cookies } from "next/headers"

const HARDCODED_EMAIL = ""
const HARDCODED_PASSWORD = ""
const SESSION_COOKIE = "email-outreach-session"

export interface LoginCredentials {
  email: string
  password: string
}

export function validateCredentials(credentials: LoginCredentials): boolean {
  return credentials.email === HARDCODED_EMAIL && credentials.password === HARDCODED_PASSWORD
}

export async function createSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE)
  return session?.value === "authenticated"
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
