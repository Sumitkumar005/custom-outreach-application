import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    const isAuthenticated = await getSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user identifier (using email as user_id for simplicity)
    const userId = "user@example.com" // TODO: Get actual user ID from session

    // Get settings from Supabase for this user
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Settings fetch error:', error)
      
      // If no settings found, return empty defaults
      if (error.code === 'PGRST116' || error.message.includes('No rows found')) {
        return NextResponse.json({
          openaiApiKey: "",
          email: "",
          appPassword: "",
          ccRecipients: "",
          hasOpenaiKey: false,
          hasAppPassword: false,
        })
      }
      
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
    }

    // Return settings with masked password for security
    const safeSettings = {
      openaiApiKey: settings?.openai_api_key ? "***" + settings.openai_api_key.slice(-4) : "",
      email: settings?.email || "",
      appPassword: settings?.app_password ? "***" + settings.app_password.slice(-4) : "",
      ccRecipients: settings?.cc_recipients || "",
      senderName: settings?.sender_name || "",
      senderDesignation: settings?.sender_designation || "",
      senderPhone: settings?.sender_phone || "",
      senderCompany: settings?.sender_company || "",
      hasOpenaiKey: !!settings?.openai_api_key,
      hasAppPassword: !!settings?.app_password,
    }

    return NextResponse.json(safeSettings)
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await getSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { openaiApiKey, email, appPassword, ccRecipients, senderName, senderDesignation, senderPhone, senderCompany } = body

    // Validate required fields
    if (!openaiApiKey || !email || !appPassword) {
      return NextResponse.json({ error: "OpenAI API key, email, and app password are required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Validate OpenAI API key format
    if (!openaiApiKey.startsWith("sk-")) {
      return NextResponse.json({ error: "Invalid OpenAI API key format" }, { status: 400 })
    }

    console.log('Attempting to save settings to Supabase...')

    // Get user identifier (using email as user_id for simplicity)
    const userId = "user@example.com" // TODO: Get actual user ID from session

    // First try to get existing settings for this user
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('user_id', userId)
      .single()

    let result

    if (existing) {
      // Update existing settings
      result = await supabase
        .from('settings')
        .update({
          openai_api_key: openaiApiKey,
          email,
          app_password: appPassword,
          cc_recipients: ccRecipients || null,
          sender_name: senderName || null,
          sender_designation: senderDesignation || null,
          sender_phone: senderPhone || null,
          sender_company: senderCompany || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
    } else {
      // Insert new settings
      result = await supabase
        .from('settings')
        .insert({
          user_id: userId,
          openai_api_key: openaiApiKey,
          email,
          app_password: appPassword,
          cc_recipients: ccRecipients || null,
          sender_name: senderName || null,
          sender_designation: senderDesignation || null,
          sender_phone: senderPhone || null,
          sender_company: senderCompany || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
    }

    if (result.error) {
      console.error('Supabase settings save error:', result.error)
      return NextResponse.json({ 
        error: `Database error: ${result.error.message}`,
        details: result.error
      }, { status: 500 })
    }

    console.log('Settings saved successfully to Supabase')
    return NextResponse.json({ success: true, message: "Settings saved successfully" })

  } catch (error) {
    console.error('Settings POST error:', error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}