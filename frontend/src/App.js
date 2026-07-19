import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { InstallAppBanner } from "@/components/InstallAppBanner";
import { TopHeader } from "@/components/TopHeader";
import { BottomNav } from "@/components/BottomNav";

import HomePage from "@/pages/HomePage";
import ReelsPage from "@/pages/ReelsPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import PostEnquiryPage from "@/pages/PostEnquiryPage";
import LeadsPage from "@/pages/LeadsPage";
import ProfilePage from "@/pages/ProfilePage";
import CompanyDetailPage from "@/pages/CompanyDetailPage";
import PricingPage from "@/pages/PricingPage";
import NotificationsPage from "@/pages/NotificationsPage";
import BookmarksPage from "@/pages/BookmarksPage";
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

const Layout = ({ children }) => {
  const location = useLocation();
  const fullscreen = location.pathname.startsWith("/reels")
    || location.pathname.startsWith("/login")
    || location.pathname.startsWith("/register");

  if (fullscreen) {
    return <div className="App">{children}{location.pathname.startsWith("/reels") && <BottomNav />}</div>;
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-slate-50">
      <TopHeader />
      <main className="flex-1 overflow-y-auto w-full max-w-md md:max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto pb-24">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Toaster position="top-center" richColors />
          <InstallAppBanner />
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/reels" element={<ReelsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/post-enquiry" element={<PostEnquiryPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/company/:id" element={<CompanyDetailPage />} />
              <Route path="/companies" element={<CompaniesPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
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
            </Routes>
          </Layout>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
