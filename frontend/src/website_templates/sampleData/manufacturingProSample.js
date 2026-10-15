/**
 * Rich sample data for the 'Manufacturing Pro' template.
 * Tailored for precision machining, defense, aerospace components, and tool rooms.
 */

export const manufacturingProSample = {
  company: {
    id: "sample-precision-aero",
    name: "Precision Machining & Aerospace Solutions",
    tagline: "Micron-Level Tolerance, Mission-Critical Reliability",
    description: "Specialized precision engineering firm delivering complex 5-axis CNC machined components, titanium aerospace assemblies, and high-pressure hydraulic valve manifolds to defense, aerospace, and medical device leaders.",
    location: "Bommasandra Industrial Area, Bengaluru, Karnataka",
    city: "Bengaluru",
    state: "Karnataka",
    address: "Plot 12/B, 3rd Cross, Bommasandra Industrial Area, Bengaluru, Karnataka 560099",
    pincode: "560099",
    logo_url: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=200&h=200&fit=crop&q=80",
    cover_url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80",
    category: "Precision Engineering",
    mobile: "+91 98450 67890",
    whatsapp: "+91 98450 67890",
    email: "rfq@precisionaero.in",
    website: "https://precisionaero.indianindustrialplatform.com",
    gst: "29BBVPS5678J1Z2",
    pan: "BBVPS5678J",
    business_type: "Precision Job-Worker & OEM Sub-contractor",
    year_established: 2008,
    employees: "75 - 120 Specialists",
    certifications: ["AS9100D Certified", "ISO 9001:2015", "NADCAP Accredited", "Defense Production Certified"],
    is_featured: true,
  },
  stats: [
    { label: "Machining Tolerance", value: "±2 Microns" },
    { label: "5-Axis CNC Fleet", value: "32 Units" },
    { label: "Components Machined", value: "650,000+" },
    { label: "Quality Audit Score", value: "99.85%" },
  ],
  products: [
    {
      id: "prod-101",
      name: "Titanium Grade-5 Blisk Impeller (Aerospace)",
      category: "Aerospace Components",
      image_url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80",
      images: [
        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80"
      ],
      price: "₹68,000",
      moq: "5 Pieces",
      description: "Machined from solid Ti-6Al-4V billet using simultaneous 5-axis hyperMILL CAM programming. CMM inspection report included with full traceability.",
      stock_left: 15,
      location: "Bengaluru, Karnataka"
    },
    {
      id: "prod-102",
      name: "High-Pressure Hydraulic Manifold Block 350 Bar",
      category: "Hydraulics & Fluid Power",
      image_url: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=800&q=80",
      images: [
        "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=800&q=80"
      ],
      price: "₹24,500",
      moq: "10 Pieces",
      description: "Ductile iron / aluminum manifold with deep-hole drilled internal passages, zero cross-port leakage guarantee, electroless nickel plated.",
      stock_left: 30,
      location: "Bengaluru, Karnataka"
    },
    {
      id: "prod-103",
      name: "Hardened Ground Spline Shaft (EN-24 Steel)",
      category: "Power Transmission",
      image_url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80",
      images: [
        "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80"
      ],
      price: "₹9,800",
      moq: "25 Pieces",
      description: "Case hardened to 58-62 HRC, CNC cylindrical ground within 3 microns runout for high-torque industrial transmissions.",
      stock_left: 50,
      location: "Bengaluru, Karnataka"
    },
    {
      id: "prod-104",
      name: "Custom Tungsten Carbide Die & Punch Tooling",
      category: "Tool Room & Dies",
      image_url: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&q=80",
      images: [
        "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&q=80"
      ],
      price: "₹14,200",
      moq: "4 Sets",
      description: "Sub-micron grain carbide inserts EDM wire-cut and optical profile ground for progressive stamping dies with extended tool wear life.",
      stock_left: 18,
      location: "Bengaluru, Karnataka"
    }
  ],
  posts: [
    {
      id: "post-101",
      content: "Installation of our new Zeiss CONTURA 3D Coordinate Measuring Machine (CMM) is complete. Calibration accuracy verified to 0.9 microns.",
      media_url: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=800&q=80",
      media_urls: ["https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=800&q=80"],
      media_type: "image",
      category: "Quality Assurance",
      created_at: "2026-10-12T09:00:00Z"
    }
  ],
  reels: [
    {
      id: "reel-101",
      content: "5-axis simultaneous contouring on aero turbine blade section.",
      video_url: "https://assets.mixkit.co/videos/preview/mixkit-industrial-machine-working-on-metal-43187-large.mp4",
      thumbnail_url: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=400&q=80",
      views_count: 2180
    }
  ]
};
