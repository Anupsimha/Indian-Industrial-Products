import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Search, Bookmark, User, MessageSquare, ShoppingCart, Settings, Crown, Newspaper } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { PlanBadge } from "./PlanBadge";
import { toast } from "sonner";

export const TopHeader = () => {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleProfileClick = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setDropdownOpen(!dropdownOpen);
  };

  const isBuyer = user && user.role === "buyer";
  const isSeller = user && (user.role === "manufacturer" || user.role === "supplier");

  return (
    <header
      className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200"
      data-testid="top-header"
    >
      <div className="max-w-md md:max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 h-14 lg:h-16 flex items-center justify-between">
        <Link to="/" data-testid="header-logo-link" className="flex-shrink-0">
          <div className="lg:scale-110 origin-left">
            <Logo />
          </div>
        </Link>
        <div ref={dropdownRef} className="relative">
            <button
              onClick={handleProfileClick}
              className="ml-1 inline-flex items-center justify-center w-9 h-9 lg:w-11 lg:h-11 rounded-full bg-blue-800 text-white hover:bg-blue-900 transition-colors overflow-hidden ring-2 ring-blue-50"
              data-testid="header-profile-btn"
            >
              {user && user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={20} />
              )}
            </button>

            {/* Click-outside backdrop */}
            {user && dropdownOpen && (
              <div
                className="fixed inset-0 z-40 bg-transparent"
                onClick={() => setDropdownOpen(false)}
              />
            )}

            {/* Dropdown Menu */}
            {user && dropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-3 duration-150 overflow-hidden"
                data-testid="profile-dropdown"
              >
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 mb-1">
                  <div className="font-bold text-xs text-slate-900 truncate">{user.name}</div>
                  <div className="mt-1 flex items-center gap-1">
                    <PlanBadge plan={user.plan_name} size="xs" />
                  </div>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  Profile
                </Link>

                {user.role !== "admin" && (
                  <Link
                    to="/membership"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2 text-xs font-bold text-amber-800 bg-amber-50/80 hover:bg-amber-100/80 transition-colors"
                    data-testid="dropdown-membership-link"
                  >
                    <div className="flex items-center gap-2">
                      <Crown size={15} className="text-amber-600 shrink-0" />
                      <span>Manage Membership</span>
                    </div>
                  </Link>
                )}

                <Link
                  to="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  data-testid="dropdown-settings-link"
                >
                  <div className="flex items-center gap-2">
                    <span>Settings</span>
                  </div>
                </Link>

                {/* Mobile-only Search for Buyer */}
                {isBuyer && (
                  <Link
                    to="/search"
                    onClick={() => setDropdownOpen(false)}
                    className="block md:hidden px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    Search Products
                  </Link>
                )}

                {/* Mobile-only Cart */}
                <Link
                  to="/cart"
                  onClick={() => setDropdownOpen(false)}
                  className="block md:hidden px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span>Cart</span>
                    {cartCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-orange-600 text-[9px] font-bold text-white leading-none">
                        {cartCount}
                      </span>
                    )}
                  </div>
                </Link>

                {/* Mobile-only Chat */}
                <Link
                  to="/chats"
                  onClick={() => setDropdownOpen(false)}
                  className="block md:hidden px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  Chats / Messages
                </Link>

                <Link
                  to="/orders"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  My Orders
                </Link>

                {/* Manufacturer/Seller role checks */}
                {(user.role === "manufacturer" || user.role === "supplier") && (
                  <>
                    <Link
                      to="/leads"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      My Leads
                    </Link>
                    <Link
                      to="/my-vacancies"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      My Vacancies
                    </Link>
                  </>
                )}

                <Link
                  to="/bookmarks"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  Saved
                </Link>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    toast.success("Analytics dashboard coming soon!");
                  }}
                  className="w-full text-left block px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  Analytics
                </button>
                <hr className="my-1 border-slate-100" />
                <div className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Help &amp; Legal</div>
                <Link
                  to="/contact"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  data-testid="header-dropdown-contact"
                >
                  Contact Support
                </Link>
                <Link
                  to="/terms"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  data-testid="header-dropdown-terms"
                >
                  Terms &amp; Conditions
                </Link>
                <Link
                  to="/privacy"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  data-testid="header-dropdown-privacy"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/refund-policy"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  data-testid="header-dropdown-refund"
                >
                  Refund &amp; Shipping Policy
                </Link>
                <hr className="my-1 border-slate-100" />
                <button

                  onClick={async () => {
                    setDropdownOpen(false);
                    await logout();
                    navigate("/");
                  }}
                  className="w-full text-left block px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                  data-testid="dropdown-logout-btn"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        <div className="flex items-center gap-1 lg:gap-3">
          <Link
            to="/search"
            className={`p-2 lg:p-3 text-slate-600 hover:text-blue-800 transition-colors ${isBuyer ? "hidden md:block" : "block"}`}
            data-testid="header-search"
          >
            <Search size={22} />
          </Link>

          {/* Cart Button with Badge */}
          <Link
            to="/cart"
            className={`relative p-2 lg:p-3 text-slate-600 hover:text-blue-800 transition-colors ${user ? "hidden md:block" : "block"}`}
            data-testid="header-cart"
          >
            <ShoppingCart size={22} />
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 lg:top-2 lg:right-2 flex h-4 w-4 items-center justify-center rounded-full bg-orange-600 text-[8px] font-bold text-white ring-2 ring-white animate-pulse">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>

          <Link
            to={user ? "/chats" : "/login"}
            className={`p-2 lg:p-3 text-slate-600 hover:text-blue-800 transition-colors ${user ? "hidden md:block" : "block"}`}
            data-testid="header-chats"
          >
            <MessageSquare size={22} />
          </Link>
          <Link
            to="/news"
            className="p-2 lg:p-3 text-slate-600 hover:text-blue-800 transition-colors block"
            data-testid="header-news"
            title="Industrial News Feed"
          >
            <Newspaper size={22} />
          </Link>
          <Link
            to="/bookmarks"
            className="p-2 lg:p-3 text-slate-600 hover:text-blue-800 transition-colors block"
            data-testid="header-bookmarks"
            title="Bookmarks"
          >
            <Bookmark size={22} />
          </Link>
          <Link
            to={user ? "/notifications" : "/login"}
            className="relative p-2 lg:p-3 text-slate-600 hover:text-blue-800 transition-colors block"
            data-testid="header-notifications"
          >
            <Bell size={22} />
            <span className="absolute top-1 right-1 lg:top-2 lg:right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[8px] font-bold text-white ring-2 ring-white">
              3
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
};
