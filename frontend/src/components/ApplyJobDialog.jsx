import React, { useEffect, useState } from "react";
import { X, User, Phone, MapPin, GraduationCap, FileText, Upload } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

export const ApplyJobDialog = ({ open, onClose, job, onApplied }) => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [locationPreferred, setLocationPreferred] = useState("");
  const [qualification, setQualification] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Parse location helper
  const getLocations = (locString) => {
    if (!locString) return [];
    let parts = locString.split(";").map(s => s.trim()).filter(Boolean);
    if (parts.length <= 1) {
      const commaParts = locString.split(",").map(s => s.trim()).filter(Boolean);
      if (commaParts.length > 2) {
        parts = commaParts;
      } else {
        parts = [locString];
      }
    }
    return parts;
  };

  const locations = getLocations(job?.location);
  const hasMultipleLocations = locations.length > 1;

  useEffect(() => {
    if (open) {
      setName(user?.name || "");
      setPhone(user?.mobile || "");
      setQualification("");
      setResumeFile(null);
      
      // Default location preferred
      if (locations.length > 0) {
        setLocationPreferred(locations[0]);
      } else {
        setLocationPreferred("");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job, user]);

  if (!open || !job) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (ext !== '.pdf' && ext !== '.doc' && ext !== '.docx') {
        toast.error("Invalid file format. Please upload a PDF or Word document (.pdf, .doc, .docx).");
        e.target.value = null;
        setResumeFile(null);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size exceeds 5MB limit.");
        e.target.value = null;
        setResumeFile(null);
        return;
      }
      setResumeFile(file);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!resumeFile) {
      toast.error("Please upload your resume");
      return;
    }
    const ext = resumeFile.name.slice(resumeFile.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.pdf' && ext !== '.doc' && ext !== '.docx') {
      toast.error("Invalid file format. Please upload a PDF or Word document (.pdf, .doc, .docx).");
      return;
    }
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("phone", phone);
      formData.append("location_preferred", locationPreferred);
      formData.append("qualification", qualification);
      formData.append("resume", resumeFile);

      await api.post(`/jobs/${job.id}/apply`, formData);

      toast.success("Applied successfully! Your resume has been submitted.");
      onApplied?.();
      onClose();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to apply for job");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in" 
      onClick={onClose}
      data-testid="apply-job-dialog"
    >
      <div 
        className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl shadow-xl animate-fade-up max-h-[90vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="font-display font-bold text-lg text-slate-950">Apply for Job</h3>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 text-slate-400 hover:text-slate-700" 
            data-testid="apply-dialog-close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="p-5 space-y-5">
          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 grid place-items-center shrink-0">
              <FileText size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 leading-tight">{job.title}</h4>
              <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">{job.company_name} • {job.location}</p>
            </div>
          </div>

          {/* Section 1: Personal Details */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <User size={13} className="text-slate-400" /> Personal Details
            </h4>

            {/* Name */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <User size={16} />
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                data-testid="apply-name-input"
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            {/* Phone */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Phone size={16} />
              </span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                data-testid="apply-phone-input"
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            {/* Location Preferred */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Location Preferred</label>
              {hasMultipleLocations ? (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <MapPin size={16} />
                  </span>
                  <select
                    value={locationPreferred}
                    onChange={(e) => setLocationPreferred(e.target.value)}
                    data-testid="apply-location-select"
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                  >
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <MapPin size={16} />
                  </span>
                  <input
                    type="text"
                    disabled
                    value={locationPreferred}
                    data-testid="apply-location-input"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-500 font-medium focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Education */}
          <div className="space-y-3.5 pt-1">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <GraduationCap size={14} className="text-slate-400" /> Education & Resume
            </h4>

            {/* Qualification */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <GraduationCap size={16} />
              </span>
              <input
                type="text"
                required
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="Highest Qualification (e.g. B.Tech Mechanical)"
                data-testid="apply-qualification-input"
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            {/* Resume Upload */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Upload Resume (.pdf, .doc, .docx)</label>
              <div className="relative border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 transition-colors p-4 text-center cursor-pointer">
                <input
                  type="file"
                  required
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  data-testid="apply-resume-input"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload size={20} className="mx-auto text-slate-400 mb-1" />
                <span className="text-xs text-slate-600 block font-semibold truncate px-2">
                  {resumeFile ? resumeFile.name : "Select or drag file here"}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Maximum size: 5MB</span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            data-testid="apply-submit-btn"
            className="w-full py-3 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-colors disabled:opacity-60 shadow-md"
          >
            {submitting ? "Submitting Application..." : "Submit Application"}
          </button>
        </form>
      </div>
    </div>
  );
};
export default ApplyJobDialog;
