import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const BackButton = ({ label, className = "", testid = "back-btn", fallback = "/" }) => {
  const navigate = useNavigate();
  const go = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallback);
  };
  return (
    <button
      onClick={go}
      data-testid={testid}
      className={`inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-blue-800 active:scale-95 transition-all ${className}`}
    >
      <ArrowLeft size={18} /> {label || "Back"}
    </button>
  );
};
