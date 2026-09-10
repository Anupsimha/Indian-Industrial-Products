import pytest
import uuid
from server import (
    Enquiry, EnquiryCreate, EnquiryOut, hydrate_enquiry_out
)

def test_enquiry_model_budget_and_timeframe():
    fake_enq = Enquiry(
        id="enq_test_budget",
        user_id="user_buyer_123",
        name="Test Buyer",
        mobile="9876543210",
        requirement="Industrial Pump",
        category="Pumps",
        location="Ahmedabad",
        budget="₹50,000 - 1 Lakh",
        required_by="15 Days",
        status="new",
        created_at="2026-09-09T00:00:00Z"
    )
    assert hasattr(fake_enq, "budget")
    assert hasattr(fake_enq, "required_by")
    assert fake_enq.budget == "₹50,000 - 1 Lakh"
    assert fake_enq.required_by == "15 Days"

def test_enquiry_hydration_preserves_budget_and_timeframe():
    fake_enq = Enquiry(
        id="enq_test_budget_2",
        user_id="user_buyer_123",
        name="Test Buyer",
        mobile="9876543210",
        requirement="CNC Lathe Machine",
        category="Machinery",
        location="Delhi",
        budget="₹5 Lakhs - 10 Lakhs",
        required_by="Immediate",
        status="new",
        created_at="2026-09-09T00:00:00Z"
    )
    out = hydrate_enquiry_out(fake_enq)
    assert isinstance(out, EnquiryOut)
    assert out.budget == "₹5 Lakhs - 10 Lakhs"
    assert out.required_by == "Immediate"

def test_enquiry_create_schema_budget_optional():
    ec = EnquiryCreate(
        name="Test Buyer",
        mobile="9876543210",
        requirement="Electric Motors",
        category="Electrical",
        location="Chennai",
        budget="₹20,000",
        required_by="30 Days"
    )
    assert ec.budget == "₹20,000"
    assert ec.required_by == "30 Days"
