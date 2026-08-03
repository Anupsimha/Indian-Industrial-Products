import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Film, PlusSquare, Package, Inbox, FileText, X, Briefcase, ListTodo, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { PostDialog, ReelDialog, JobDialog } from "./CreateDialogs";
import { ProductDialog } from "./ProductDialog";

export const BottomNav = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [promptOpen, setPromptOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [reelOpen, setReelOpen] = useState(false);
  const [jobOpen, setJobOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);

  const isBuyer = user && user.role === "buyer";
  const navItems = [
    { to: "/", label: "Home", icon: Home, testid: "nav-home" },
    { to: "/reels", label: "Reels", icon: Film, testid: "nav-reels" },
    { to: "/post-enquiry", label: "Post", icon: PlusSquare, testid: "nav-post", isCenter: true },
    { to: "/products", label: "Products", icon: Package, testid: "nav-products" },
    isBuyer
      ? { to: "/requirements", label: "My Requirements", icon: Inbox, testid: "nav-requirements" }
      : { to: "/leads", label: "Leads", icon: Inbox, testid: "nav-leads" },
  ];

  const handlePostClick = (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to post");
      navigate("/login");
      return;
    }
    if (user.role !== "manufacturer" && user.role !== "supplier" && user.role !== "buyer") {
      toast.error("Access Denied: Only Manufacturers, Sellers and Buyers can create posts/requirements.");
      return;
    }
    if (user.role === "buyer") {
      navigate("/post-enquiry");
      return;
    }
    setPromptOpen(true);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 inset-x-0 z-40 backdrop-blur-md bg-white/95 border-t border-slate-200"
        data-testid="bottom-nav"
      >
        <div className="max-w-md md:max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto">
          <ul className="grid grid-cols-5 lg:flex lg:justify-evenly lg:items-center lg:h-20">
            {navItems.map(({ to, label, icon: Icon, testid, isCenter }) => {
              const requiresAuth = (to === "/leads" || to === "/requirements") && !user;

              if (isCenter) {
                return (
                  <li key={to} className="flex-1">
                    <button
                      onClick={handlePostClick}
                      data-testid={testid}
                      className="w-full flex flex-col items-center justify-center py-2.5 lg:py-3 gap-1 transition-all text-slate-500 hover:text-blue-800"
                    >
                      <span className="grid place-items-center w-11 h-11 lg:w-14 lg:h-14 lg:-mt-7 -mt-5 rounded-full bg-orange-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
                        <Icon size={26} />
                      </span>
                      <span className="text-[10px] lg:text-xs font-semibold">{label}</span>
                    </button>
                  </li>
                );
              }

              return (
                <li key={to} className="flex-1">
                  <NavLink
                    to={requiresAuth ? "/login" : to}
                    end={to === "/"}
                    data-testid={testid}
                    className={({ isActive }) =>
                      `flex flex-col items-center justify-center py-2.5 lg:py-3 gap-1 transition-all ${isActive && !requiresAuth ? "text-blue-800" : "text-slate-500 hover:text-blue-800"
                      }`
                    }
                  >
                    <Icon size={22} />
                    <span className="text-[10px] lg:text-xs font-semibold">{label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Post Type Prompt Modal */}
      {promptOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPromptOpen(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            data-testid="post-prompt-modal"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-bold text-lg text-slate-900">Create New</h3>
              <button onClick={() => setPromptOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {user?.role === "buyer" ? (
                <button
                  onClick={() => {
                    setPromptOpen(false);
                    navigate("/post-enquiry");
                  }}
                  data-testid="prompt-requirement-btn"
                  className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl hover:border-orange-500 hover:bg-orange-50/50 transition-all group text-left col-span-2"
                >
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mb-1.5 text-orange-700 group-hover:scale-110 transition-transform">
                    <ListTodo size={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Post Requirement</span>
                  <span className="text-[9px] text-slate-500 text-center mt-0.5 leading-tight">What products do you need?</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setPromptOpen(false);
                      setPostOpen(true);
                    }}
                    data-testid="prompt-feed-btn"
                    className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 transition-all group text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-1.5 text-blue-700 group-hover:scale-110 transition-transform">
                      <FileText size={20} />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Feed Post</span>
                    <span className="text-[9px] text-slate-500 text-center mt-0.5 leading-tight">Images, text updates</span>
                  </button>

                  <button
                    onClick={() => {
                      setPromptOpen(false);
                      setReelOpen(true);
                    }}
                    data-testid="prompt-video-btn"
                    className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl hover:border-orange-500 hover:bg-orange-50/50 transition-all group text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mb-1.5 text-orange-700 group-hover:scale-110 transition-transform">
                      <Film size={20} />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Video / Reel</span>
                    <span className="text-[9px] text-slate-500 text-center mt-0.5 leading-tight">Short product videos</span>
                  </button>

                  <button
                    onClick={() => {
                      setPromptOpen(false);
                      setJobOpen(true);
                    }}
                    data-testid="prompt-job-btn"
                    className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-1.5 text-emerald-700 group-hover:scale-110 transition-transform">
                      <Briefcase size={20} />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Job Vacancy</span>
                    <span className="text-[9px] text-slate-500 text-center mt-0.5 leading-tight">List job openings</span>
                  </button>

                  <button
                    onClick={() => {
                      if (user?.role !== "manufacturer" && user?.role !== "supplier") {
                        toast.error("Access Denied: Only Manufacturers and Sellers can publish products.");
                        return;
                      }
                      setPromptOpen(false);
                      setProductOpen(true);
                    }}
                    data-testid="prompt-product-btn"
                    className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mb-1.5 text-indigo-700 group-hover:scale-110 transition-transform">
                      <Package size={20} />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Products</span>
                    <span className="text-[9px] text-slate-500 text-center mt-0.5 leading-tight">Publish new product</span>
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setPromptOpen(false)}
              className="w-full mt-4 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Creation Dialogs */}
      <PostDialog open={postOpen} onClose={() => setPostOpen(false)} onSaved={() => toast.success("Feed post created!")} />
      <ReelDialog open={reelOpen} onClose={() => setReelOpen(false)} onSaved={() => toast.success("Video reel uploaded!")} />
      <JobDialog open={jobOpen} onClose={() => setJobOpen(false)} onSaved={() => toast.success("Job vacancy published!")} />
      <ProductDialog open={productOpen} onClose={() => setProductOpen(false)} onSaved={() => toast.success("Product published successfully!")} />
    </>
  );
};
