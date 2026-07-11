import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Briefcase, MapPin, Clock, IndianRupee, Settings, ChevronRight } from "lucide-react";
import { BackButton } from "../components/BackButton";
import { toast } from "sonner";

export default function MyVacanciesPage() {
  const { user, loading } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [fetching, setFetching] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.company_id) {
      api.get("/jobs/my")
        .then((r) => setJobs(r.data))
        .catch(() => toast.error("Failed to load vacancies"))
        .finally(() => setFetching(false));
    } else if (user) {
      setFetching(false);
    }
  }, [user]);

  if (loading || fetching) {
    return <div className="p-10 text-center text-slate-400 font-semibold">Loading...</div>;
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  const isBusiness = user.role === "manufacturer" || user.role === "supplier" || user.role === "admin";
  if (!isBusiness) {
    return (
      <div className="pb-28 px-4 pt-8 text-center max-w-md mx-auto">
        <BackButton className="mb-4" />
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <Briefcase size={48} className="mx-auto text-slate-400 mb-4" />
          <h2 className="text-lg font-bold text-slate-950">Access Denied</h2>
          <p className="text-xs text-slate-500 mt-2">Only manufacturers and suppliers can list and manage vacancies.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28 px-4 pt-4" data-testid="my-vacancies-page">
      <BackButton className="mb-2" />

      {/* Header Section */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-black text-slate-950">My Vacancies</h1>
          <p className="text-xs text-slate-500 mt-0.5">Listed openings for your business</p>
        </div>
        <button
          onClick={() => navigate("/manage-vacancies")}
          data-testid="manage-vacancies-btn"
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md transition-colors"
        >
          <Settings size={14} /> Manage
        </button>
      </div>

      {/* Vacancies List */}
      <div className="mt-6 space-y-4">
        {jobs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
            <Briefcase size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-900">No jobs posted yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">List your open industrial positions to find matching candidates in India's engineering marketplace.</p>
            <button
              onClick={() => navigate("/manage-vacancies")}
              className="mt-4 px-5 py-2 rounded-full bg-[#0F294A] text-white text-xs font-bold hover:bg-[#0A1D36] transition-colors"
            >
              Post a Vacancy
            </button>
          </div>
        ) : (
          jobs.map((j) => (
            <article 
              key={j.id} 
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between"
              data-testid={`my-job-item-${j.id}`}
            >
              <div>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-display font-bold text-base text-slate-900">{j.title}</h3>
                    <p className="text-xs text-slate-500 font-semibold">{j.company_name}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-800 shrink-0">
                    {j.type}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">{j.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><MapPin size={12} /> {j.location}</span>
                  {j.salary && <span className="inline-flex items-center gap-1"><IndianRupee size={12} /> {j.salary}</span>}
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium"><Clock size={12} /> {j.posted}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
