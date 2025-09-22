"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Eye, Mail, Building, User, Sparkles } from "lucide-react"
import { EmailPreviewModal } from "./email-preview-modal"

interface GeneratedEmail {
  id: string
  contactName: string
  companyName: string
  email: string
  subject: string
  htmlContent: string
  textContent: string
  trackingId: string
  cc?: string[] // Optional CC recipients
}

interface EmailPreviewListProps {
  emails: GeneratedEmail[]
  onSend: () => void
  onEmailEdit: (id: string, content: string, cc?: string[]) => void
  isLoading?: boolean
}

export function EmailPreviewList({ emails, onSend, onEmailEdit, isLoading = false }: EmailPreviewListProps) {
  const [selectedEmail, setSelectedEmail] = useState<GeneratedEmail | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const handlePreview = (email: GeneratedEmail) => {
    setSelectedEmail(email)
    setIsPreviewOpen(true)
  }

  const handleClosePreview = () => {
    setIsPreviewOpen(false)
    setSelectedEmail(null)
  }

  const handleSaveEdit = (id: string, content: string, cc?: string[]) => {
    onEmailEdit(id, content, cc)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Preview</h2>
          <p className="text-muted-foreground">
            Review {emails.length} generated emails before sending
          </p>
        </div>
        <Button onClick={onSend} disabled={isLoading || emails.length === 0}>
          {isLoading ? "Sending..." : `Send ${emails.length} Emails`}
        </Button>
      </div>

      <div className="grid gap-4">
        {emails.map((email, index) => (
          <Card key={email.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge variant="secondary">#{index + 1}</Badge>
                  {email.contactName}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview(email)}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
              </div>
              <CardDescription className="flex flex-wrap items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {email.email}
                </span>
                <span className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {email.companyName}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Tracking: {email.trackingId.slice(0, 8)}...
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground line-clamp-2">
                <strong>Subject:</strong> {email.subject}
              </div>
              <div className="text-sm text-muted-foreground mt-2 line-clamp-3">
                {email.textContent}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedEmail && (
        <EmailPreviewModal
          isOpen={isPreviewOpen}
          onClose={handleClosePreview}
          email={selectedEmail}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  )
}
