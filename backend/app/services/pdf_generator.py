"""Dynamic PDF generation service for Shailja Yoga Teacher Training Certificates."""
import os
from pathlib import Path
from typing import Dict, Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing

from app.models.enums import CategoryEnum

CATEGORY_DISPLAY_NAMES = {
    CategoryEnum.ASANA_PRACTICE.value: "Asana Practice & Techniques",
    CategoryEnum.ANATOMY.value: "Anatomy & Physiology",
    CategoryEnum.YOGA_PHILOSOPHY.value: "Yoga Philosophy, Lifestyle & Ethics",
    CategoryEnum.PRACTICAL_TEACHING.value: "Practical Teaching & Methodology",
}


def generate_certificate_pdf(
    output_path: str,
    certificate_id: str,
    student_name: str,
    program_name: str,
    completion_date_str: str,
    issue_date_str: str,
    total_approved_hours: float,
    category_hours: Dict[str, float],
    verification_url: str,
    signature_digest: str,
) -> str:
    """Generate a high-resolution, tamper-evident graduation certificate PDF.
    
    Includes canonical graduate information, verified category hours breakdown,
    authorized signatory details, and a verification QR code pointing to the public verifier.
    """
    out_dir = Path(output_path).parent
    out_dir.mkdir(parents=True, exist_ok=True)

    # Standard landscape letter (792 x 612 pt)
    w, h = landscape(letter)
    c = canvas.Canvas(output_path, pagesize=landscape(letter))
    c.setTitle(f"Shailja Yoga Certificate - {certificate_id}")
    c.setAuthor("Shailja Yoga Teacher Training Academy")
    c.setSubject("200-Hour Yoga Teacher Training Certification")

    # 1. Background Fill
    c.setFillColor(colors.HexColor("#FDFCFA"))  # Subtle warm ivory
    c.rect(0, 0, w, h, stroke=0, fill=1)

    # 2. Outer Border (Deep Navy #1B365D)
    c.setStrokeColor(colors.HexColor("#1B365D"))
    c.setLineWidth(3.5)
    c.rect(24, 24, w - 48, h - 48, stroke=1, fill=0)

    # 3. Inner Decorative Border (Rich Gold #B8860B)
    c.setStrokeColor(colors.HexColor("#B8860B"))
    c.setLineWidth(1.2)
    c.rect(30, 30, w - 60, h - 60, stroke=1, fill=0)

    # 4. Corner Ornaments (Accent squares in 4 corners)
    corner_size = 12
    c.setFillColor(colors.HexColor("#B8860B"))
    c.rect(32, 32, corner_size, corner_size, stroke=0, fill=1)
    c.rect(w - 32 - corner_size, 32, corner_size, corner_size, stroke=0, fill=1)
    c.rect(32, h - 32 - corner_size, corner_size, corner_size, stroke=0, fill=1)
    c.rect(w - 32 - corner_size, h - 32 - corner_size, corner_size, corner_size, stroke=0, fill=1)

    # 5. Academy Header
    c.setFillColor(colors.HexColor("#1B365D"))
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(w / 2, h - 70, "SHAILJA YOGA ACADEMY")

    c.setFillColor(colors.HexColor("#996515"))
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(w / 2, h - 84, "INTERNATIONAL YOGA TEACHER TRAINING & CERTIFICATION")

    # Decorative horizontal divider
    c.setStrokeColor(colors.HexColor("#C59B27"))
    c.setLineWidth(0.8)
    c.line(w / 2 - 160, h - 92, w / 2 + 160, h - 92)

    # 6. Certificate Title
    c.setFillColor(colors.HexColor("#1B365D"))
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(w / 2, h - 126, "CERTIFICATE OF COMPLETION")

    c.setFillColor(colors.HexColor("#475569"))
    c.setFont("Helvetica-Oblique", 12)
    c.drawCentredString(w / 2, h - 144, "200-Hour Yoga Teacher Training (TTC)")

    # 7. Presentation Line
    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Helvetica", 11)
    c.drawCentredString(w / 2, h - 172, "This is to officially certify that")

    # 8. Graduate Name
    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(w / 2, h - 204, student_name.upper())

    # Underline under student name
    name_width = c.stringWidth(student_name.upper(), "Helvetica-Bold", 22)
    c.setStrokeColor(colors.HexColor("#CBD5E1"))
    c.setLineWidth(1)
    c.line(w / 2 - (name_width / 2) - 20, h - 212, w / 2 + (name_width / 2) + 20, h - 212)

    # 9. Conferred Program & Fulfillment Statement
    c.setFillColor(colors.HexColor("#334155"))
    c.setFont("Helvetica", 10.5)
    c.drawCentredString(
        w / 2,
        h - 234,
        f"has successfully completed the comprehensive {program_name} curriculum,",
    )
    c.drawCentredString(
        w / 2,
        h - 249,
        "meeting all academic, ethical, anatomical, and pedagogical requirements under faculty supervision.",
    )

    # 10. Category Hours Breakdown Box
    box_w = 460
    box_h = 58
    box_x = (w - box_w) / 2
    box_y = h - 318

    # Light container background
    c.setFillColor(colors.HexColor("#F8FAFC"))
    c.roundRect(box_x, box_y, box_w, box_h, 4, stroke=0, fill=1)
    c.setStrokeColor(colors.HexColor("#E2E8F0"))
    c.setLineWidth(0.8)
    c.roundRect(box_x, box_y, box_w, box_h, 4, stroke=1, fill=0)

    # Box title
    c.setFillColor(colors.HexColor("#1E293B"))
    c.setFont("Helvetica-Bold", 9)
    c.drawString(box_x + 14, box_y + box_h - 16, f"VERIFIED HOURS: {total_approved_hours:.1f} Total Faculty-Approved Hours")

    # Category columns
    col_w = box_w / 4
    cat_keys = [
        CategoryEnum.ASANA_PRACTICE.value,
        CategoryEnum.ANATOMY.value,
        CategoryEnum.YOGA_PHILOSOPHY.value,
        CategoryEnum.PRACTICAL_TEACHING.value,
    ]
    labels = ["Asana Practice", "Anatomy & Phys.", "Philosophy/Ethics", "Practical Teaching"]

    c.setFont("Helvetica", 8)
    for idx, (cat_k, lbl) in enumerate(zip(cat_keys, labels)):
        hrs = category_hours.get(cat_k, 0.0)
        cx = box_x + (idx * col_w) + 14
        c.setFillColor(colors.HexColor("#64748B"))
        c.drawString(cx, box_y + 24, lbl)
        c.setFillColor(colors.HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(cx, box_y + 11, f"{hrs:.1f} hrs")
        c.setFont("Helvetica", 8)

    # 11. Bottom Left: Verification & QR Code
    qr_size = 64
    qr_x = 52
    qr_y = 52

    qr = QrCodeWidget(verification_url)
    bounds = qr.getBounds()
    qr_w = bounds[2] - bounds[0]
    qr_h = bounds[3] - bounds[1]
    d = Drawing(qr_size, qr_size, transform=[qr_size / qr_w, 0, 0, qr_size / qr_h, 0, 0])
    d.add(qr)
    d.drawOn(c, qr_x, qr_y)

    # Verification Metadata beside QR Code
    meta_x = qr_x + qr_size + 14
    c.setFillColor(colors.HexColor("#334155"))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(meta_x, qr_y + 54, f"Certificate ID: {certificate_id}")

    c.setFont("Helvetica", 7.5)
    c.setFillColor(colors.HexColor("#64748B"))
    c.drawString(meta_x, qr_y + 42, f"Completion Date: {completion_date_str}   |   Issued: {issue_date_str}")
    c.drawString(meta_x, qr_y + 30, f"Digest: {signature_digest[:32]}...")
    c.setFillColor(colors.HexColor("#0369A1"))
    c.drawString(meta_x, qr_y + 18, f"Public Verifier: {verification_url}")
    c.setFillColor(colors.HexColor("#94A3B8"))
    c.drawString(meta_x, qr_y + 6, "Tamper-evident HMAC-SHA256 authenticated verification token.")

    # 12. Bottom Right: Authorized Signatory Block
    sig_x = w - 240
    sig_y = 52

    # Elegant decorative signature cursive line
    c.setStrokeColor(colors.HexColor("#94A3B8"))
    c.setLineWidth(1)
    c.line(sig_x, sig_y + 38, sig_x + 180, sig_y + 38)

    # Cursive signature simulation (authentic label)
    c.setFillColor(colors.HexColor("#1E3A8A"))
    c.setFont("Times-BoldItalic", 14)
    c.drawString(sig_x + 16, sig_y + 44, "Shailja Sharma")

    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 9)
    c.drawString(sig_x, sig_y + 24, "Shailja Sharma, E-RYT 500")

    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Helvetica", 7.5)
    c.drawString(sig_x, sig_y + 12, "Lead Faculty Director & Founder")
    c.drawString(sig_x, sig_y + 1, "Shailja Yoga Teacher Training Academy")

    # Finalize Page
    c.showPage()
    c.save()

    return output_path
