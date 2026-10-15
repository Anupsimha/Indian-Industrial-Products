"""
invoice_service.py
------------------
Professional Tax Invoice generation service for Indian Industrial Products (IIP).
Generates compliant GST Tax Invoices in PDF format matching the official specification:
- Supplier Details (Name, GSTIN, Address)
- Customer / Buyer Details (Name, Company, GSTIN, Address)
- Invoice Number, Date, Place of Supply
- Itemized Table (Description, HSN/SAC, Amount, GST Rate, GST Amount, Total)
- Disclaimer & Verification Footer
"""

import os
import io
from datetime import datetime
from typing import Dict, Any, Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether, Image
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

# Default Platform Tax / Supplier Details (from environment with fallbacks)
PLATFORM_NAME = os.environ.get("PLATFORM_BUSINESS_NAME", "Indian Industrial Platform").strip()
PLATFORM_GSTIN = os.environ.get("PLATFORM_GSTIN", "29AABCU9603R1ZM").strip()
PLATFORM_ADDRESS = os.environ.get(
    "PLATFORM_REGISTERED_ADDRESS",
    "No. 35 Suvarna Nagar Doddabidrekallu Nagasandra, Bengaluru, Karnataka - 560073"
).strip()
PLATFORM_EMAIL = os.environ.get("REACT_APP_SUPPORT_EMAIL", "support@indianindustrialplatform.com").strip()
PLATFORM_PHONE = os.environ.get("REACT_APP_SUPPORT_PHONE", "+91 9380036328").strip()

# Platform Logo Asset
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO_PATH = os.path.join(BASE_DIR, "assets", "logo.png")
if not os.path.exists(LOGO_PATH):
    # Fallback to frontend public logo if running locally without separate backend assets
    alt_logo = os.path.join(os.path.dirname(BASE_DIR), "frontend", "public", "logo-gear.png")
    if os.path.exists(alt_logo):
        LOGO_PATH = alt_logo


def generate_invoice_number(sequence_id: int | str, created_at: Optional[datetime] = None) -> str:
    """Format standard tax invoice number: INV-YYYY-XXXXX"""
    dt = created_at or datetime.now()
    year = dt.year
    if isinstance(sequence_id, int):
        seq_str = f"{sequence_id:04d}"
    else:
        # Take numeric or clean suffix
        clean = "".join(filter(str.isdigit, str(sequence_id)))[-4:] or "0001"
        seq_str = clean.zfill(4)
    return f"INV-{year}-{seq_str}"


