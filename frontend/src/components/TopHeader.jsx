import React from "react";
import { Link } from "react-router-dom";
import { Bell, Search, Bookmark, User, MessageSquare } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "../context/AuthContext";

export const TopHeader = () => {
  const { user } = useAuth();

  return (
    <header
      className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200"
      data-testid="top-header"
    >
      <div className="max-w-md md:max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 lg:px-8 h-14 lg:h-16 flex items-center justify-between">
        <Link to="/" data-testid="header-logo-link" className="flex-shrink-0">
          <div className="lg:scale-110 origin-left">
            <Logo />
          </div>
        </Link>

        <div className="flex items-center gap-1 lg:gap-3">
          <Link to="/search" className="p-2 lg:p-3 text-slate-600 hover:text-blue-800 transition-colors" data-testid="header-search"><Search size={22} /></Link>
          <Link to="/bookmarks" className="p-2 lg:p-3 text-slate-600 hover:text-blue-800 transition-colors" data-testid="header-bookmarks"><Bookmark size={22} /></Link>
          <Link
            to={user ? "/chats" : "/login"}
            className="p-2 lg:p-3 text-slate-600 hover:text-blue-800 transition-colors"
            data-testid="header-chats"
          >
            <MessageSquare size={22} />
          </Link>
          <Link
            to={user ? "/notifications" : "/login"}
            className="relative p-2 lg:p-3 text-slate-600 hover:text-blue-800 transition-colors"
            data-testid="header-notifications"
          >
            <Bell size={22} />
            <span className="absolute top-1 right-1 lg:top-2 lg:right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[8px] font-bold text-white ring-2 ring-white">
              3
            </span>
          </Link>
          <Link
            to={user ? "/profile" : "/login"}
            className="ml-1 inline-flex items-center justify-center w-9 h-9 lg:w-11 lg:h-11 rounded-full bg-blue-800 text-white hover:bg-blue-900 transition-colors overflow-hidden ring-2 ring-blue-50"
            data-testid="header-profile-btn"
          >
            {user && user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={20} />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
};
