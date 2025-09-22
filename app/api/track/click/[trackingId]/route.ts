import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Get client IP address from request
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // For local development/testing
  return '127.0.0.1'
}

// Parse user agent string to get device and browser info
function parseUserAgent(userAgent: string | null): { deviceType: string; browser: string; platform: string } {
  if (!userAgent) {
    return { deviceType: 'unknown', browser: 'unknown', platform: 'unknown' }
  }

  const ua = userAgent.toLowerCase()
  let deviceType = 'desktop'
  let browser = 'unknown'
  let platform = 'unknown'

  // Device detection
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    deviceType = 'mobile'
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    deviceType = 'tablet'
  }

  // Browser detection
  if (ua.includes('chrome') && !ua.includes('edg')) {
    browser = 'chrome'
  } else if (ua.includes('firefox')) {
    browser = 'firefox'
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'safari'
  } else if (ua.includes('edg')) {
    browser = 'edge'
  } else if (ua.includes('opera')) {
    browser = 'opera'
  }

  // Platform detection
  if (ua.includes('windows')) {
    platform = 'windows'
  } else if (ua.includes('mac')) {
    platform = 'mac'
  } else if (ua.includes('linux')) {
    platform = 'linux'
  } else if (ua.includes('android')) {
    platform = 'android'
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    platform = 'ios'
  }

  return { deviceType, browser, platform }
}

// Check if the click is genuine (not from bots, prefetchers, etc.)
function isGenuineClick(userAgent: string | null, ipAddress: string): boolean {
  if (!userAgent) return false;

  const ua = userAgent.toLowerCase();

  // Known bot/prefetcher user agents to filter out
  const botPatterns = [
    'googleimageproxy',
    'cloudmark',
    'symantec',
    'mimecast',
    'proofpoint',
    'barracuda',
    'spam',
    'filter',
    'crawler',
    'bot',
    'spider',
    'preview',
    'monitoring',
    'validator',
    'checker',
    'scanner',
    'monitor',
    'prefetch',
    'preload'
  ];

  // Check for bot patterns
  for (const pattern of botPatterns) {
    if (ua.includes(pattern)) {
      return false;
    }
  }

  // Check for local/internal IPs that might be testing
  if (ipAddress === '127.0.0.1' ||
      ipAddress.startsWith('192.168.') ||
      ipAddress.startsWith('10.') ||
      ipAddress.startsWith('172.16.') ||
      ipAddress === '::1') {
    return false;
  }

  return true;
}

// Get approximate location from IP (simple implementation)
async function getLocationFromIP(ip: string): Promise<{ country?: string; region?: string; city?: string }> {
  if (ip === 'unknown' || ip === '127.0.0.1' ||
      ip.startsWith('192.168.') || ip.startsWith('10.') ||
      ip.startsWith('172.16.') || ip === '::1') {
    return { country: 'local', region: 'local', city: 'local' }
  }

  try {
    // You can integrate with free IP geolocation services like:
    // - ipapi.co (free tier: 1000 requests/day)
    // - ipinfo.io (free tier: 50,000 requests/month)
    // - geojs.io (free)

    // Example with ipapi.co (uncomment to use):
    /*
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'Foreign-Admits-Email-Tracker/1.0' },
      timeout: 3000
    });

    if (response.ok) {
      const data = await response.json();
      return {
        country: data.country_name || 'unknown',
        region: data.region || 'unknown',
        city: data.city || 'unknown'
      };
    }
    */

    // Simple fallback based on IP ranges (for demo purposes)
    if (ip.includes('.') && !ip.includes(':')) {
      // IPv4 - simple country guess based on first octet
      const firstOctet = parseInt(ip.split('.')[0])
      if (firstOctet >= 1 && firstOctet <= 126) return { country: 'US', region: 'North America', city: 'Unknown' }
      if (firstOctet >= 127 && firstOctet <= 191) return { country: 'EU', region: 'Europe', city: 'Unknown' }
      if (firstOctet >= 192 && firstOctet <= 223) return { country: 'AS', region: 'Asia', city: 'Unknown' }
    }
  } catch (error) {
    console.error('Location detection error:', error)
  }

  return { country: 'unknown', region: 'unknown', city: 'unknown' }
}

