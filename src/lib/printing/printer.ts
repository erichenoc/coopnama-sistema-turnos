/**
 * WebUSB interface for thermal receipt printers.
 * Only works in Chrome/Edge (WebUSB API required).
 */

export interface PrinterDevice {
  name: string
  connected: boolean
  device: USBDevice
}

const THERMAL_PRINTER_FILTERS = [
  { vendorId: 0x0416 }, // Winbond (common for POS printers)
  { vendorId: 0x0483 }, // STMicroelectronics
  { vendorId: 0x04b8 }, // Seiko Epson
  { vendorId: 0x0dd4 }, // Custom (Bixolon)
  { vendorId: 0x0fe6 }, // ICS Electronics
  { vendorId: 0x1504 }, // SNBC
  { vendorId: 0x1a86 }, // QinHeng Electronics (CH340)
  { vendorId: 0x0525 }, // Netchip Technology
]

export function isWebUSBSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator
}

export async function requestPrinter(): Promise<USBDevice | null> {
  if (!isWebUSBSupported()) return null

  try {
    const device = await navigator.usb.requestDevice({
      filters: THERMAL_PRINTER_FILTERS,
    })
    return device
  } catch {
    // User cancelled or no device found
    return null
  }
}

export async function connectPrinter(device: USBDevice): Promise<boolean> {
  try {
    await device.open()

    if (device.configuration === null) {
      await device.selectConfiguration(1)
    }

    // Find the first interface with a bulk OUT endpoint
    const iface = device.configuration?.interfaces[0]
    if (!iface) return false

    await device.claimInterface(iface.interfaceNumber)
    return true
  } catch (err) {
    console.error('Failed to connect to printer:', err)
    return false
  }
}

export async function printData(device: USBDevice, data: Uint8Array): Promise<boolean> {
  try {
    const iface = device.configuration?.interfaces[0]
    if (!iface) return false

    // Find bulk OUT endpoint
    const endpoint = iface.alternate.endpoints.find(
      (ep) => ep.direction === 'out' && ep.type === 'bulk'
    )

    if (!endpoint) {
      console.error('No bulk OUT endpoint found')
      return false
    }

    await device.transferOut(endpoint.endpointNumber, data.buffer as ArrayBuffer)
    return true
  } catch (err) {
    console.error('Print failed:', err)
    return false
  }
}

export async function disconnectPrinter(device: USBDevice): Promise<void> {
  try {
    await device.close()
  } catch {
    // Ignore disconnect errors
  }
}
