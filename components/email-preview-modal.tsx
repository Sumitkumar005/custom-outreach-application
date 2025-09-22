"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/rich-text-editor"
import { Save, Edit, X } from "lucide-react"

interface EmailPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  email: {
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
  onSave: (id: string, content: string, cc?: string[]) => void
}

export function EmailPreviewModal({ isOpen, onClose, email, onSave }: EmailPreviewModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(email.htmlContent)
  const [ccEmails, setCcEmails] = useState<string>(email.cc?.join(', ') || '')

  const handleSave = () => {
    const ccArray = ccEmails.split(',').map(email => email.trim()).filter(email => email.length > 0)
    onSave(email.id, editedContent, ccArray.length > 0 ? ccArray : undefined)
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditedContent(email.htmlContent)
    setCcEmails(email.cc?.join(', ') || '')
    setIsEditing(false)
  }

  const handleClose = () => {
    setIsEditing(false)
    setEditedContent(email.htmlContent)
    setCcEmails(email.cc?.join(', ') || '')
    onClose()
  }

  const handleContentChange = (content: string) => {
    setEditedContent(content)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Email Preview - {email.contactName}</span>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSave}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            To: {email.email} | Company: {email.companyName} | Subject: {email.subject}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cc-input" className="text-sm font-medium">
                  CC Recipients (optional)
                </Label>
                <Input
                  id="cc-input"
                  type="text"
                  placeholder="Enter email addresses separated by commas"
                  value={ccEmails}
                  onChange={(e) => setCcEmails(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple email addresses with commas (e.g., email1@example.com, email2@example.com)
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email Content</label>
                <RichTextEditor
                  value={editedContent}
                  onChange={handleContentChange}
                  placeholder="Edit your email content..."
                  className="min-h-[300px]"
                />
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-6 bg-muted/50">
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: email.htmlContent }} />
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p>Tracking ID: {email.trackingId}</p>
            <p>Note: Tracking pixel and links will be automatically added when sending</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
