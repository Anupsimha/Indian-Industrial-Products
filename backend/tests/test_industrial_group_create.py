import pytest
import re
from pydantic import ValidationError
from server import IndustrialGroupCreate

def test_industrial_group_create_without_slug():
    payload = {
        "name": "sample",
        "location": "Bengaluru",
        "description": "tests sample",
        "image_url": "/api/uploads/b5beb4593c414b1eafe114ba679c6097.png",
        "cover_url": "/api/uploads/7b2c39298fc44bf2b773582524df2e85.png",
        "members_count": 500,
        "companies_count": 100
    }
    
    # Should not raise ValidationError
    obj = IndustrialGroupCreate(**payload)
    assert obj.name == "sample"
    assert obj.slug is None
    
    # Verify slug generation logic
    raw_slug = obj.slug.strip() if obj.slug and obj.slug.strip() else obj.name
    generated_slug = re.sub(r'[^a-z0-9]+', '-', raw_slug.lower()).strip('-')
    assert generated_slug == "sample"

def test_industrial_group_create_with_custom_slug():
    payload = {
        "name": "Peenya Industrial Area, Phase 2",
        "slug": "peenya-phase-2-custom",
        "location": "Bengaluru",
        "description": "Manufacturing hub",
        "image_url": "/api/uploads/peenya.png"
    }
    
    obj = IndustrialGroupCreate(**payload)
    assert obj.name == "Peenya Industrial Area, Phase 2"
    assert obj.slug == "peenya-phase-2-custom"
    
    raw_slug = obj.slug.strip() if obj.slug and obj.slug.strip() else obj.name
    generated_slug = re.sub(r'[^a-z0-9]+', '-', raw_slug.lower()).strip('-')
    assert generated_slug == "peenya-phase-2-custom"

def test_industrial_group_create_complex_name_slug_generation():
    payload = {
        "name": "Peenya Industrial Area & Tech Zone, #5!",
        "location": "Bengaluru",
        "description": "Complex name test"
    }
    
    obj = IndustrialGroupCreate(**payload)
    assert obj.slug is None
    
    raw_slug = obj.slug.strip() if obj.slug and obj.slug.strip() else obj.name
    generated_slug = re.sub(r'[^a-z0-9]+', '-', raw_slug.lower()).strip('-')
    assert generated_slug == "peenya-industrial-area-tech-zone-5"
