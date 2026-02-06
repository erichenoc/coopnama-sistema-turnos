'use client'

import { useState, useCallback, useRef } from 'react'
import {
  isWebUSBSupported,
  requestPrinter,
  connectPrinter,
  printData,
  disconnectPrinter,
} from '@/lib/printing/printer'
import { buildTicketReceipt } from '@/lib/printing/templates/ticket'

interface ThermalPrinterState {
  supported: boolean
  connected: boolean
  printerName: string | null
  connecting: boolean
  printing: boolean
  error: string | null
}

interface UseThermalPrinterReturn extends ThermalPrinterState {
  connect: () => Promise<boolean>
  disconnect: () => Promise<void>
  printTicket: (data: {
    ticketNumber: string
    serviceName: string
    customerName?: string | null
    createdAt: string
    estimatedMinutes?: number
    branchName?: string
  }) => Promise<boolean>
}

export function useThermalPrinter(): UseThermalPrinterReturn {
  const [state, setState] = useState<ThermalPrinterState>({
    supported: typeof window !== 'undefined' && isWebUSBSupported(),
    connected: false,
    printerName: null,
    connecting: false,
    printing: false,
    error: null,
  })
  const deviceRef = useRef<USBDevice | null>(null)

  const connect = useCallback(async (): Promise<boolean> => {
    setState(s => ({ ...s, connecting: true, error: null }))

    const device = await requestPrinter()
    if (!device) {
      setState(s => ({ ...s, connecting: false, error: 'No se selecciono impresora' }))
      return false
    }

    const success = await connectPrinter(device)
    if (!success) {
      setState(s => ({ ...s, connecting: false, error: 'Error al conectar impresora' }))
      return false
    }

    deviceRef.current = device
    setState(s => ({
      ...s,
      connecting: false,
      connected: true,
      printerName: device.productName || 'Impresora Termica',
    }))
    return true
  }, [])

  const disconnect = useCallback(async () => {
    if (deviceRef.current) {
      await disconnectPrinter(deviceRef.current)
      deviceRef.current = null
    }
    setState(s => ({
      ...s,
      connected: false,
      printerName: null,
    }))
  }, [])

  const printTicket = useCallback(async (data: {
    ticketNumber: string
    serviceName: string
    customerName?: string | null
    createdAt: string
    estimatedMinutes?: number
    branchName?: string
  }): Promise<boolean> => {
    if (!deviceRef.current) {
      // Fallback to browser print
      window.print()
      return true
    }

    setState(s => ({ ...s, printing: true, error: null }))

    try {
      const receipt = buildTicketReceipt(data)
      const success = await printData(deviceRef.current, receipt)

      setState(s => ({ ...s, printing: false }))
      return success
    } catch {
      setState(s => ({ ...s, printing: false, error: 'Error al imprimir' }))
      return false
    }
  }, [])

  return { ...state, connect, disconnect, printTicket }
}
