import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getSettings } from "@/lib/settings"
import { getBatch } from "@/lib/batch"
import { generateEmail } from "@/lib/email"
import { v4 as uuidv4 } from "uuid"

interface GeneratedEmail {
  id: string
  contactName: string
  university: string
  email: string
  subject: string
  htmlContent: string
  textContent: string
  trackingId: string
}

export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await getSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { batchId, customPrompt, globalCC, senderName, senderDesignation, senderPhone, senderCompany } = await request.json()

    if (!batchId) {
      return NextResponse.json({ error: "Batch ID is required" }, { status: 400 })
    }

    // Get batch data
    const batch = await getBatch(batchId)
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    }

    // Get settings
    const settings = await getSettings()
    if (!settings) {
      return NextResponse.json({ error: "Settings not configured" }, { status: 400 })
    }

    // Use sender info from request (frontend) or fallback to settings
    const finalSenderName = senderName || settings.senderName || "Team Member"
    const finalSenderDesignation = senderDesignation || settings.senderDesignation || "Representative"
    const finalSenderPhone = senderPhone || settings.senderPhone || "N/A"
    const finalSenderCompany = senderCompany || settings.senderCompany || "ForeignAdmits | VisaMonk.ai"

    const generatedEmails: GeneratedEmail[] = []
    const errors: string[] = []

    // Generate emails for all contacts with valid email addresses
    for (const contact of batch.contacts) {
      // Skip contacts without email addresses
      if (!contact.mail) {
        console.log(`Skipping contact ${contact.name} - no email address provided`)
        continue
      }

      try {
        // Map Contact to ContactData for email generation
        const contactData = {
          recipient_person_name: contact.name,
          recipient_university_name: contact.university || "your institution",
          product_name: "VisaMonk.ai",
          cta_goal: "schedule a demo call",
          product_oneliner: "AI copilot that improves visa-interview readiness and counselor throughput",
          product_core_users: "Study-abroad counselors & agency teams",
          product_features_bulleted: "- Adaptive mock interviews with scoring across Preparedness, Financials, Intent & Credibility\n- Country-specific rubrics & feedback\n- Team dashboard: bottleneck analytics, counselor QA\n- White-label & partner IDs",
          product_outcomes_metrics: "- 30-45 min saved per student assessment\n- 20-30% improvement in 'ready for interview' status rates (pilot cohorts)\n- Cut no-show rates by 12-18% with automated prep nudges",
          product_caselets: "- South India agency (40 counselors): standardized QA, throughput +22%\n- Bangladesh partner: faster triage, 17% drop in weak-fit submissions",
          recipient_public_notes: "",
          recipient_business_map: "education; research; international student services",
          recipient_icp_geos: "international students from Asia, Africa",
          recipient_offers: "scholarships, visa support",
          relevant_trigger: "New US visa policy changes, 2025",
          recipient_pain: "Manual visa interview prep taking too much time",
          lead_source: "Cold outbound via LinkedIn",
          prospect_persona: contact.designation || "International Student Services"
        }

        let effectiveCustomPrompt = ""

        if (customPrompt && customPrompt.trim()) {
          // User provided custom prompt - enhance it with sender info and recipient details
          effectiveCustomPrompt = `${customPrompt.trim()}

RECIPIENT DETAILS (use these in the email):
- Recipient Name: ${contact.name}
- University/Institution: ${contact.university || "their institution"}
- Designation: ${contact.designation || "their role"}

SENDER DETAILS (use these for email signature):
- Sender Name: ${finalSenderName}
- Designation: ${finalSenderDesignation}
- Phone: ${finalSenderPhone}
- Company: ${finalSenderCompany}

IMPORTANT REQUIREMENTS:
1. Address the email to "${contact.name}" specifically (not [Recipient's Name] or placeholder)
2. Mention "${contact.university || 'their institution'}" specifically in the email
3. End with complete signature: "Warm regards,\n${finalSenderName}\n${finalSenderDesignation}\n${finalSenderPhone}\n${finalSenderCompany}"
4. Keep the email professional and personalized
5. Include a clear call-to-action

EXACT OUTPUT FORMAT REQUIRED:
**SUBJECT LINE:**
Option 1: [specific subject line - max 8 words]
Option 2: [specific subject line - max 8 words]  
Option 3: [specific subject line - max 8 words]

**EMAIL BODY:**
[Complete email starting with "Dear ${contact.name}," or "Hi ${contact.name}," and ending with the complete signature format shown above]`

        } else {
          // Use default system prompt with sender info
          effectiveCustomPrompt = `Write a professional cold email pitching VisaMonk.ai (ForeignAdmits product) to ${contact.name} at ${contact.university || "their institution"}.

RECIPIENT DETAILS:
- Name: ${contact.name}
- Institution: ${contact.university || "their institution"}
- Role: ${contact.designation || "International Student Services"}

SENDER DETAILS:
- Name: ${finalSenderName}
- Designation: ${finalSenderDesignation}
- Phone: ${finalSenderPhone}  
- Company: ${finalSenderCompany}

PRODUCT DETAILS:
- Product: VisaMonk.ai (AI copilot for visa interview preparation)
- Benefits: Saves 30-45 min per student assessment, improves readiness rates by 20-30%
- Target: Study-abroad counselors and international education teams

REQUIREMENTS:
- Address email specifically to "${contact.name}" (not placeholder)
- Mention "${contact.university || 'their institution'}" by name
- Professional yet personalized tone
- Include key product benefits and metrics
- Clear call-to-action for demo/meeting
- Complete signature with all sender details

EXACT OUTPUT FORMAT:
**SUBJECT LINE:**
Option 1: [subject line - max 8 words]
Option 2: [subject line - max 8 words]
Option 3: [subject line - max 8 words]

**EMAIL BODY:**
Dear ${contact.name},

[Email content mentioning ${contact.university || 'their institution'} specifically and VisaMonk.ai benefits]

[Clear call-to-action]

Warm regards,
${finalSenderName}
${finalSenderDesignation}
${finalSenderPhone}
${finalSenderCompany}`
        }

        // Generate personalized email
        const emailContent = await generateEmail(contactData, settings.openaiApiKey, effectiveCustomPrompt)

        if (!emailContent) {
          errors.push(`Failed to generate email for ${contact.name}`)
          continue
        }

        // Create tracking ID
        const trackingId = uuidv4()

        // Ensure the email content has proper recipient name and complete signature
        let finalHtmlContent = emailContent.emailVersionA

        // Fix recipient name if it's still using placeholder
        finalHtmlContent = finalHtmlContent.replace(/\[Recipient's Name\]/g, contact.name)
        finalHtmlContent = finalHtmlContent.replace(/Hi there/g, `Hi ${contact.name}`)
        finalHtmlContent = finalHtmlContent.replace(/Dear Sir\/Madam/g, `Dear ${contact.name}`)

        // Ensure complete signature if it's truncated
        if (!finalHtmlContent.includes(finalSenderCompany) || finalHtmlContent.match(/Warm\s*$/)) {
          // Add complete signature if missing or truncated
          const signatureRegex = /(Warm regards?[,\s]*|Best regards?[,\s]*|Thanks?[,\s]*|Sincerely[,\s]*)(\w+\s*)?$/i
          if (signatureRegex.test(finalHtmlContent)) {
            finalHtmlContent = finalHtmlContent.replace(signatureRegex, `Warm regards,\n${finalSenderName}\n${finalSenderDesignation}\n${finalSenderPhone}\n${finalSenderCompany}`)
          } else {
            // Append signature if no closing found
            finalHtmlContent += `\n\nWarm regards,\n${finalSenderName}\n${finalSenderDesignation}\n${finalSenderPhone}\n${finalSenderCompany}`
          }
        }

        // Convert to proper HTML format
        finalHtmlContent = finalHtmlContent.replace(/\n/g, '<br>')

        const generatedEmail: GeneratedEmail = {
          id: uuidv4(),
          contactName: contact.name,
          university: contact.university || "Institution",
          email: contact.mail,
          subject: emailContent.subjectOptions.length > 0 
            ? emailContent.subjectOptions[0] 
            : `Partnership opportunity with ${contact.university || 'your institution'}`,
          htmlContent: finalHtmlContent,
          textContent: finalHtmlContent.replace(/<br>/g, '\n').replace(/<[^>]*>/g, ""), // Convert back to text
          trackingId
        }

        generatedEmails.push(generatedEmail)
      } catch (error) {
        console.error(`Error generating email for ${contact.name}:`, error)
        errors.push(`Error generating email for ${contact.name}: ${(error as Error).message}`)
      }
    }

    return NextResponse.json({
      success: true,
      generatedEmails,
      total: batch.contacts.filter(c => c.mail).length, // Only count contacts with emails
      generated: generatedEmails.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully generated ${generatedEmails.length} emails from ${batch.contacts.filter(c => c.mail).length} valid contacts`,
    })
  } catch (error) {
    console.error("Email generation error:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}