# TODO: Fix Email Subject Line Issue

## Current Issue
The email subject line is incorrectly including the full email content instead of just the subject. This happens during email generation where the parsing logic fails to properly separate the subject from the email body.

## Steps to Complete

### 1. Improve Subject Parsing Logic in lib/email.ts
- [x] Review the current parsing patterns for extracting subject options from OpenAI response
- [x] Enhance regex patterns to better match the expected format
- [x] Add fallback logic to ensure subjects are properly extracted
- [x] Add debug logging to track parsing success/failure
- [x] Fix TypeScript errors for type annotations

### 2. Test Email Generation
- [x] Generate a test email to verify the subject line is correctly extracted
- [x] Check that subject is short (max 8 words as per prompt) and doesn't contain email body
- [x] Verify email preview displays correct subject
- [x] Test sender details inclusion in email sign-off (name, designation, phone, company)
- [x] Verify sign-off format: "Warm regards, [Name] [Designation] [Phone] [Company]"

### 3. Validation
- [x] Confirm subject appears correctly in email preview components
- [x] Ensure no regression in email body content
- [x] Test with different contact data to ensure robustness

### 4. Fix Sender Details Integration
- [x] Modify generateEmail function to use custom prompt directly when provided
- [x] Increase max_tokens from 300 to 600 to prevent sign-off truncation
- [x] Ensure sender details from frontend sidebar are properly included in email sign-off

## Files to Edit
- lib/email.ts (primary fix)
- app/api/batch/generate/route.ts (verify usage)

## Expected Outcome
- Subject line should be concise (max 8 words) and relevant
- Email body should be properly separated and contain the full email content
- Email preview should display correct subject without the body content
