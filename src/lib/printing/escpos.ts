/**
 * ESC/POS command builder for thermal receipt printers.
 * Generates binary command sequences compatible with 58mm/80mm thermal printers.
 */

const ESC = 0x1b
const GS = 0x1d
const LF = 0x0a

export class ESCPOSBuilder {
  private commands: number[] = []

  /** Initialize printer */
  init(): this {
    this.commands.push(ESC, 0x40) // ESC @
    return this
  }

  /** Add raw text */
  text(content: string): this {
    const encoder = new TextEncoder()
    this.commands.push(...encoder.encode(content))
    return this
  }

  /** Add line feed */
  newline(count = 1): this {
    for (let i = 0; i < count; i++) {
      this.commands.push(LF)
    }
    return this
  }

  /** Set text alignment: left, center, right */
  align(alignment: 'left' | 'center' | 'right'): this {
    const alignMap = { left: 0, center: 1, right: 2 }
    this.commands.push(ESC, 0x61, alignMap[alignment])
    return this
  }

  /** Toggle bold text */
  bold(on: boolean): this {
    this.commands.push(ESC, 0x45, on ? 1 : 0)
    return this
  }

  /** Toggle underline */
  underline(on: boolean): this {
    this.commands.push(ESC, 0x2d, on ? 1 : 0)
    return this
  }

  /** Set font size (1-8 for width and height multipliers) */
  fontSize(width: number, height: number): this {
    const w = Math.min(Math.max(width, 1), 8) - 1
    const h = Math.min(Math.max(height, 1), 8) - 1
    this.commands.push(GS, 0x21, (w << 4) | h)
    return this
  }

  /** Reset font to normal size */
  normalSize(): this {
    this.commands.push(GS, 0x21, 0x00)
    return this
  }

  /** Print horizontal line using dashes */
  separator(char = '-', width = 32): this {
    return this.text(char.repeat(width)).newline()
  }

  /** Print two columns (left-aligned key, right-aligned value) */
  columns(left: string, right: string, width = 32): this {
    const space = width - left.length - right.length
    const padding = space > 0 ? ' '.repeat(space) : ' '
    return this.text(`${left}${padding}${right}`).newline()
  }

  /** Print barcode (CODE39) */
  barcode(data: string): this {
    // Set barcode height (100 dots)
    this.commands.push(GS, 0x68, 100)
    // Set barcode width (3)
    this.commands.push(GS, 0x77, 3)
    // Print HRI below barcode
    this.commands.push(GS, 0x48, 2)
    // Print CODE39 barcode
    this.commands.push(GS, 0x6b, 4)
    const encoder = new TextEncoder()
    this.commands.push(...encoder.encode(data))
    this.commands.push(0x00) // NUL terminator
    return this
  }

  /** Feed paper and cut */
  cut(): this {
    this.newline(4)
    this.commands.push(GS, 0x56, 0x00) // Full cut
    return this
  }

  /** Partial cut (leaves a small connection) */
  partialCut(): this {
    this.newline(4)
    this.commands.push(GS, 0x56, 0x01) // Partial cut
    return this
  }

  /** Open cash drawer */
  openDrawer(): this {
    this.commands.push(ESC, 0x70, 0x00, 0x19, 0xff)
    return this
  }

  /** Build the final Uint8Array of commands */
  build(): Uint8Array {
    return new Uint8Array(this.commands)
  }
}
