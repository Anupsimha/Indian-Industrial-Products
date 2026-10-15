"""
Unit tests for Membership Tax Invoice Generation and Retrieval.
"""

import os
import pytest
from datetime import datetime
from services.invoice_service import generate_membership_invoice_pdf, generate_invoice_number

def test_generate_invoice_number():
    num1 = generate_invoice_number(1, datetime(2026, 10, 15))
    assert num1 == "INV-2026-0001"

    num2 = generate_invoice_number("42", datetime(2026, 10, 15))
    assert num2 == "INV-2026-0042"

def test_generate_membership_invoice_pdf_content():
    sample_data = {
        "invoice_number": "INV-2026-0001",
        "invoice_date": "15 October 2026",
        "supplier_name": "Indian Industrial Platform",
        "supplier_gstin": "29AABCU9603R1ZM",
        "supplier_address": "No. 35 Suvarna Nagar Doddabidrekallu Nagasandra, Bengaluru, Karnataka - 560073",
        "customer_name": "Precision Engineering Works",
        "customer_company": "PEW India Pvt Ltd",
        "customer_gstin": "29AABCP1234F1Z1",
        "customer_address": "Plot 12, Phase 1, Peenya Industrial Area, Bengaluru",
        "plan_name": "Annual Membership Plan",
        "description": "Annual membership plan subscription",
        "base_amount": 1000.0,
        "gst_rate": 18.0,
        "gst_amount": 180.0,
        "total_amount": 1180.0,
        "payment_id": "pay_TEST12345678",
        "payment_method": "Razorpay / Online"
    }

    pdf_bytes = generate_membership_invoice_pdf(sample_data)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 2000
    assert pdf_bytes.startswith(b"%PDF")


def test_generate_invoice_with_company_name():
    """
    Test that inputs any company name (along with customer and plan details)
    and produces a valid Tax Invoice PDF containing the company name.
    """
    import reportlab.rl_config
    
    # Temporarily set pageCompression to 0 to verify text inclusion in generated PDF stream
    orig_compression = reportlab.rl_config.pageCompression
    try:
        reportlab.rl_config.pageCompression = 0
        company_name = "Apex High-Precision Machining Pvt Ltd"
        customer_name = "Rajesh Sharma"
        customer_gstin = "29ABCDE1234F1Z5"
        
        invoice_input = {
            "invoice_number": generate_invoice_number(101, datetime(2026, 10, 15)),
            "invoice_date": "15 October 2026",
            "customer_name": customer_name,
            "customer_company": company_name,
            "customer_gstin": customer_gstin,
            "customer_address": "Peenya Industrial Estate, Bengaluru - 560058",
            "plan_name": "Premium Membership Plan",
            "description": "Annual membership plan subscription",
            "base_amount": 1000.0,
            "gst_rate": 18.0,
            "gst_amount": 180.0,
            "total_amount": 1180.0,
            "payment_id": "pay_TEST987654321",
            "payment_method": "Razorpay / UPI"
        }

        # Generate Invoice PDF
        invoice_pdf = generate_membership_invoice_pdf(invoice_input)

        # Assertions
        assert isinstance(invoice_pdf, bytes), "Invoice output must be bytes"
        assert invoice_pdf.startswith(b"%PDF"), "Invoice must be a valid PDF document"
        assert len(invoice_pdf) > 2500, "Invoice PDF must contain standard layout and table elements"
        
        # Verify that the input company name, invoice number, and GSTIN are present in the invoice
        assert company_name.encode("utf-8") in invoice_pdf, f"Company name '{company_name}' must be present in the invoice"
        assert b"INV-2026-0101" in invoice_pdf, "Invoice number must be present in the invoice"
        assert customer_gstin.encode("utf-8") in invoice_pdf, "Customer GSTIN must be present in the invoice"
        assert b"1,180.00" in invoice_pdf, "Total payable must be present in the invoice"
    finally:
        reportlab.rl_config.pageCompression = orig_compression
