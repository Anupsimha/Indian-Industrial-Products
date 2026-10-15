import React from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { SupportContactProvider } from "@/context/SupportContactContext";
import { LeadInterestProvider } from "@/context/LeadInterestContext";
import { InstallAppBanner } from "@/components/InstallAppBanner";
import { LeadInterestConfirmModal } from "@/components/LeadInterestConfirmModal";

import { TopHeader } from "@/components/TopHeader";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";


import HomePage from "@/pages/HomePage";
import ReelsPage from "@/pages/ReelsPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import VerifyOtpPage from "@/pages/VerifyOtpPage";
import CompleteProfilePage from "@/pages/CompleteProfilePage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import AccountSecurityPage from "@/pages/AccountSecurityPage";
import { AdminSetupModal } from "@/components/AdminSetupModal";
import PostEnquiryPage from "@/pages/PostEnquiryPage";
import LeadsPage from "@/pages/LeadsPage";
import ProfilePage from "@/pages/ProfilePage";
import CompanyDetailPage from "@/pages/CompanyDetailPage";
import PricingPage from "@/pages/PricingPage";
import NotificationsPage from "@/pages/NotificationsPage";
import BookmarksPage from "@/pages/BookmarksPage";
import NewsPage from "@/pages/NewsPage";
import SearchPage from "@/pages/SearchPage";
import CompaniesPage from "@/pages/CompaniesPage";
import ProductsPage from "@/pages/ProductsPage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import JobsPage from "@/pages/JobsPage";
import AdminPage from "@/pages/AdminPage";
import RequirementsPage from "@/pages/RequirementsPage";
import MyVacanciesPage from "@/pages/MyVacanciesPage";
import ManageVacanciesPage from "@/pages/ManageVacanciesPage";
import ChatsPage from "@/pages/ChatsPage";
import ChatWindowPage from "@/pages/ChatWindowPage";
import CartPage from "@/pages/CartPage";
import OrdersPage from "@/pages/OrdersPage";
import SettingsPage from "@/pages/SettingsPage";
import MembershipPage from "@/pages/MembershipPage";
import IndustrialGroupsPage from "@/pages/IndustrialGroupsPage";
import IndustrialGroupDetailPage from "@/pages/IndustrialGroupDetailPage";
import ContactUsPage from "@/pages/ContactUsPage";
import TermsAndConditionsPage from "@/pages/TermsAndConditionsPage";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import RefundPolicyPage from "@/pages/RefundPolicyPage";
import TenantWebsitePage from "@/pages/TenantWebsitePage";

const Layout = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [adminSetupClosed, setAdminSetupClosed] = React.useState(false);
  const mainRef = React.useRef(null);

  React.useEffect(() => {
    window.scrollTo(0, 0);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname, location.search]);

  const isSiteRoute = location.pathname.startsWith("/site");
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const hostParts = hostname.split(".");
  const isTenantSubdomain = hostParts.length > 2 && !["www", "staging", "billing", "api", "localhost", "127"].includes(hostParts[0]);

  if (isTenantSubdomain || isSiteRoute) {
    return (
      <div className="min-h-screen bg-slate-950">
        {isTenantSubdomain && (location.pathname === "/" || location.pathname === "/site") ? (
          <TenantWebsitePage />
        ) : (
          children
        )}
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const fullscreen = location.pathname.startsWith("/reels")
    || location.pathname.startsWith("/login")
    || location.pathname.startsWith("/register")
    || location.pathname.startsWith("/verify-otp")
    || location.pathname.startsWith("/complete-profile")
    || location.pathname.startsWith("/forgot-password");

  if (!isAdmin && user && user.is_verified === false && !fullscreen) {
    return <Navigate to="/verify-otp" replace />;
  }

  return (
    <div className={fullscreen ? "App" : "flex flex-col h-[100dvh] overflow-hidden bg-slate-50"}>
      {!fullscreen && <TopHeader />}
      <main ref={mainRef} className={fullscreen ? "" : "flex-1 overflow-y-auto w-full max-w-md md:max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto pb-24"}>
        {children}
        {!fullscreen && <Footer />}
      </main>

      {(!fullscreen || location.pathname.startsWith("/reels")) && <BottomNav />}

      {/* Mandatory Admin Security Setup Prompt */}
      {isAdmin && !user?.admin_setup_completed && !adminSetupClosed && (
        <AdminSetupModal open={true} onClose={() => setAdminSetupClosed(true)} />
      )}
    </div>
  );
};

function App() {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const hostParts = hostname.split(".");
  const isTenantSubdomain = hostParts.length > 2 && !["www", "staging", "billing", "api", "localhost", "127"].includes(hostParts[0]);

  // If visitor is on a custom tenant website subdomain (e.g. https://sample.indianindustrialplatform.com),
  // render the standalone, public landing page directly with NO authentication required!
  if (isTenantSubdomain) {
    return (
      <BrowserRouter>
        <div className="min-h-screen bg-slate-950">
          <TenantWebsitePage />
        </div>
      </BrowserRouter>
    );
  }

  return (
    <AuthProvider>
      <SupportContactProvider>
        <CartProvider>
          <LeadInterestProvider>
            <BrowserRouter>
              <Toaster position="top-center" richColors />
              <InstallAppBanner />
              <LeadInterestConfirmModal />
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/reels" element={<ReelsPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/verify-otp" element={<VerifyOtpPage />} />
                  <Route path="/complete-profile" element={<CompleteProfilePage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/account-security" element={<AccountSecurityPage />} />
                  <Route path="/post-enquiry" element={<PostEnquiryPage />} />
                  <Route path="/leads" element={<LeadsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/company/:id" element={<CompanyDetailPage />} />
                  <Route path="/companies" element={<CompaniesPage />} />
                  <Route path="/industrial-groups" element={<IndustrialGroupsPage />} />
                  <Route path="/industrial-groups/:id" element={<IndustrialGroupDetailPage />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/membership" element={<MembershipPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/news" element={<NewsPage />} />
                  <Route path="/bookmarks" element={<BookmarksPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/product/:id" element={<ProductDetailPage />} />
                  <Route path="/jobs" element={<JobsPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/requirements" element={<RequirementsPage />} />
                  <Route path="/my-vacancies" element={<MyVacanciesPage />} />
                  <Route path="/manage-vacancies" element={<ManageVacanciesPage />} />
                  <Route path="/chats" element={<ChatsPage />} />
                  <Route path="/chat/:id" element={<ChatWindowPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/contact" element={<ContactUsPage />} />
                  <Route path="/terms" element={<TermsAndConditionsPage />} />
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/refund-policy" element={<RefundPolicyPage />} />
                  <Route path="/site/:subdomain" element={<TenantWebsitePage />} />
                  <Route path="/site" element={<TenantWebsitePage />} />
                </Routes>
              </Layout>
            </BrowserRouter>
          </LeadInterestProvider>
        </CartProvider>
      </SupportContactProvider>
    </AuthProvider>
  );
}

export default App;
