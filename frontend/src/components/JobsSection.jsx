import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, MapPin, Clock, ArrowRight } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { ApplyJobDialog } from "./ApplyJobDialog";

export const JobsSection = ({ isSidebar = false }) => {
  const [jobs, setJobs] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    api.get("/jobs").then((r) => setJobs(r.data)).catch(() => {});
  }, []);

  const handleApplyClick = (j) => {
    if (!user) {
      toast.error("Please login to apply");
      navigate("/login");
      return;
    }
    if (user?.company_id && user.company_id === j.company_id) {
      toast.error("You cannot apply to your own job vacancy");
      return;
    }
    setSelectedJob(j);
    setApplyOpen(true);
  };

  if (!jobs.length) return null;

  return (
    <section className={`mt-5 ${isSidebar ? "px-0" : "px-4"}`} data-testid="jobs-section">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="grid place-items-center w-7 h-7 rounded-lg bg-orange-100 text-orange-600">
            <Briefcase size={14} />
          </span>
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-slate-700">Jobs / Vacancies</h3>
        </div>
        <Link to="/jobs" className="text-xs font-semibold text-blue-800" data-testid="see-all-jobs-btn">View all</Link>
      </div>
      <div className={isSidebar ? "flex flex-col gap-3" : "flex gap-3 overflow-x-auto no-scrollbar pb-2"}>
        {jobs.slice(0, 5).map((j) => (
          <article
            key={j.id}
            className={`bg-white border border-slate-200 rounded-xl p-3 hover:border-blue-300 hover:shadow-md transition-all ${
              isSidebar ? "w-full" : "shrink-0 w-60"
            }`}
            data-testid={`job-card-${j.id}`}
          >
            <div className="flex items-center gap-2">
              <span className="grid place-items-center w-9 h-9 rounded-lg bg-blue-50 text-blue-800">
                <Briefcase size={16} />
              </span>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                {j.type}
              </div>
            </div>
            <div className="mt-2 font-display font-semibold text-sm text-slate-900 line-clamp-2 leading-tight">
              {j.title}
            </div>
            <div className="text-[11px] text-slate-600 mt-1 truncate">{j.company_name}</div>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
              <span className="inline-flex items-center gap-0.5"><MapPin size={10} /> {j.location}</span>
              <span className="inline-flex items-center gap-0.5"><Clock size={10} /> {j.posted}</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleApplyClick(j);
              }}
              data-testid={`apply-job-${j.id}`}
              className="mt-3 w-full py-1.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold transition-colors text-center shadow-sm"
            >
              Apply Now
            </button>
          </article>
        ))}
        <Link
          to="/jobs"
          className={
            isSidebar
              ? "w-full bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-blue-800 hover:bg-blue-100 transition-colors"
              : "shrink-0 w-28 bg-blue-50 border border-blue-200 rounded-xl p-3 grid place-items-center text-center text-blue-800 hover:bg-blue-100 transition-colors"
          }
          data-testid="search-jobs-card"
        >
          {isSidebar ? (
            <>
              <div className="flex items-center gap-2">
                <Briefcase size={18} />
                <span className="text-xs font-semibold">Search Jobs</span>
              </div>
              <ArrowRight size={14} />
            </>
          ) : (
            <>
              <Briefcase size={20} />
              <div className="text-xs font-semibold mt-1">Search Jobs</div>
              <ArrowRight size={14} className="mt-1" />
            </>
          )}
        </Link>
      </div>

      <ApplyJobDialog 
        open={applyOpen} 
        onClose={() => setApplyOpen(false)} 
        job={selectedJob} 
      />
    </section>
  );
};
