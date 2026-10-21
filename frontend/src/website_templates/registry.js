/**
 * Central Template Registry.
 * Pluggable architecture allowing new templates to be registered, queried, and previewed with sample data.
 */

import IndustrialModernTemplate from "./templates/IndustrialModernTemplate";
import ManufacturingProTemplate from "./templates/ManufacturingProTemplate";
import MinimalCatalogTemplate from "./templates/MinimalCatalogTemplate";
import BloomProTemplate from "./templates/BloomProTemplate";
import ApexPrecisionTemplate from "./templates/ApexPrecisionTemplate";

import { industrialModernSample } from "./sampleData/industrialModernSample";
import { manufacturingProSample } from "./sampleData/manufacturingProSample";
import { minimalCatalogSample } from "./sampleData/minimalCatalogSample";
import { bloomProSample } from "./sampleData/bloomProSample";
import { apexPrecisionSample } from "./sampleData/apexPrecisionSample";

export const TEMPLATE_REGISTRY = {
  apex_precision: {
    id: "apex_precision",
    name: "Apex Precision (Navy & Steel)",
    description: "High-contrast precision tooling layout with deep navy backdrop, safety orange accents, tabbed category blocks (A, B, C), and engineering job-work showcase.",
    badge: "New · High Contrast",
    category: "precision_tools",
    component: ApexPrecisionTemplate,
    sampleData: apexPrecisionSample,
    thumbnailUrl: "/template_assets/apex_precision/showcase.jpg",
    features: [
      "Bold industrial typography with safety orange & steel accents",
      "Categorized product blocks with custom letter codes (A, B, C...)",
      "Dedicated engineering & precision job-work services showcase",
      "4-Step structured quotation workflow (From Requirement to Dispatch)",
      "Direct WhatsApp RFQ and technical drawing inquiry modal"
    ],
    customModules: [
      {
        key: "hero_slides",
        label: "Hero Section Slides",
        singular: "Hero Slide",
        plural: "Hero Slides",
        icon: "Layers",
        description: "Manage slideshow visuals, headlines, and call-to-actions displayed at the top of your website.",
        fields: [
          { key: "title", label: "Slide Headline", type: "text", required: true, placeholder: "e.g. Precision Tools. Permanent Marking. Engineered Parts." },
          { key: "subtitle", label: "Eyebrow / Subheading", type: "text", placeholder: "e.g. Sai Sam Enterprises · Bengaluru" },
          { key: "description", label: "Slide Description", type: "textarea", required: true, placeholder: "Describe key manufacturing capabilities or value proposition..." },
          { key: "icon_or_image", label: "Slide Hero Image", type: "image", required: true, placeholder: "Image URL or click upload" },
          { key: "button_text", label: "Primary Button Label (Optional)", type: "text", isMetadata: true, placeholder: "e.g. Explore Products" },
          { key: "button_link", label: "Primary Button Link (Optional)", type: "text", isMetadata: true, placeholder: "e.g. #products" }
        ]
      },
      {
        key: "services",
        label: "Job-Work Services",
        singular: "Job-Work Service",
        plural: "Job-Work Services",
        icon: "Wrench",
        description: "Manage precision job-work, CNC machining, laser marking, and additive prototyping service cards showcased on your website.",
        fields: [
          { key: "title", label: "Service Name", type: "text", required: true, placeholder: "e.g. Laser Marking & Engraving Services" },
          { key: "subtitle", label: "Service Code", type: "text", placeholder: "e.g. S/01" },
          { key: "description", label: "Service Description", type: "textarea", required: true, placeholder: "Describe capacity, tolerances, machinery, materials handled..." },
          { key: "icon_or_image", label: "Card Showcase Image", type: "image", required: true, placeholder: "Image URL or click upload" },
          { key: "turnaround", label: "Turnaround / Timeline (Optional)", type: "text", isMetadata: true, placeholder: "e.g. 24 - 48 Hours" },
          { key: "deliverables", label: "Deliverables / Specs (Optional)", type: "text", isMetadata: true, placeholder: "e.g. CAD/CAM machining with inspection report" }
        ]
      },
      {
        key: "website_products",
        label: "Website Products (CMS)",
        singular: "Website Product",
        plural: "Website Products",
        icon: "Package",
        description: "Independent CMS catalog for your company website. Prices are completely optional, allowing you to showcase custom tooling, nameplates, and parts without publishing pricing.",
        fields: [
          { key: "title", label: "Product Name", type: "text", required: true, placeholder: "e.g. GESAC Cutting Tools" },
          { key: "subtitle", label: "Category", type: "text", placeholder: "e.g. Carbide Cutting Tools" },
          { key: "description", label: "Product Description", type: "textarea", required: true, placeholder: "Technical description, materials, and workpiece applications..." },
          { key: "icon_or_image", label: "Product Image", type: "image", required: true, placeholder: "Image URL or click upload" },
          { key: "price", label: "Price (Optional - leave blank to hide price)", type: "text", isMetadata: true, placeholder: "e.g. ₹1,250 or leave blank for RFQ only" },
          { key: "moq", label: "Minimum Order Quantity (Optional)", type: "text", isMetadata: true, placeholder: "e.g. 10 Units" },
          { key: "external_url", label: "External Reference Link (Optional)", type: "text", isMetadata: true, placeholder: "e.g. https://www.gesac-tools.com/" },
          { key: "external_label", label: "External Button Label (Optional)", type: "text", isMetadata: true, placeholder: "e.g. Visit GESAC Official Website" }
        ]
      }
    ]
  },
  bloom_pro: {
    id: "bloom_pro",
    name: "Bloom Pro (Modern Light)",
    description: "Crisp, professional light-mode aesthetic tailored for high-precision manufacturers, aerospace suppliers, and export-oriented industrial firms.",
    badge: "Light Mode",
    category: "precision_engineering",
    component: BloomProTemplate,
    sampleData: bloomProSample,
    thumbnailUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80",
    features: [
      "Modern clean light-mode typography & crisp UI",
      "Interactive category filtering and high-res product cards",
      "ISO & AS9100 quality certifications showcase",
      "Direct 1-click WhatsApp quote & RFQ drawer workflow"
    ]
  },
  industrial_modern: {
    id: "industrial_modern",
    name: "Industrial Modern",
    description: "High-impact layout with dynamic machinery hero, real-time metrics, tabbed catalog highlights, and industrial reels showcase.",
    badge: "Most Popular",
    category: "heavy_machinery",
    component: IndustrialModernTemplate,
    sampleData: industrialModernSample,
    thumbnailUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80",
    features: [
      "Hero video / banner with dynamic metrics counters",
      "Tabbed product catalog with category filter pills",
      "Company updates & video reel gallery",
      "Direct RFQ quotation drawer & WhatsApp routing"
    ]
  },
  manufacturing_pro: {
    id: "manufacturing_pro",
    name: "Manufacturing Pro",
    description: "Engineered for precision machining and component manufacturers. Features technical RFQ quote builder, specifications downloads, and ISO certification showcase.",
    badge: "B2B Recommended",
    category: "components",
    component: ManufacturingProTemplate,
    sampleData: manufacturingProSample,
    thumbnailUrl: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=800&q=80",
    features: [
      "Top engineering RFQ announcement banner",
      "Detailed component specification tables",
      "AS9100 / ISO quality assurance audit showcase",
      "Direct drawing & CAD quotation request workflow"
    ]
  },
  minimal_catalog: {
    id: "minimal_catalog",
    name: "Minimal Catalog",
    description: "Clean, ultra-fast browsing experience with whitespace focus, high-res photography, verified badges, and instant 1-click WhatsApp order routing.",
    badge: "Fast & Clean",
    category: "general_b2b",
    component: MinimalCatalogTemplate,
    sampleData: minimalCatalogSample,
    thumbnailUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80",
    features: [
      "Ultra-fast search bar for large SKU catalogs",
      "1-click direct WhatsApp quote on every item",
      "Lightweight, clean layout optimized for mobile buyers",
      "Verified GST and legal registration credential pills"
    ]
  }
};