// Update batch click statistics in Supabase
async function updateBatchClickStats(batchId: string, userId: string): Promise<void> {
  try {
    // Get all contacts for this batch
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('click_count')
      .eq('batch_id', batchId)
      .eq('user_id', userId)

    if (contactsError) {
      console.error("Failed to fetch contacts for batch stats:", contactsError)
      return
    }

    // Calculate click statistics
    const totalContacts = contacts?.length || 0
    const clickedContacts = contacts?.filter(contact => (contact.click_count || 0) > 0).length || 0
    const clickRate = totalContacts > 0 ? (clickedContacts / totalContacts) * 100 : 0

    // Update batch statistics
    const { error: updateError } = await supabase
      .from('batches')
      .update({
        clicked: clickedContacts,
        click_rate: clickRate,
        updated_at: new Date().toISOString()
      })
      .eq('id', batchId)
      .eq('user_id', userId)

    if (updateError) {
      console.error("Failed to update batch click stats:", updateError)
    } else {
      console.log(`Updated batch ${batchId} stats: ${clickedContacts}/${totalContacts} clicks (${clickRate.toFixed(1)}%)`)
    }
  } catch (error) {
    console.error("Failed to update batch click stats:", error)
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ trackingId: string }> }) {
  const { trackingId } = await params
  const timestamp = new Date().toISOString()
  const ipAddress = getClientIP(request)
  const userAgent = request.headers.get('user-agent')
  const { deviceType, browser, platform } = parseUserAgent(userAgent)
  const location = await getLocationFromIP(ipAddress)
  const url = request.nextUrl.searchParams.get('url') || 'https://visamonk.ai'

  // Log the click attempt immediately
  console.log(`Email click tracking - ID: ${trackingId}, IP: ${ipAddress}, URL: ${url}`)

  // Get user identifier (using email as user_id for simplicity)
  const userId = "user@example.com" // TODO: Get actual user ID from session

  try {
    // Check if this is a genuine click (not from bots/prefetchers)
    const isGenuine = isGenuineClick(userAgent, ipAddress)

    // Insert tracking event into Supabase
    const { error: trackingError } = await supabase
      .from('tracking_events')
      .insert({
        tracking_id: trackingId,
        event_type: isGenuine ? 'click' : 'bot_open',
        ip_address: ipAddress,
        user_agent: userAgent,
        country: location.country,
        region: location.region,
        city: location.city,
        device_type: deviceType,
        browser: browser,
        platform: platform,
        url: url,
        is_genuine: isGenuine,
        timestamp: timestamp,
        user_id: userId
      })

    if (trackingError) {
      console.error('Failed to insert tracking event:', trackingError)
    }

    // Find the contact record and update click count
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, batch_id, email, click_count, clicked_at')
      .eq('id', trackingId)
      .eq('user_id', userId)
      .single()

    if (contactError && contactError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Failed to fetch contact:', contactError)
      return NextResponse.redirect(url)
    }

    if (contact) {
      // Only count genuine clicks (not from bots/prefetchers)
      if (isGenuine) {
        const newClickCount = (contact.click_count || 0) + 1

        // Update contact with new click count and timestamp
        const { error: updateError } = await supabase
          .from('contacts')
          .update({
            click_count: newClickCount,
            clicked_at: timestamp,
            updated_at: timestamp
          })
          .eq('id', trackingId)
          .eq('user_id', userId)

        if (updateError) {
          console.error('Failed to update contact click count:', updateError)
        } else {
          console.log(`Genuine email click tracked - ${contact.email} (Count: ${newClickCount})`)

          // Update batch statistics
          await updateBatchClickStats(contact.batch_id, userId)
        }
      } else {
        console.log(`Bot/prefetch click detected - ${contact.email}`)
      }
    } else {
      console.log(`Contact record not found for tracking ID: ${trackingId}`)
    }

    // Always redirect to the original URL
    return NextResponse.redirect(url)
  } catch (error) {
    console.error("Click tracking error:", error)

    // Log error event
    try {
      await supabase
        .from('tracking_events')
        .insert({
          tracking_id: trackingId,
          event_type: 'error',
          ip_address: ipAddress,
          user_agent: userAgent,
          url: url,
          timestamp: timestamp,
          user_id: userId
        })
    } catch (logError) {
      console.error('Failed to log error event:', logError)
    }

    // Always redirect even on error
    return NextResponse.redirect(url)
  }
}
