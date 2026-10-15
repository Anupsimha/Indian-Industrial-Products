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
        "supplier_name": "Indian Industrial Products",
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
