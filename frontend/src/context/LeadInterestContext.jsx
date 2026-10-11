import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";

const LeadInterestContext = createContext();

const LOCAL_STORAGE_LEADS_KEY = "iip_selected_leads";
const LOCAL_STORAGE_ACTIVE_KEY = "iip_recommendations_active";

export const LeadInterestProvider = ({ children }) => {
  const { user } = useAuth();
  const [selectedLeads, setSelectedLeads] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_LEADS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isPersonalized, setIsPersonalized] = useState(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_ACTIVE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Sync with backend if user is authenticated
  useEffect(() => {
    if (!user) return;

    api.get("/recommendations/interests")
      .then((res) => {
        if (res.data && res.data.lead_ids && res.data.lead_ids.length > 0) {
          setIsPersonalized(true);
          try {
            localStorage.setItem(LOCAL_STORAGE_ACTIVE_KEY, "true");
          } catch {}
        }
      })
      .catch(() => {});
  }, [user]);

  // Persist local selection
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_LEADS_KEY, JSON.stringify(selectedLeads));
      if (selectedLeads.length === 0) {
        setIsPersonalized(false);
        localStorage.removeItem(LOCAL_STORAGE_ACTIVE_KEY);
      }
    } catch {}
  }, [selectedLeads]);

  const isLeadSelected = useCallback(
    (leadId) => {
      if (!leadId) return false;
      return selectedLeads.some((l) => l.id === leadId);
    },
    [selectedLeads]
  );

  const toggleLeadInterest = useCallback(
    (lead) => {
      if (!lead || !lead.id) return;

      setSelectedLeads((prev) => {
        const exists = prev.some((l) => l.id === lead.id);
        if (exists) {
          return prev.filter((l) => l.id !== lead.id);
        }

        if (prev.length >= 5) {
          toast.info("You have already selected 5 leads. Click to review or remove one.");
          setShowConfirmModal(true);
          return prev;
        }

        const next = [
          ...prev,
          {
            id: lead.id,
            category: lead.category || "General",
            product_name: lead.product_name || "",
            requirement: lead.requirement || "",
            location: lead.location || "",
            name: lead.name || "",
          },
        ];

        if (next.length === 5) {
          // Reached exactly 5 leads - automatically prompt user confirmation!
          setShowConfirmModal(true);
        }

        return next;
      });
    },
    []
  );

  const confirmInterests = useCallback(async () => {
    if (selectedLeads.length === 0) {
      toast.error("Please select at least 1 lead.");
      return;
    }

    try {
      const leadIds = selectedLeads.map((l) => l.id);
      if (user) {
        await api.post("/recommendations/interests", { lead_ids: leadIds });
      }
      setIsPersonalized(true);
      setShowConfirmModal(false);
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_KEY, "true");
      toast.success(
        `Personalization activated for ${selectedLeads.length} selected industrial leads!`,
        { description: "Feed, products, and reels are now tailor-made for your interests." }
      );
    } catch (err) {
      // Still enable locally for smooth UX even if offline
      setIsPersonalized(true);
      setShowConfirmModal(false);
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_KEY, "true");
      toast.success("Personalized recommendations activated locally!");
    }
  }, [selectedLeads, user]);

  const resetInterests = useCallback(async () => {
    setSelectedLeads([]);
    setIsPersonalized(false);
    setShowConfirmModal(false);
    try {
      localStorage.removeItem(LOCAL_STORAGE_LEADS_KEY);
      localStorage.removeItem(LOCAL_STORAGE_ACTIVE_KEY);
      if (user) {
        await api.delete("/recommendations/interests");
      }
    } catch {}
    toast.info("Recommendations reset to standard feed.");
  }, [user]);

  const selectedLeadIds = selectedLeads.map((l) => l.id);

  return (
    <LeadInterestContext.Provider
      value={{
        selectedLeads,
        selectedLeadIds,
        count: selectedLeads.length,
        isPersonalized,
        showConfirmModal,
        setShowConfirmModal,
        isLeadSelected,
        toggleLeadInterest,
        confirmInterests,
        resetInterests,
      }}
    >
      {children}
    </LeadInterestContext.Provider>
  );
};

export const useLeadInterests = () => {
  const context = useContext(LeadInterestContext);
  if (!context) {
    throw new Error("useLeadInterests must be used within a LeadInterestProvider");
  }
  return context;
};
