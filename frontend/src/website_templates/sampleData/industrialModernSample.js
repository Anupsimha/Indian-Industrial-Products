/**
 * Rich sample data for the 'Industrial Modern' template.
 * Tailored for heavy machinery, automated systems, and fabrication equipment manufacturers.
 */

export const industrialModernSample = {
  company: {
    id: "sample-apex-heavy",
    name: "Apex Heavy Industries Ltd.",
    tagline: "Engineered For Peak Industrial Performance & Automation",
    description: "Apex Heavy Industries is an ISO 9001:2015 & CE certified manufacturer of high-precision CNC machinery, industrial hydraulic presses, and automated material handling systems. Trusted by automotive OEMs and structural engineering firms across 28 countries.",
    location: "Peenya Industrial Area, Bengaluru, Karnataka",
    city: "Bengaluru",
    state: "Karnataka",
    address: "Plot 48/A, Phase 2, Peenya Industrial Area, Bengaluru, Karnataka 560058",
    pincode: "560058",
    logo_url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=200&h=200&fit=crop&q=80",
    cover_url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1600&q=80",
    category: "Heavy Machinery",
    mobile: "+91 98860 12345",
    whatsapp: "+91 98860 12345",
    email: "sales@apexheavyindustries.com",
    website: "https://apexheavy.indianindustrialplatform.com",
    gst: "29AABCA1234F1Z8",
    pan: "AABCA1234F",
    business_type: "Manufacturer & OEM Exporter",
    year_established: 1999,
    employees: "150 - 250 Employees",
    certifications: ["ISO 9001:2015", "CE Certified", "Make in India Verified", "ZED Gold Certified"],
    is_featured: true,
  },
  stats: [
    { label: "Years in Industry", value: "25+" },
    { label: "Machinery Systems Deployed", value: "1,850+" },
    { label: "Global Export Reach", value: "28 Countries" },
    { label: "ISO Certifications", value: "9001 / 14001" },
  ],
  products: [
    {
      id: "prod-1",
      name: "Apex VMC-850 High-Speed Machining Center",
      category: "CNC Machining",
      image_url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80",
      images: [
        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80",
        "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=800&q=80"
      ],
      price: "₹32,50,000",
      moq: "1 Unit",
      description: "BT40 12000 RPM spindle, 24-station tool magazine, Siemens 828D CNC controller, high-rigidity Meehanite cast iron frame.",
      stock_left: 4,
      location: "Bengaluru, Karnataka"
    },
    {
      id: "prod-2",
      name: "250-Ton Four-Pillar Deep Drawing Hydraulic Press",
      category: "Hydraulic Presses",
      image_url: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=800&q=80",
      images: [
        "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=800&q=80"
      ],
      price: "₹18,75,000",
      moq: "1 Unit",
      description: "PLC touchscreen controlled hydraulic press engineered for automotive sheet metal stamping, deep drawing, and powder metallurgy.",
      stock_left: 2,
      location: "Bengaluru, Karnataka"
    },
    {
      id: "prod-3",
      name: "Modular Industrial Pallet Roller Conveyor Unit",
      category: "Material Handling",
      image_url: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&q=80",
      images: [
        "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&q=80"
      ],
      price: "₹4,20,000",
      moq: "10 Meters",
      description: "Heavy-duty zinc-plated motorized roller conveyor designed for automated manufacturing assembly lines up to 2000kg payload.",
      stock_left: 12,
      location: "Bengaluru, Karnataka"
    },
    {
      id: "prod-4",
      name: "Apex Planetary Industrial Reduction Gearbox",
      category: "Transmission & Drives",
      image_url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80",
      images: [
        "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80"
      ],
      price: "₹85,000",
      moq: "2 Units",
      description: "Case-hardened alloy steel planetary gear drive with 98% transmission efficiency, low backlash, and synthetic lube protection.",
      stock_left: 25,
      location: "Bengaluru, Karnataka"
    }
  ],
  posts: [
    {
      id: "post-1",
      content: "Excited to dispatch our 50th multi-axis CNC system of this fiscal quarter to a Tier-1 automotive manufacturer in Chennai!",
      media_url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80",
      media_urls: ["https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80"],
      media_type: "image",
      category: "Manufacturing Milestone",
      created_at: "2026-10-10T10:00:00Z"
    },
    {
      id: "post-2",
      content: "Apex Heavy Industries completes renewal of our ISO 14001 Environmental Management accreditation for our Peenya Unit 2 facility.",
      media_url: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=800&q=80",
      media_urls: ["https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=800&q=80"],
      media_type: "image",
      category: "Quality Standards",
      created_at: "2026-10-05T14:30:00Z"
    }
  ],
  reels: [
    {
      id: "reel-1",
      content: "High-speed CNC milling demo on hardox steel plate at 12,000 RPM.",
      video_url: "https://assets.mixkit.co/videos/preview/mixkit-industrial-machine-working-on-metal-43187-large.mp4",
      thumbnail_url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&q=80",
      views_count: 1420
    }
  ]
};
