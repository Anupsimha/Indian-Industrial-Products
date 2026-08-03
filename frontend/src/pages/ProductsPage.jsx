import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Link, useNavigate } from "react-router-dom";
import { whatsappLink } from "../lib/api";
import {
  MessageSquare, Search, SlidersHorizontal, ShoppingCart, Plus, Minus,
  CheckCircle, MapPin, CreditCard, Clock, ChevronRight, X, Star, ShieldCheck,
  Truck, ArrowRight, ShieldAlert, Award, Bookmark
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

const parsePrice = (priceStr) => {
  if (!priceStr || typeof priceStr !== "string") return null;
  if (priceStr.toLowerCase().includes("request")) return null;
  const cleaned = priceStr.replace(/[^\d.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
};

const parseMOQ = (moqStr) => {
  if (!moqStr || typeof moqStr !== "string") return null;
  const cleaned = moqStr.replace(/[^\d.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
};

const getNumericPrice = (priceStr) => {
  const parsed = parsePrice(priceStr);
  return parsed || 4500; // fallback default price if not numerical
};

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  
  // Filter States
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [maxMOQ, setMaxMOQ] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Global Cart Context
  const { cart, addToCart: ctxAddToCart, updateQty, clearCart, cartSubtotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Buying Flow State (local to this page's checkout modal)
  const [selectedProduct, setSelectedProduct] = useState(null); // Detail modal product
  const [buyingStep, setBuyingStep] = useState(null); // 'cart' | 'delivery' | 'checkout' | 'payment' | 'processing' | 'confirmed' | null
  const [selectedDelivery, setSelectedDelivery] = useState("free");
  const [selectedPayment, setSelectedPayment] = useState("upi");
  const [upiId, setUpiId] = useState("rahulsharma@upi");

  // Delivery options details
  const deliveryOptions = {
    express: { label: "90 Minutes Delivery (Express)", cost: 299, desc: "Only 2 slots left for today" },
    oneday: { label: "1 Day Delivery", cost: 149, desc: "Get it by Tomorrow 9 PM" },
    porter: { label: "Porter Delivery (Same Day)", cost: 89, desc: "Get it today by Porter" },
    free: { label: "Free Delivery (0-20 KM)", cost: 0, desc: "You are 12.4 KM away. Eligible for free delivery." },
    standard: { label: "Standard Delivery (20-100 KM)", cost: 99, desc: "Get it in 2-4 Days" },
    india: { label: "India Delivery (100+ KM)", cost: 199, desc: "Get it in 3-7 Days" }
  };

  useEffect(() => {
    api.get("/products")
      .then((r) => setProducts(r.data))
      .catch(() => {});
  }, []);

  const cats = ["All", ...Array.from(new Set(products.map((p) => p.category)))];

  const filtered = products
    .filter((p) => {
      const matchCat = activeCat === "All" || p.category === activeCat;
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.company_name.toLowerCase().includes(q.toLowerCase());

      let matchPrice = true;
      if (minPrice || maxPrice) {
        const pVal = parsePrice(p.price);
        if (pVal !== null) {
          if (minPrice && pVal < parseFloat(minPrice)) matchPrice = false;
          if (maxPrice && pVal > parseFloat(maxPrice)) matchPrice = false;
        } else {
          matchPrice = false;
        }
      }

      let matchMOQFilter = true;
      if (maxMOQ) {
        const moqVal = parseMOQ(p.moq);
        if (moqVal !== null) {
          if (moqVal > parseFloat(maxMOQ)) matchMOQFilter = false;
        }
      }

      return matchCat && matchQ && matchPrice && matchMOQFilter;
    })
    .sort((a, b) => {
      if (sortBy === "price_asc") {
        const priceA = parsePrice(a.price) ?? Infinity;
        const priceB = parsePrice(b.price) ?? Infinity;
        return priceA - priceB;
      }
      if (sortBy === "price_desc") {
        const priceA = parsePrice(a.price) ?? -Infinity;
        const priceB = parsePrice(b.price) ?? -Infinity;
        return priceB - priceA;
      }
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

  // Cart helper functions (use global CartContext)
  const addToCart = (product, triggerFlow = false) => {
    ctxAddToCart(product);
    toast.success(`${product.name} added to cart!`);
    if (triggerFlow) {
      setBuyingStep("cart");
    }
  };

  const updateCartQty = (id, change) => updateQty(id, change);

  // Calculations (cartSubtotal comes from CartContext)
  const deliveryCost = cart.length > 0 ? deliveryOptions[selectedDelivery].cost : 0;
  const gstCost = Math.round(cartSubtotal * 0.18);
  const cartTotal = cartSubtotal + deliveryCost + gstCost;

  const placeOrder = async () => {
    try {
      const orderPayload = {
        items: cart.map((item) => ({
          product_id: item.id,
          name: item.name,
          qty: item.qty,
          price: item.price || "On Request",
          image_url: item.image_url,
          company_name: item.company_name || "",
        })),
        subtotal: cartSubtotal,
        delivery_cost: deliveryCost,
        gst: gstCost,
        total: cartTotal,
        delivery_option: selectedDelivery,
        payment_method: selectedPayment,
        payment_id: selectedPayment === "upi" ? upiId : "mock_card_" + Date.now(),
        address: user ? `${user.name}, India` : "India",
      };

      if (user) {
        await api.post("/orders", orderPayload);
      }
    } catch (error) {
      console.error("Failed to place order via backend:", error);
    }
  };

  const handlePaymentConfirm = async () => {
    setBuyingStep("processing");
    await placeOrder();
  };

  // Simulated processing screen
  useEffect(() => {
    if (buyingStep === "processing") {
      const timer = setTimeout(() => {
        setBuyingStep("confirmed");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [buyingStep]);

  return (
    <div className="pb-28 px-4 pt-4 max-w-md md:max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto" data-testid="products-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-xs text-slate-500">Browse industrial products from verified suppliers</p>
        </div>
        {/* Floating/Header Cart Trigger */}
        {cart.length > 0 && (
          <button
            onClick={() => setBuyingStep("cart")}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-900 text-white rounded-full shadow-lg hover:bg-blue-950 transition-all font-bold text-xs"
          >
            <ShoppingCart size={14} />
            <span>Cart ({cart.reduce((sum, item) => sum + item.qty, 0)})</span>
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2 mt-4">
        <div className="relative flex-grow">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search products or companies..."
            data-testid="products-search"
            className="w-full pl-9 pr-3 py-2.5 rounded-full bg-white border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          data-testid="products-filter-toggle"
          className={`p-2.5 rounded-full border transition-all flex items-center justify-center ${
            showFilters || minPrice || maxPrice || maxMOQ || sortBy !== "newest"
              ? "bg-blue-900 border-blue-900 text-white"
              : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
          }`}
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {showFilters && (
        <div className="mt-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-display font-bold text-slate-800 text-sm">Filter Products</h3>
            <button
              onClick={() => {
                setMinPrice("");
                setMaxPrice("");
                setMaxMOQ("");
                setSortBy("newest");
              }}
              data-testid="products-filter-clear"
              className="text-xs text-blue-800 hover:text-blue-900 font-semibold"
            >
              Clear All
            </button>
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Min Price (₹)</label>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Max Price (₹)</label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Any"
                className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Max MOQ</label>
              <input
                type="number"
                value={maxMOQ}
                onChange={(e) => setMaxMOQ(e.target.value)}
                placeholder="Any"
                className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name_asc">Name: A to Z</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Categories slider */}
      <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {cats.map((c) => (
          <button key={c} onClick={() => setActiveCat(c)} data-testid={`prod-cat-${c}`}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              activeCat === c ? "bg-blue-900 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-400"
            }`}>
            {c}
          </button>
        ))}
      </div>

      {/* Mobile Horizontal Cards List (sm:hidden) */}
      <div className="flex flex-col gap-3 sm:hidden mt-4">
        {filtered.length === 0 && (
          <div className="text-center text-sm text-slate-500 py-8 bg-white border border-slate-100 rounded-2xl">
            No products found.
          </div>
        )}
        {filtered.map((p, idx) => {
          const isTopSeller = idx % 4 === 0;
          return (
            <div
              key={p.id}
              className="bg-white border border-slate-100 rounded-2xl p-3 flex gap-3 shadow-sm hover:shadow-md transition-all relative"
              data-testid={`product-mobile-${p.id}`}
            >
              {/* Save/Bookmark Button at Top Right */}
              <button 
                onClick={() => toast.success(`${p.name} saved!`)}
                className="absolute top-3 right-3 p-1 text-slate-400 hover:text-blue-900 transition-colors"
              >
                <Bookmark size={16} />
              </button>

              {/* Left: Product Image */}
              <div 
                className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 bg-slate-50 rounded-xl overflow-hidden cursor-pointer"
                onClick={() => navigate(`/product/${p.id}`)}
              >
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                {isTopSeller && (
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider">
                    Top Seller
                  </span>
                )}
              </div>

              {/* Right: Details and Actions */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                {/* Info */}
                <div className="cursor-pointer" onClick={() => navigate(`/product/${p.id}`)}>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1 leading-snug hover:text-blue-900 pr-6">
                    {p.name}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {p.category || "Industrial Grade"}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] font-semibold text-slate-700 truncate">{p.company_name}</span>
                    <CheckCircle size={10} className="text-blue-600 fill-blue-50 shrink-0" />
                  </div>
                  {p.location && (
                    <div className="flex items-center gap-0.5 text-[9px] text-slate-400 mt-0.5">
                      <MapPin size={9} className="shrink-0" />
                      <span className="truncate">{p.location}</span>
                    </div>
                  )}
                  <div className="font-display font-extrabold text-blue-900 text-xs sm:text-sm mt-1">
                    {p.price || "On Request"}
                  </div>
                </div>

                {/* Quick Actions Row */}
                <div className="flex gap-1.5 mt-2">
                  <button
                    onClick={() => navigate(`/product/${p.id}`)}
                    className="flex-1 py-1 border border-slate-200 text-slate-700 hover:bg-slate-50 text-[10px] font-bold rounded-lg text-center transition-colors"
                  >
                    Enquiry
                  </button>
                  <button
                    onClick={() => {
                      addToCart(p);
                      navigate("/cart");
                    }}
                    className="flex-1 py-1 bg-blue-900 hover:bg-blue-950 text-white text-[10px] font-extrabold rounded-lg text-center transition-colors shadow-sm"
                    data-testid={`product-mobile-buynow-${p.id}`}
                  >
                    Buy Now
                  </button>
                  <a
                    href={whatsappLink(p.whatsapp || "+919876543210", `Hi, interested in ${p.name}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1 px-2 bg-[#25D366] hover:bg-[#20bd5a] text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-0.5 transition-colors shrink-0"
                    title="WhatsApp"
                  >
                    <MessageSquare size={10} className="shrink-0" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Products Grid (hidden sm:grid) */}
      <div className="hidden sm:grid mt-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-sm text-slate-500 py-8 bg-white border border-slate-100 rounded-2xl">
            No products found.
          </div>
        )}
        {filtered.map((p) => (
          <div
            key={p.id}
            className="group flex flex-col h-full bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-blue-200 transition-all duration-200 shadow-sm"
            data-testid={`product-${p.id}`}
          >
            {/* Product Image and detail modal trigger */}
            <div className="relative aspect-square w-full overflow-hidden bg-slate-50 cursor-pointer" onClick={() => navigate(`/product/${p.id}`)}>
              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              {/* Stock Left / In Stock badge */}
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase tracking-wider">
                {p.stock_left !== undefined && p.stock_left !== null ? `Qty: ${p.stock_left}` : "In Stock"}
              </span>
            </div>

            <div className="p-3 flex-grow flex flex-col justify-between">
              <div>
                <div onClick={() => navigate(`/product/${p.id}`)} className="font-semibold text-xs sm:text-sm text-slate-900 hover:text-blue-900 cursor-pointer line-clamp-2 leading-snug min-h-[2.5rem]">
                  {p.name}
                </div>
                <Link to={`/company/${p.company_id}`} className="text-[10px] text-slate-400 hover:text-blue-900 font-bold truncate block mt-1">
                  {p.company_name}
                </Link>
                {p.location && (
                  <div className="flex items-center gap-0.5 text-[10px] text-slate-500 mt-1 font-medium">
                    <MapPin size={10} className="text-slate-400" />
                    <span>{p.location}</span>
                  </div>
                )}
              </div>

              {/* Price and Buy Now action */}
              <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between gap-1">
                <div>
                  <div className="font-display font-extrabold text-blue-900 text-xs sm:text-sm">
                    {p.price || "On Request"}
                  </div>
                  {p.moq && (
                    <div className="text-[9px] text-slate-400 font-medium">MOQ: {p.moq}</div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      addToCart(p);
                      navigate("/cart");
                    }}
                    className="px-2.5 py-1 rounded-lg bg-blue-900 hover:bg-blue-950 text-white text-[10px] font-extrabold transition-colors shadow-sm"
                    data-testid={`product-buynow-${p.id}`}
                  >
                    Buy Now
                  </button>
                  <button
                    onClick={() => addToCart(p)}
                    className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white transition-colors"
                    title="Add to Cart"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>



      {/* CART & BUYING FLOW MODAL */}
      {buyingStep && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center sm:items-center p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl p-5 border border-slate-100 animate-in slide-in-from-bottom duration-250 relative">
            
            {/* Modal Header */}
            {buyingStep !== "processing" && (
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-display font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Award className="text-blue-900" size={18} />
                  {buyingStep === "cart" && "My Cart"}
                  {buyingStep === "delivery" && "Select Delivery Option"}
                  {buyingStep === "checkout" && "Checkout"}
                  {buyingStep === "payment" && "Choose Payment"}
                  {buyingStep === "confirmed" && "Order Confirmed!"}
                </h3>
                <button
                  onClick={() => setBuyingStep(null)}
                  className="p-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* STEP 1: MY CART */}
            {buyingStep === "cart" && (
              <div>
                {cart.length === 0 ? (
                  <div className="text-center py-10">
                    <ShoppingCart size={40} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">Your cart is empty.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl bg-slate-50">
                        <img src={item.image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-white" />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate">{item.name}</div>
                          <div className="text-[10px] text-slate-400">{item.company_name}</div>
                          <div className="font-display font-bold text-blue-900 text-xs mt-1">{item.price || "On Request"}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCartQty(item.id, -1)}
                            className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-200"
                          >
                            <Minus size={10} />
                          </button>
                          <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                          <button
                            onClick={() => updateCartQty(item.id, 1)}
                            className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-200"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Summary */}
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Subtotal</span>
                        <span>₹{cartSubtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>GST (18%)</span>
                        <span>₹{gstCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-dashed border-slate-200 pt-2">
                        <span>Estimated Total</span>
                        <span>₹{cartTotal.toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setBuyingStep("delivery")}
                      className="w-full mt-4 py-3 rounded-xl bg-blue-900 text-white font-extrabold text-xs flex items-center justify-center gap-1 hover:bg-blue-950 shadow-md active:scale-95 transition-all"
                    >
                      Choose Delivery Options <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: DELIVERY OPTIONS */}
            {buyingStep === "delivery" && (
              <div className="space-y-3">
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Delivery preferences</div>
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {Object.entries(deliveryOptions).map(([key, opt]) => (
                    <label
                      key={key}
                      onClick={() => setSelectedDelivery(key)}
                      className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                        selectedDelivery === key
                          ? "border-blue-900 bg-blue-50/50 shadow-sm"
                          : "border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="delivery"
                        checked={selectedDelivery === key}
                        onChange={() => {}}
                        className="mt-0.5 text-blue-900 focus:ring-blue-900"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs text-slate-900">{opt.label}</span>
                          <span className="font-display font-extrabold text-xs text-blue-900">
                            {opt.cost === 0 ? "FREE" : `₹${opt.cost}`}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{opt.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  onClick={() => setBuyingStep("checkout")}
                  className="w-full mt-4 py-3 rounded-xl bg-blue-900 text-white font-extrabold text-xs flex items-center justify-center gap-1 hover:bg-blue-950 shadow-md active:scale-95 transition-all"
                >
                  Proceed to Checkout <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* STEP 3: CHECKOUT */}
            {buyingStep === "checkout" && (
              <div className="space-y-4">
                {/* Deliver To */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Deliver To</span>
                    <button className="text-[10px] font-bold text-blue-900 hover:underline">Change</button>
                  </div>
                  <div className="flex gap-2">
                    <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-xs text-slate-900">Rahul Sharma</div>
                      <div className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                        Peenya Industrial Area, Bengaluru, Karnataka - 560058
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery details preview */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                  <Truck size={18} className="text-blue-900" />
                  <div>
                    <div className="font-bold text-xs text-slate-900">Delivery Preference</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{deliveryOptions[selectedDelivery].label}</div>
                  </div>
                </div>

                {/* Price Details */}
                <div className="border border-slate-100 rounded-xl p-3 bg-white space-y-2">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-50 pb-2 mb-1">
                    Price Details
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Items Price ({cart.reduce((sum, item) => sum + item.qty, 0)})</span>
                    <span>₹{cartSubtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Delivery Charges</span>
                    <span>{deliveryCost === 0 ? "FREE" : `₹${deliveryCost}`}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>GST (18%)</span>
                    <span>₹{gstCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-dashed border-slate-200 pt-2">
                    <span>Final Payable</span>
                    <span>₹{cartTotal.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => setBuyingStep("payment")}
                  className="w-full py-3 rounded-xl bg-blue-900 text-white font-extrabold text-xs flex items-center justify-center gap-1 hover:bg-blue-950 shadow-md active:scale-95 transition-all"
                >
                  Continue to Payment <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* STEP 4: PAYMENT */}
            {buyingStep === "payment" && (
              <div className="space-y-4">
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Select payment method</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedPayment("upi")}
                    className={`p-3 border rounded-xl flex items-center gap-2 transition-all text-xs font-bold ${
                      selectedPayment === "upi" ? "border-blue-900 bg-blue-50/50 text-blue-900" : "border-slate-100"
                    }`}
                  >
                    <CreditCard size={14} /> UPI
                  </button>
                  <button
                    onClick={() => setSelectedPayment("card")}
                    className={`p-3 border rounded-xl flex items-center gap-2 transition-all text-xs font-bold ${
                      selectedPayment === "card" ? "border-blue-900 bg-blue-50/50 text-blue-900" : "border-slate-100"
                    }`}
                  >
                    <CreditCard size={14} /> Card (Debit/Credit)
                  </button>
                </div>

                {selectedPayment === "upi" && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                    <div className="text-center font-bold text-xs text-slate-800">Scan QR Code or Enter UPI ID</div>
                    {/* Mock QR image */}
                    <div className="w-32 h-32 mx-auto bg-white border border-slate-200 p-2 flex items-center justify-center">
                      <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=upi://pay?pa=rahulsharma@upi" alt="UPI QR" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Enter UPI ID</label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="yourname@upi"
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {selectedPayment === "card" && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2.5">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Card Number</label>
                      <input type="text" placeholder="XXXX XXXX XXXX XXXX" className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Expiry</label>
                        <input type="text" placeholder="MM/YY" className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs text-center" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">CVV</label>
                        <input type="password" placeholder="***" className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs text-center" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Pay button */}
                <button
                  onClick={handlePaymentConfirm}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-extrabold text-xs hover:bg-emerald-700 shadow-md active:scale-95 transition-all flex items-center justify-center gap-1"
                >
                  Pay Securely ₹{cartTotal.toLocaleString()}
                </button>
              </div>
            )}

            {/* STEP 5: PAYMENT PROCESSING */}
            {buyingStep === "processing" && (
              <div className="py-8 text-center space-y-4">
                <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div>
                  <h4 className="font-display font-extrabold text-slate-900 text-sm">Verifying Payment...</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Connecting to bank, verifying payment details.</p>
                </div>
                <div className="max-w-[200px] mx-auto text-[9px] text-slate-400 bg-slate-50 py-1.5 px-3 rounded-full border border-slate-100 flex items-center justify-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-600" /> Secure Payment Gateway
                </div>
              </div>
            )}

            {/* STEP 6: ORDER CONFIRMED */}
            {buyingStep === "confirmed" && (
              <div className="py-2 text-center space-y-4">
                {/* Green check anim */}
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle size={32} className="fill-emerald-100" />
                </div>
                <div>
                  <h3 className="font-display font-black text-slate-900 text-lg">Order Confirmed!</h3>
                  <p className="text-xs text-slate-500 mt-1">Your order has been placed successfully.</p>
                </div>

                {/* Details list */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 text-left space-y-2">
                  <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Order ID</span>
                    <span className="font-mono font-bold text-slate-800">#IIP30240528001</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Order Date</span>
                    <span className="font-bold text-slate-800">28 May 2026, 11:30 AM</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Payment Method</span>
                    <span className="font-bold text-slate-800 uppercase">{selectedPayment}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Total Paid</span>
                    <span className="font-bold text-slate-900 font-display">₹{cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Expected Delivery</span>
                    <span className="font-bold text-slate-800">
                      {selectedDelivery === "express" ? "Within 90 Minutes" : "Within 2-3 Days"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    onClick={() => {
                      clearCart();
                      setBuyingStep(null);
                      navigate("/orders");
                    }}
                    className="py-3 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs"
                  >
                    My Orders
                  </button>
                  <button
                    onClick={() => {
                      clearCart();
                      setBuyingStep(null);
                    }}
                    className="py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
