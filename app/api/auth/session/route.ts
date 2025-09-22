import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const isAuthenticated = await getSession()
    return NextResponse.json({ isAuthenticated })
  } catch (error) {
    return NextResponse.json({ isAuthenticated: false })
  }
}
