/**
 * Central Template Registry.
 * Pluggable architecture allowing new templates to be registered, queried, and previewed with sample data.
 */

import IndustrialModernTemplate from "./templates/IndustrialModernTemplate";
import ManufacturingProTemplate from "./templates/ManufacturingProTemplate";
import MinimalCatalogTemplate from "./templates/MinimalCatalogTemplate";

import { industrialModernSample } from "./sampleData/industrialModernSample";
import { manufacturingProSample } from "./sampleData/manufacturingProSample";
import { minimalCatalogSample } from "./sampleData/minimalCatalogSample";

import BloomProTemplate from "./templates/BloomProTemplate";
import { bloomProSample } from "./sampleData/bloomProSample";

export const TEMPLATE_REGISTRY = {
  bloom_pro: {
    id: "bloom_pro",
    name: "Bloom Pro (Modern Light)",
    description: "Crisp, professional light-mode aesthetic tailored for high-precision manufacturers, aerospace suppliers, and export-oriented industrial firms.",
    badge: "New · Light Mode",
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
 * Retrieve template by ID with safe fallback to industrial_modern
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
