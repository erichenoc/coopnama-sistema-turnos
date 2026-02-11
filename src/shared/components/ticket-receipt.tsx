'use client'

import { useRef, useCallback } from 'react'

interface TicketReceiptProps {
  ticketNumber: string
  serviceName: string
  customerName?: string | null
  createdAt: string
  estimatedMinutes?: number
  branchName?: string
  onPrintComplete?: () => void
}

/**
 * Thermal printer receipt component.
 * Renders a receipt optimized for 80mm thermal paper and triggers print.
 * Works with any printer configured as default in the OS (USB, network, serial).
 */
export function TicketReceipt({
  ticketNumber,
  serviceName,
  customerName,
  createdAt,
  estimatedMinutes,
  branchName,
  onPrintComplete,
}: TicketReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  const handlePrint = useCallback(() => {
    if (!receiptRef.current) return

    const printWindow = window.open('', '_blank', 'width=302,height=500')
    if (!printWindow) {
      // Fallback: use window.print() on current page
      window.print()
      onPrintComplete?.()
      return
    }

    const dateStr = new Date(createdAt).toLocaleString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Ticket ${ticketNumber}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Courier New', monospace;
            width: 80mm;
            padding: 4mm;
            color: #000;
            font-size: 12px;
            line-height: 1.4;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .large { font-size: 16px; }
          .xlarge { font-size: 36px; font-weight: bold; letter-spacing: 2px; }
          .separator {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          .small { font-size: 10px; color: #555; }
          .row {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
          }
          .mt { margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="bold large">COOPNAMA</div>
          <div class="small">Cooperativa Nacional de Maestros</div>
          ${branchName ? `<div class="small">${branchName}</div>` : ''}
        </div>

        <div class="separator"></div>

        <div class="center mt">
          <div class="small">SU TURNO</div>
          <div class="xlarge">${ticketNumber}</div>
        </div>

        <div class="separator"></div>

        <div class="row">
          <span>Servicio:</span>
          <span class="bold">${serviceName}</span>
        </div>
        ${customerName ? `
        <div class="row">
          <span>Cliente:</span>
          <span>${customerName}</span>
        </div>
        ` : ''}
        <div class="row">
          <span>Fecha:</span>
          <span>${dateStr}</span>
        </div>
        ${estimatedMinutes ? `
        <div class="row">
          <span>Est. espera:</span>
          <span>~${estimatedMinutes} min</span>
        </div>
        ` : ''}

        <div class="separator"></div>

        <div class="center mt">
          <div class="small">Consulte su turno en:</div>
          <div class="bold">/mi-turno</div>
        </div>

        <div class="separator"></div>

        <div class="center small mt">
          Gracias por su visita
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
            setTimeout(function() { window.close(); }, 3000);
          };
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
    onPrintComplete?.()
  }, [ticketNumber, serviceName, customerName, createdAt, estimatedMinutes, branchName, onPrintComplete])

  return (
    <div ref={receiptRef}>
      <button
        onClick={handlePrint}
        className="flex items-center justify-center gap-2 w-full py-4 text-lg font-semibold bg-white/[0.06] border border-white/[0.08] rounded-neu text-gray-200 hover:bg-white/[0.10] active:scale-[0.98] transition-all"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Imprimir Ticket
      </button>
    </div>
  )
}
