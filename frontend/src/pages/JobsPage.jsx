import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, MapPin, Clock, IndianRupee } from "lucide-react";
import { BackButton } from "../components/BackButton";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { ApplyJobDialog } from "../components/ApplyJobDialog";

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => { api.get("/jobs").then((r) => setJobs(r.data)).catch(() => {}); }, []);

  const handleApplyClick = (j) => {
    if (!user) {
      toast.error("Please login to apply");
      navigate("/login");
      return;
    }
    setSelectedJob(j);
    setApplyOpen(true);
  };

  return (
    <div className="pb-28 px-4 pt-4" data-testid="jobs-page">
      <BackButton className="mb-2" />
      <div className="flex items-center gap-2">
        <span className="grid place-items-center w-9 h-9 rounded-xl bg-orange-100 text-orange-600">
          <Briefcase size={18} />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Jobs & Vacancies</h1>
          <p className="text-xs text-slate-500">Industrial roles across India</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {jobs.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">No jobs yet.</div>
        )}
        {jobs.map((j) => (
          <article key={j.id} className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-md transition-all" data-testid={`job-list-${j.id}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-display font-bold text-base text-slate-900">{j.title}</div>
                <Link to={`/company/${j.company_id}`} className="text-xs text-blue-800 font-semibold hover:underline">
                  {j.company_name}
                </Link>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-emerald-50 text-emerald-700">
                {j.type}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-700 line-clamp-2">{j.description}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><MapPin size={12} /> {j.location}</span>
              {j.salary && <span className="inline-flex items-center gap-1"><IndianRupee size={12} /> {j.salary}</span>}
              <span className="inline-flex items-center gap-1"><Clock size={12} /> {j.posted}</span>
            </div>
            <button
              type="button"
              onClick={() => handleApplyClick(j)}
              className="mt-3 px-4 py-1.5 rounded-full bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition-colors shadow-sm"
              data-testid={`apply-job-${j.id}`}
            >
              Apply Now
            </button>
          </article>
        ))}
      </div>

      <ApplyJobDialog
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        job={selectedJob}
      />
    </div>
  );
}