/**
 * Retrieve template by ID with safe fallback to apex_precision or industrial_modern
 */
export function getTemplate(templateId) {
  return TEMPLATE_REGISTRY[templateId] || TEMPLATE_REGISTRY.industrial_modern;
}

/**
 * Retrieve list of all registered templates
 */
export function getAllTemplates() {
  return Object.values(TEMPLATE_REGISTRY);
}

/**
 * Retrieve sample data for a template ID
 */
export function getSampleDataForTemplate(templateId) {
  const tmpl = getTemplate(templateId);
  return tmpl ? tmpl.sampleData : industrialModernSample;
}

/**
 * Merges user company & product data with template sample data for realistic live previews.
 * If user has no data for a field, gracefully falls back to template sample defaults.
 */

export function mergePreviewData(sampleData, userCompany, userProducts, userPosts, userReels, userServices = [], allSections = []) {
  if (!userCompany) return sampleData;

  // Separate sections by key if allSections array is provided
  const sectionsList = Array.isArray(allSections) && allSections.length > 0 ? allSections : (Array.isArray(userServices) ? userServices : []);
  const servicesItems = sectionsList.filter((s) => s.section_key === "services" || !s.section_key);
  const heroSlidesItems = sectionsList.filter((s) => s.section_key === "hero_slides");
  const websiteProductsItems = sectionsList.filter((s) => s.section_key === "website_products");

  const mergedCompany = {
    ...sampleData.company,
    ...userCompany,
    name: userCompany.name || sampleData.company.name,
    headline: userCompany.headline || sampleData.company.headline,
    description: userCompany.description || sampleData.company.description,
    about: userCompany.about || userCompany.description || sampleData.company.about,
    logo_url: userCompany.logo_url || sampleData.company.logo_url,
    cover_url: userCompany.cover_url || sampleData.company.cover_url,
    location: userCompany.location || (userCompany.city ? `${userCompany.city}, India` : null) || sampleData.company.location,
    city: userCompany.city || sampleData.company.city,
    address: userCompany.address || sampleData.company.address,
    mobile: userCompany.mobile || sampleData.company.mobile,
    phone: userCompany.phone || userCompany.mobile || sampleData.company.phone,
    whatsapp: userCompany.whatsapp || userCompany.mobile || sampleData.company.whatsapp,
    email: userCompany.email || sampleData.company.email,
    gst: userCompany.gst || sampleData.company.gst,
    year_established: userCompany.year_established || sampleData.company.year_established,
    certifications: (userCompany.certifications && userCompany.certifications.length > 0)
      ? userCompany.certifications
      : sampleData.company.certifications,
  };

  // If independent website products are configured in CMS, prioritize them
  let mergedProducts = [];
  if (websiteProductsItems.length > 0) {
    mergedProducts = websiteProductsItems.map((p) => {
      const meta = p.metadata_json || {};
      return {
        id: p.id,
        name: p.title,
        title: p.title,
        category: p.subtitle || "Precision Products",
        image_url: p.icon_or_image || (sampleData.products && sampleData.products[0]?.image_url),
        images: [p.icon_or_image || (sampleData.products && sampleData.products[0]?.image_url)],
        description: p.description || "Manufactured to high-precision engineering specifications.",
        price: meta.price || "",
        moq: meta.moq || "",
        external_url: meta.external_url || "",
        external_label: meta.external_label || ""
      };
    });
  } else if (userProducts && userProducts.length > 0) {
    mergedProducts = userProducts.map((p) => ({
      ...p,
      id: p.id || String(Math.random()),
      name: p.name || p.title || "Precision Component",
      category: p.category || "General",
      image_url: p.image_url || (p.images && p.images[0]) || p.image || (sampleData.products && sampleData.products[0]?.image_url),
      price: p.price ? (typeof p.price === "number" ? `₹${p.price.toLocaleString("en-IN")}` : p.price) : "",
      moq: p.moq ? `${p.moq} Units` : "",
      description: p.description || "Manufactured to high-precision engineering specifications."
    }));
  } else {
    mergedProducts = sampleData.products;
  }

  const mergedPosts = (userPosts && userPosts.length > 0) ? userPosts : sampleData.posts;
  const mergedReels = (userReels && userReels.length > 0) ? userReels : sampleData.reels;

  const mergedServices = (servicesItems && servicesItems.length > 0)
    ? servicesItems.map((s, idx) => ({
        id: s.id || `srv-${idx}`,
        code: s.subtitle || `S/0${idx + 1}`,
        name: s.title || s.name,
        image_url: s.icon_or_image || s.image_url || (sampleData.services && sampleData.services[idx % sampleData.services.length]?.image_url),
        description: s.description || "",
        ...(s.metadata_json || {})
      }))
    : (sampleData.services || []);

  const mergedHeroSlides = (heroSlidesItems && heroSlidesItems.length > 0)
    ? heroSlidesItems.map((s, idx) => ({
        id: s.id || `slide-${idx}`,
        title: s.title,
        heading: s.title,
        subtitle: s.subtitle || "",
        eyebrow: s.subtitle || "",
        description: s.description || "",
        image_url: s.icon_or_image || "",
        icon_or_image: s.icon_or_image || "",
        ...(s.metadata_json || {})
      }))
    : [];

  return {
    company: mergedCompany,
    products: mergedProducts,
    posts: mergedPosts,
    reels: mergedReels,
    services: mergedServices,
    hero_slides: mergedHeroSlides,
    custom_sections: {
      services: mergedServices,
      hero_slides: mergedHeroSlides,
      website_products: mergedProducts
    },
    steps: sampleData.steps || [],
    hasUserCompany: true,
    hasUserProducts: mergedProducts.length > 0
  };
}
