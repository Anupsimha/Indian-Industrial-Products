import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import axios from "axios";
import { Briefcase, MapPin, Clock, IndianRupee, Settings, Plus, Edit, Trash2, Users, Download, X, AlertTriangle } from "lucide-react";
import { BackButton } from "../components/BackButton";
import { JobDialog } from "../components/CreateDialogs";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function MyVacanciesPage() {
  const { user, loading } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [fetching, setFetching] = useState(true);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Applicants state
  const [applicantsOpen, setApplicantsOpen] = useState(false);
  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [selectedJobForApps, setSelectedJobForApps] = useState(null);

  const navigate = useNavigate();

  const handleViewApplicants = async (job) => {
    setSelectedJobForApps(job);
    setApplicantsOpen(true);
    setLoadingApplicants(true);
    try {
      const { data } = await api.get(`/jobs/${job.id}/applications`);
      setApplicants(data);
    } catch {
      toast.error("Failed to load applicants");
    } finally {
      setLoadingApplicants(false);
    }
  };

  const loadJobs = () => {
    if (user?.company_id) {
      setFetching(true);
      api.get("/jobs/my")
        .then((r) => setJobs(r.data))
        .catch(() => toast.error("Failed to load vacancies"))
        .finally(() => setFetching(false));
    } else if (user) {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/jobs/${deleteTarget.id}`);
      toast.success("Vacancy deleted successfully");
      setJobs((prev) => prev.filter((j) => j.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete vacancy");
    }
  };

  const handleDownloadResume = async (resumeUrl, filename) => {
    try {
      const url = resumeUrl.startsWith("http") ? resumeUrl : `${BACKEND_URL}${resumeUrl}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename || 'resume.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
      toast.error("Failed to download resume");
    }
  };

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
          onClick={() => {
            setSelectedJob(null);
            setDialogOpen(true);
          }}
          data-testid="post-vacancy-btn"
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold shadow-md transition-all active:scale-95"
        >
          <Plus size={14} /> Add Job
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
              onClick={() => {
                setSelectedJob(null);
                setDialogOpen(true);
              }}
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
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-base text-slate-900 truncate">{j.title}</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-800 shrink-0">
                        {j.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-semibold">{j.company_name}</p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleViewApplicants(j)}
                      data-testid={`view-applicants-btn-${j.id}`}
                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 transition-colors relative"
                      title="View Applicants"
                    >
                      <span className="relative inline-block">
                        <Users size={15} />
                        {j.applicants_count > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-450 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                          </span>
                        )}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedJob(j);
                        setDialogOpen(true);
                      }}
                      data-testid={`edit-job-btn-${j.id}`}
                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-800 transition-colors"
                      title="Edit vacancy"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(j)}
                      data-testid={`delete-job-btn-${j.id}`}
                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors"
                      title="Delete vacancy"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
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

      {/* CRUD dialog */}
      <JobDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={loadJobs}
        jobToEdit={selectedJob}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
            data-testid="delete-confirm-modal"
          >
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <span className="p-2 rounded-full bg-rose-50 text-rose-600">
                <AlertTriangle size={20} />
              </span>
              <h3 className="font-display font-bold text-lg text-slate-900">Delete Vacancy?</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              Are you sure you want to delete <strong className="text-slate-800">"{deleteTarget.title}"</strong>? This action cannot be undone.
            </p>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                data-testid="confirm-delete-btn"
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 rounded-full hover:bg-rose-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Applicants List Modal */}
      {applicantsOpen && selectedJobForApps && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-205 max-h-[85vh] flex flex-col"
            data-testid="applicants-modal"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900">Applicants</h3>
                <p className="text-[10px] text-slate-500 font-semibold truncate max-w-[280px]">
                  {selectedJobForApps.title}
                </p>
              </div>
              <button 
                onClick={() => setApplicantsOpen(false)} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {loadingApplicants ? (
                <div className="text-center py-10 text-xs font-semibold text-slate-400">Loading applicants...</div>
              ) : applicants.length === 0 ? (
                <div className="text-center py-10 text-xs font-semibold text-slate-400">No applicants yet.</div>
              ) : (
                applicants.map((app) => (
                  <div 
                    key={app.user_id} 
                    className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl space-y-2.5"
                    data-testid={`applicant-item-${app.user_id}`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{app.name}</h4>
                        <p className="text-xs text-slate-500 font-medium">{app.qualification}</p>
                      </div>
                      
                      {/* Resume Download */}
                      <button
                        onClick={() => handleDownloadResume(app.resume_url, `${app.name}_Resume${app.resume_filename ? app.resume_filename.slice(app.resume_filename.lastIndexOf('.')) : '.pdf'}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 text-[10.5px] font-bold transition-colors shrink-0"
                        data-testid={`resume-download-${app.user_id}`}
                      >
                        <Download size={12} /> Resume
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-1 border-t border-slate-100/60">
                      <div>
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[8px] block">Contact</span>
                        <span className="font-medium text-slate-700">{app.phone}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[8px] block">Location Preferred</span>
                        <span className="font-medium text-slate-700">{app.location_preferred}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 flex justify-end">
              <button
                onClick={() => setApplicantsOpen(false)}
                className="px-5 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
