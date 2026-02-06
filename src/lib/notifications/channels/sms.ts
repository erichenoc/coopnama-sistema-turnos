const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || ''
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || ''
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || ''

interface SMSPayload {
  to: string
  body: string
}

interface SMSResult {
  success: boolean
  externalId?: string
  error?: string
}

export function isSMSEnabled(): boolean {
  return Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER)
}

/**
 * Send SMS via Twilio REST API.
 * Uses fetch instead of the Twilio SDK to keep bundle size small.
 */
export async function sendSMS(payload: SMSPayload): Promise<SMSResult> {
  if (!isSMSEnabled()) {
    return { success: false, error: 'Twilio not configured' }
  }

  // Normalize Dominican Republic phone numbers
  const to = normalizePhoneNumber(payload.to)

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`

  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: TWILIO_PHONE_NUMBER,
        Body: payload.body,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `Twilio error: ${response.status}`,
      }
    }

    return {
      success: true,
      externalId: data.sid,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'SMS send failed',
    }
  }
}

/**
 * Normalize a Dominican Republic phone number to E.164 format.
 * Handles common formats: 809-555-1234, (809) 555-1234, 8095551234
 */
function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  // Already has country code
  if (digits.startsWith('1') && digits.length === 11) {
    return `+${digits}`
  }

  // DR number without country code (10 digits: 809/829/849 + 7 digits)
  if (digits.length === 10 && /^(809|829|849)/.test(digits)) {
    return `+1${digits}`
  }

  // Already in full format
  if (digits.startsWith('1809') || digits.startsWith('1829') || digits.startsWith('1849')) {
    return `+${digits}`
  }

  // Return as-is with + prefix if nothing matches
  return phone.startsWith('+') ? phone : `+${digits}`
}
