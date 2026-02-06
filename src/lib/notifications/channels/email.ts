'use server'

/**
 * Email notification channel via Resend API
 * Uses simple fetch - no SDK needed
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const FROM_EMAIL = process.env.FROM_EMAIL || 'COOPNAMA Turnos <turnos@coopnama.com>'

interface SendEmailInput {
  to: string
  subject: string
  body: string // HTML body
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('Email: RESEND_API_KEY not configured')
    return false
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [input.to],
        subject: input.subject,
        html: input.body,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Email send failed:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Email send error:', err)
    return false
  }
}

function buildTicketEmailHtml(
  type: 'created' | 'called' | 'completed',
  ticketNumber: string,
  serviceName?: string,
  stationName?: string
): { subject: string; html: string } {
  const baseStyle = `
    font-family: Arial, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f9fafb;
  `
  const headerStyle = `
    background-color: #1e40af;
    color: white;
    padding: 30px 20px;
    text-align: center;
    border-radius: 8px 8px 0 0;
  `
  const contentStyle = `
    background-color: white;
    padding: 30px 20px;
    border-radius: 0 0 8px 8px;
  `
  const ticketNumberStyle = `
    font-size: 36px;
    font-weight: bold;
    color: #1e40af;
    margin: 20px 0;
    text-align: center;
  `
  const buttonStyle = `
    display: inline-block;
    background-color: #1e40af;
    color: white;
    padding: 12px 24px;
    text-decoration: none;
    border-radius: 6px;
    margin-top: 20px;
  `

  let subject: string
  let title: string
  let message: string
  let callToAction: string = ''

  switch (type) {
    case 'created':
      subject = `Turno ${ticketNumber} - Creado`
      title = '✅ Turno Creado'
      message = `Su turno ha sido creado exitosamente${serviceName ? ` para el servicio de <strong>${serviceName}</strong>` : ''}.`
      callToAction = 'Le notificaremos por este medio cuando sea su turno. Por favor manténgase atento a su correo.'
      break

    case 'called':
      subject = `Turno ${ticketNumber} - ¡Es Su Turno!`
      title = '🔔 ¡Es Su Turno!'
      message = `Su turno ha sido llamado. Por favor diríjase ${stationName ? `a <strong>${stationName}</strong>` : 'a la ventanilla indicada'}.`
      callToAction = 'Le estamos esperando. Presente su número de turno al llegar.'
      break

    case 'completed':
      subject = `Turno ${ticketNumber} - Servicio Completado`
      title = '✨ Servicio Completado'
      message = `Su servicio ha sido completado exitosamente. Gracias por utilizar nuestro sistema de turnos.`
      callToAction = 'Esperamos haberle brindado un excelente servicio. ¡Hasta pronto!'
      break
  }

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="${baseStyle}">
      <div style="max-width: 600px; margin: 0 auto;">
        <!-- Header -->
        <div style="${headerStyle}">
          <h1 style="margin: 0; font-size: 28px;">COOPNAMA Turnos</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">${title}</p>
        </div>

        <!-- Content -->
        <div style="${contentStyle}">
          <!-- Ticket Number -->
          <div style="${ticketNumberStyle}">
            ${ticketNumber}
          </div>

          <!-- Message -->
          <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 20px 0;">
            ${message}
          </p>

          <!-- Call to Action -->
          ${callToAction ? `
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; border-left: 4px solid #1e40af; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #1e40af;">
                ${callToAction}
              </p>
            </div>
          ` : ''}

          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="font-size: 12px; color: #6b7280; margin: 5px 0;">
              Este es un mensaje automático del Sistema de Turnos COOPNAMA
            </p>
            <p style="font-size: 12px; color: #6b7280; margin: 5px 0;">
              Por favor no responder a este correo
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  return { subject, html }
}
