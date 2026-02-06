import { ESCPOSBuilder } from '../escpos'

interface TicketPrintData {
  ticketNumber: string
  serviceName: string
  customerName?: string | null
  createdAt: string
  estimatedMinutes?: number
  branchName?: string
}

/**
 * Build ESC/POS commands for a queue ticket receipt.
 * Designed for 58mm (32 char) or 80mm (48 char) thermal printers.
 */
export function buildTicketReceipt(data: TicketPrintData, paperWidth: 32 | 48 = 32): Uint8Array {
  const builder = new ESCPOSBuilder()
  const date = new Date(data.createdAt)

  builder
    .init()
    .align('center')

    // Header
    .bold(true)
    .fontSize(2, 2)
    .text('COOPNAMA')
    .newline()
    .normalSize()
    .bold(false)
    .text('Sistema de Turnos')
    .newline()
    .separator('=', paperWidth)

    // Ticket number (large)
    .bold(true)
    .fontSize(3, 3)
    .text(data.ticketNumber)
    .newline()
    .normalSize()
    .bold(false)
    .newline()

    // Service
    .bold(true)
    .text(data.serviceName)
    .newline()
    .bold(false)

  // Customer name
  if (data.customerName) {
    builder.text(data.customerName).newline()
  }

  builder.separator('-', paperWidth)

  // Details
  builder.align('left')
  builder.columns(
    'Fecha:',
    date.toLocaleDateString('es-DO'),
    paperWidth
  )
  builder.columns(
    'Hora:',
    date.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
    paperWidth
  )

  if (data.estimatedMinutes) {
    builder.columns(
      'Espera est.:',
      `~${data.estimatedMinutes} min`,
      paperWidth
    )
  }

  if (data.branchName) {
    builder.columns('Sucursal:', data.branchName, paperWidth)
  }

  builder
    .separator('-', paperWidth)
    .align('center')

    // Barcode with ticket number
    .barcode(data.ticketNumber.replace(/[^A-Z0-9]/g, ''))
    .newline()

    // Footer
    .text('Consulte su turno en:')
    .newline()
    .bold(true)
    .text('/mi-turno')
    .newline()
    .bold(false)
    .newline()
    .text('Gracias por su visita')
    .newline()

    // Cut
    .partialCut()

  return builder.build()
}