def generate_membership_invoice_pdf(invoice_data: Dict[str, Any]) -> bytes:
    """
    Builds a professional, clean A4 Tax Invoice PDF using ReportLab.
    
    invoice_data keys expected:
    - invoice_number: str (e.g. 'INV-2026-0001')
    - invoice_date: str (e.g. '15 October 2026')
    - supplier_name: str
    - supplier_gstin: str
    - supplier_address: str
    - customer_name: str
    - customer_company: str
    - customer_gstin: str (optional)
    - customer_address: str (optional)
    - plan_name: str (e.g. 'Premium Plan (Annual)')
    - description: str (e.g. 'Annual membership plan subscription')
    - base_amount: float (e.g. 1000.0)
    - gst_rate: float (default 18.0)
    - gst_amount: float (e.g. 180.0)
    - total_amount: float (e.g. 1180.0)
    - payment_id: str (Razorpay payment reference)
    - payment_method: str ('Razorpay / Online')
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom Typography Styles
    title_style = ParagraphStyle(
        "InvoiceTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a")
    )
    subtitle_style = ParagraphStyle(
        "InvoiceSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#475569")
    )
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=4
    )
    body_style = ParagraphStyle(
        "InvoiceBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155")
    )
    body_bold = ParagraphStyle(
        "InvoiceBodyBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#0f172a")
    )
    table_header = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0f172a")
    )
    table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155")
    )
    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#0f172a")
    )
    table_cell_right = ParagraphStyle(
        "TableCellRight",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        alignment=2,
        textColor=colors.HexColor("#334155")
    )
    table_cell_right_bold = ParagraphStyle(
        "TableCellRightBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=13,
        alignment=2,
        textColor=colors.HexColor("#0f172a")
    )
    footer_text = ParagraphStyle(
        "FooterText",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#64748b"),
        alignment=1
    )

    story = []

    # 1. Header Banner: Brand Logo & Title + Tax Invoice Meta
    logo_element = None
    if os.path.exists(LOGO_PATH):
        try:
            logo_element = Image(LOGO_PATH, width=0.65 * inch, height=0.65 * inch)
        except Exception:
            logo_element = None

    brand_heading_html = (
        "<b><font size='16' color='#1e3a8a'>Indian Industrial Platform</font></b><br/>"
        "<b><font size='11' color='#0f172a'>TAX INVOICE</font></b> "
        "<font size='9' color='#64748b'>| Membership Subscription</font>"
    )

    if logo_element:
        brand_block = Table(
            [[logo_element, Paragraph(brand_heading_html, title_style)]],
            colWidths=[0.75 * inch, 3.4 * inch]
        )
        brand_block.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("PADDING", (0, 0), (-1, -1), 0),
        ]))
    else:
        brand_block = Paragraph(brand_heading_html, title_style)

    header_data = [
        [
            brand_block,
            Paragraph(
                f"<b>Invoice No:</b> {invoice_data.get('invoice_number', 'INV-2026-0001')}<br/>"
                f"<b>Date:</b> {invoice_data.get('invoice_date', datetime.now().strftime('%d %B %Y'))}<br/>"
                f"<b>Payment Ref:</b> {invoice_data.get('payment_id', 'Online')}",
                table_cell_right
            )
        ]
    ]
    header_table = Table(header_data, colWidths=[4.15 * inch, 3.05 * inch])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=14))

    # 2. Supplier vs Bill To Section
    supplier_html = (
        f"<b>{invoice_data.get('supplier_name', PLATFORM_NAME)}</b><br/>"
        f"<b>GSTIN:</b> {invoice_data.get('supplier_gstin', PLATFORM_GSTIN)}<br/>"
        f"<b>Address:</b> {invoice_data.get('supplier_address', PLATFORM_ADDRESS)}<br/>"
        f"<b>Email:</b> {PLATFORM_EMAIL} | <b>Phone:</b> {PLATFORM_PHONE}"
    )

    cust_name = invoice_data.get("customer_name") or "Valued Member"
    cust_comp = invoice_data.get("customer_company")
    cust_gstin = invoice_data.get("customer_gstin") or "Not Provided / Consumer"
    cust_addr = invoice_data.get("customer_address") or "India"

    customer_html = (
        f"<b>{cust_name}</b>" + (f" ({cust_comp})" if cust_comp else "") + "<br/>"
        f"<b>Customer GSTIN:</b> {cust_gstin}<br/>"
        f"<b>Billing Address:</b> {cust_addr}<br/>"
        f"<b>Payment Mode:</b> {invoice_data.get('payment_method', 'Razorpay Online')}"
    )

    parties_data = [
        [
            Paragraph("<b>SUPPLIER DETAILS</b>", section_heading),
            Paragraph("<b>BILL TO (CUSTOMER)</b>", section_heading)
        ],
        [
            Paragraph(supplier_html, body_style),
            Paragraph(customer_html, body_style)
        ]
    ]
    parties_table = Table(parties_data, colWidths=[3.6 * inch, 3.6 * inch])
    parties_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("PADDING", (0, 0), (-1, -1), 10),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    story.append(parties_table)
    story.append(Spacer(1, 16))

    # 3. Itemized Table
    base_amt = float(invoice_data.get("base_amount", 1000.0))
    gst_rate = float(invoice_data.get("gst_rate", 18.0))
    gst_amt = float(invoice_data.get("gst_amount", round(base_amt * 0.18, 2)))
    tot_amt = float(invoice_data.get("total_amount", round(base_amt + gst_amt, 2)))

    desc_text = invoice_data.get("description") or f"{invoice_data.get('plan_name', 'Membership')} subscription"
    items_table_data = [
        [
            Paragraph("<b>Item / Service Description</b>", table_header),
            Paragraph("<b>SAC Code</b>", table_header),
            Paragraph("<b>Base Amount (Rs.)</b>", table_cell_right_bold),
        ],
        [
            Paragraph(f"<b>{invoice_data.get('plan_name', 'Membership Plan')}</b><br/><font color='#64748b' size='8'>{desc_text}</font>", table_cell),
            Paragraph("998313", table_cell),  # Information technology / portal service SAC
            Paragraph(f"Rs. {base_amt:,.2f}", table_cell_right),
        ],
        [
            "",
            Paragraph("<b>Subtotal (Taxable Value):</b>", table_cell_right_bold),
            Paragraph(f"<b>Rs. {base_amt:,.2f}</b>", table_cell_right_bold),
        ],
        [
            "",
            Paragraph(f"<b>GST ({gst_rate:.0f}%):</b>", table_cell_right_bold),
            Paragraph(f"<b>Rs. {gst_amt:,.2f}</b>", table_cell_right_bold),
        ],
        [
            "",
            Paragraph("<b>Total Payable (INR):</b>", table_cell_right_bold),
            Paragraph(f"<b><font size='10' color='#1e3a8a'>Rs. {tot_amt:,.2f}</font></b>", table_cell_right_bold),
        ],
    ]

    items_table = Table(items_table_data, colWidths=[4.2 * inch, 1.8 * inch, 1.2 * inch])
    items_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("LINEBELOW", (0, 0), (-1, 0), 1.5, colors.HexColor("#0f172a")),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 12),
        ("TOPPADDING", (0, 1), (-1, 1), 12),
        ("LINEBELOW", (0, 1), (-1, 1), 0.5, colors.HexColor("#cbd5e1")),
        ("LINEABOVE", (1, 4), (-1, 4), 1, colors.HexColor("#0f172a")),
        ("BACKGROUND", (1, 4), (-1, 4), colors.HexColor("#eff6ff")),
        ("TOPPADDING", (1, 4), (-1, 4), 6),
        ("BOTTOMPADDING", (1, 4), (-1, 4), 6),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 24))

    # 4. Total in Words & Payment Note
    payment_status_data = [
        [
            Paragraph(
                f"<b>Payment Status:</b> <font color='#16a34a'>PAID IN FULL</font><br/>"
                f"<b>Razorpay Reference:</b> {invoice_data.get('payment_id', 'N/A')}<br/>"
                f"<b>Place of Supply:</b> Karnataka (29)",
                body_style
            ),
            Paragraph(
                f"<b>For {PLATFORM_NAME}</b><br/><br/>"
                f"<font color='#64748b'>Authorized Computer Generated Invoice<br/>No physical signature required.</font>",
                table_cell_right
            )
        ]
    ]
    payment_status_table = Table(payment_status_data, colWidths=[4.0 * inch, 3.2 * inch])
    payment_status_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(payment_status_table)
    story.append(Spacer(1, 20))

    # 5. Disclaimer Notice
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0"), spaceAfter=10))
    story.append(Paragraph(
        "The actual GST rate and classification are confirmed for your membership service under HSN/SAC 9983. "
        "This is an electronic tax invoice issued under the Goods and Services Tax Rules of India. "
        "For any billing or invoice queries, please contact billing@indianindustrialplatform.com.",
        footer_text
    ))

    # Build Document
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
