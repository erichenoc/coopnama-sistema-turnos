import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export class ReportBuilder {
  private doc: jsPDF
  private yPos: number = 20

  constructor() {
    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  }

  addHeader(title: string, subtitle?: string): this {
    this.doc.setFontSize(20)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(title, 14, this.yPos)
    this.yPos += 8

    if (subtitle) {
      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(100)
      this.doc.text(subtitle, 14, this.yPos)
      this.doc.setTextColor(0)
      this.yPos += 6
    }

    // Separator line
    this.doc.setDrawColor(200)
    this.doc.line(14, this.yPos, 196, this.yPos)
    this.yPos += 8
    return this
  }

  addSection(title: string): this {
    if (this.yPos > 260) {
      this.doc.addPage()
      this.yPos = 20
    }
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(title, 14, this.yPos)
    this.yPos += 8
    return this
  }

  addMetric(label: string, value: string | number, unit?: string): this {
    if (this.yPos > 270) {
      this.doc.addPage()
      this.yPos = 20
    }
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(100)
    this.doc.text(label, 14, this.yPos)
    this.doc.setTextColor(0)
    this.doc.setFont('helvetica', 'bold')
    const valueText = unit ? `${value} ${unit}` : `${value}`
    this.doc.text(valueText, 80, this.yPos)
    this.yPos += 6
    return this
  }

  addTable(headers: string[], rows: (string | number)[][]): this {
    if (this.yPos > 240) {
      this.doc.addPage()
      this.yPos = 20
    }

    autoTable(this.doc, {
      startY: this.yPos,
      head: [headers],
      body: rows.map(r => r.map(String)),
      theme: 'striped',
      headStyles: { fillColor: [30, 64, 175], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    })

    // Update yPos after table
    this.yPos = (this.doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? this.yPos
    this.yPos += 10
    return this
  }

  addSpace(mm: number = 6): this {
    this.yPos += mm
    return this
  }

  download(filename: string): void {
    this.doc.save(filename)
  }
}
