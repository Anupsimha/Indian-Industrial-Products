import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api, { whatsappLink } from "../lib/api";
import { optimizedUrl } from "../lib/cloudinary";
import {
  ArrowLeft, ShoppingCart, MessageSquare, MapPin, Star, CheckCircle,
  Clock, ShieldCheck, Truck, Bookmark, Award, Sparkles, Loader2, Package
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { EnquiryDialog } from "../components/EnquiryDialog";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  useEffect(() => {
    const fetchProductDetails = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/products/${id}`);
        setProduct(data);
        
        // Fetch recommendations from the same category
        if (data && data.category) {
          const res = await api.get(`/products?category=${encodeURIComponent(data.category)}`);
          if (res.data) {
            // Filter out current product
            const filtered = res.data.filter((p) => p.id !== data.id);
            setRecommendations(filtered.slice(0, 6)); // Limit to 6
          }
        }
      } catch (err) {
        console.error("Error fetching product detail:", err);
        toast.error("Failed to load product details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product);
    toast.success(`${product.name} added to cart!`);
  };

  const handleBuyNow = () => {
    if (!product) return;
    addToCart(product);
    navigate("/cart");
  };

  const getNumericPrice = (priceStr) => {
    if (!priceStr || typeof priceStr !== "string") return 4500;
    if (priceStr.toLowerCase().includes("request")) return 4500;
    const cleaned = priceStr.replace(/[^\d.]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 4500 : parsed;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-10" data-testid="product-detail-loading">
        <Loader2 className="animate-spin text-blue-900 mb-2" size={32} />
        <span className="text-slate-500 font-semibold text-sm">Loading product details...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20 px-4" data-testid="product-detail-error">
        <Package className="mx-auto text-slate-300 mb-3" size={48} />
        <h2 className="font-display font-bold text-lg text-slate-800">Product Not Found</h2>
        <p className="text-sm text-slate-500 mt-1">The product you are looking for might have been removed or does not exist.</p>
        <button
          onClick={() => navigate("/products")}
          className="mt-4 px-5 py-2 bg-blue-900 text-white rounded-full font-bold text-xs hover:bg-blue-950 transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={14} /> Back to Products
        </button>
      </div>
    );
  }

  const isOwnProduct = user && user.company_id === product.company_id;

  return (
    <div className="pb-24 px-4 pt-4 bg-slate-50 min-h-screen" data-testid="product-detail-page">
      {/* Back & Top Bar */}
      <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-semibold text-xs"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <span className="font-display font-extrabold text-slate-900 text-sm">Product Details</span>
        <button 
          onClick={() => toast.success(`${product.name} bookmarked!`)}
          className="p-1.5 rounded-full bg-slate-50 text-slate-400 hover:text-blue-900 transition-colors"
        >
          <Bookmark size={16} />
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start max-w-7xl mx-auto">
        {/* Left Column: Product Image Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-md">
            <img
              src={optimizedUrl(product.image_url, { w: 800 })}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
              {product.stock_left !== undefined && product.stock_left !== null ? `Qty Left: ${product.stock_left}` : "In Stock"}
            </span>
          </div>

          {/* Sub Images strip if they exist */}
          {product.images && product.images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 border-blue-900 bg-white shadow-sm">
                <img src={optimizedUrl(product.image_url, { w: 200 })} alt="" className="w-full h-full object-cover" />
              </div>
              {product.images.map((img, idx) => (
                <div key={idx} className="w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-white hover:border-blue-900 transition-colors shadow-sm">
                  <img src={optimizedUrl(img, { w: 200 })} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Title, Metadata, Pricing, Description, Actions */}
        <div className="lg:col-span-6 mt-4 lg:mt-0 space-y-4">
          {/* Main Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
            {/* Badges & Rating */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-900 text-[10px] font-extrabold uppercase tracking-wide">
                <CheckCircle size={10} className="fill-blue-100 text-blue-900" /> Verified Supplier
              </span>
              <span className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[10px] font-extrabold uppercase tracking-wide">
                <Star size={10} className="fill-amber-400 text-amber-500" /> 4.7 (42 reviews)
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                {product.category}
              </span>
            </div>

            {/* Product Title */}
            <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900 leading-snug">
              {product.name}
            </h1>

            {/* Price Details */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Best Purchase Price</span>
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-black text-blue-900 text-2xl">
                    {product.price || "On Request"}
                  </span>
                  {product.price && !product.price.toLowerCase().includes("request") && (
                    <>
                      <span className="text-xs text-slate-400 line-through">
                        ₹{Math.round(getNumericPrice(product.price) * 1.25).toLocaleString()}
                      </span>
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">Save 20%</span>
                    </>
                  )}
                </div>
              </div>
              {product.moq && (
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Min. Order Qty</span>
                  <span className="font-bold text-xs text-slate-700 bg-slate-200/50 px-2.5 py-1 rounded-lg border border-slate-200/80 block mt-0.5">
                    {product.moq}
                  </span>
                </div>
              )}
            </div>

            {/* Features Icons grid */}
            <div className="grid grid-cols-3 gap-2 py-2">
              <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 text-center">
                <Truck size={16} className="text-blue-900 mb-1" />
                <span className="text-[9px] font-bold text-slate-700">Quick Delivery</span>
                <span className="text-[8px] text-slate-400 leading-tight">Fast shipping available</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 text-center">
                <ShieldCheck size={16} className="text-emerald-600 mb-1" />
                <span className="text-[9px] font-bold text-slate-700">100% Genuine</span>
                <span className="text-[8px] text-slate-400 leading-tight">Direct from manufacturer</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 text-center">
                <Clock size={16} className="text-orange-500 mb-1" />
                <span className="text-[9px] font-bold text-slate-700">Quick Enquiry</span>
                <span className="text-[8px] text-slate-400 leading-tight">Response in 2 hrs</span>
              </div>
            </div>
          </div>

          {/* Seller details card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <h3 className="font-display font-extrabold text-xs text-slate-400 uppercase tracking-wider mb-3">Seller Information</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                <img src={product.company_logo || "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100"} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/company/${product.company_id}`} className="font-bold text-sm text-slate-900 hover:text-blue-900 truncate block">
                  {product.company_name}
                </Link>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                  <MapPin size={12} className="text-slate-400 shrink-0" />
                  <span className="truncate">{product.location || "Bengaluru, India"}</span>
                </div>
              </div>
              <Link to={`/company/${product.company_id}`} className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 transition-colors">
                View Shop
              </Link>
            </div>
          </div>

          {/* Highlights & Specs */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
            <h3 className="font-display font-extrabold text-xs text-slate-400 uppercase tracking-wider">Product Highlights</h3>
            {product.description ? (
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{product.description}</p>
            ) : (
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li>High quality industrial grade components tailored for robustness.</li>
                <li>Manufactured strictly complying to ISO-9001 quality guidelines.</li>
                <li>Durable design with resistance against standard heat and stress.</li>
                <li>Suitable for high-load applications and general machining tasks.</li>
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Recommended Products Grid */}
      <div className="mt-8 max-w-7xl mx-auto space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <Sparkles size={18} className="text-orange-500 fill-orange-500" />
          <h2 className="font-display font-black text-base text-slate-900 uppercase tracking-wide">
            Recommended Products
          </h2>
        </div>

        {recommendations.length === 0 ? (
          <div className="text-center py-6 bg-white border border-slate-100 rounded-2xl text-xs text-slate-400 font-medium">
            No other products found in this category.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {recommendations.map((rec) => (
              <Link
                key={rec.id}
                to={`/product/${rec.id}`}
                className="group flex flex-col bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-blue-200 transition-all duration-200 shadow-sm"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-slate-50">
                  <img src={rec.image_url} alt={rec.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-3 flex-grow flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug hover:text-blue-900 min-h-[2rem]">
                      {rec.name}
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate mt-1">
                      {rec.company_name}
                    </div>
                  </div>
                  <div className="mt-2 pt-1 border-t border-slate-50 flex items-center justify-between">
                    <span className="font-display font-extrabold text-blue-900 text-xs">{rec.price || "On Request"}</span>
                    {rec.moq && <span className="text-[8px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded">MOQ: {rec.moq}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Sticky Bottom Actions Bar (On Mobile) / Bottom Fixed Panel */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 py-3 z-30 flex items-center gap-2 max-w-md md:max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto shadow-[0_-4px_12px_rgba(0,0,0,0.06)] rounded-t-3xl pb-6 lg:pb-3">
        <a
          href={isOwnProduct ? "#" : whatsappLink(product.whatsapp || "+919876543210", `Hi, I am interested in your product: "${product.name}" listed on IIP.`)}
          target={isOwnProduct ? "_self" : "_blank"}
          rel="noreferrer"
          onClick={(e) => {
            if (isOwnProduct) {
              e.preventDefault();
              toast.error("You cannot contact yourself.");
            }
          }}
          className={`flex-1 py-3 text-center rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all ${
            isOwnProduct
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-[#25D366] hover:bg-[#20bd5a] text-white active:scale-[0.98]"
          }`}
        >
          <MessageSquare size={14} /> WhatsApp
        </a>
        <button
          onClick={() => {
            if (isOwnProduct) {
              toast.error("You cannot send inquiries to your own business.");
              return;
            }
            setEnquiryOpen(true);
          }}
          className={`flex-1 py-3 rounded-2xl font-bold text-xs transition-all shadow-sm ${
            isOwnProduct
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-orange-600 hover:bg-orange-700 text-white active:scale-[0.98]"
          }`}
        >
          Enquiry Now
        </button>
        <button
          onClick={handleAddToCart}
          className="flex-1 py-3 border border-blue-900 text-blue-900 font-bold text-xs rounded-2xl hover:bg-blue-50 active:scale-[0.98] transition-all"
        >
          Add to Cart
        </button>
        <button
          onClick={handleBuyNow}
          className="flex-1 py-3 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-2xl shadow-sm active:scale-[0.98] transition-all"
        >
          Buy Now
        </button>
      </div>

      {/* Enquiry Dialog */}
      <EnquiryDialog
        open={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
        companyId={product.company_id}
        productId={product.id}
        productName={product.name}
        defaultCategory={product.category}
        companyName={product.company_name}
      />
    </div>
  );
}
