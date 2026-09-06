import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

const SupportContactContext = createContext({
  supportContact: {
    support_phone: "",
    support_whatsapp: "",
    support_email: "",
    support_address: "",
  },
  loading: true,
  refreshSupportContact: async () => {},
});

export const SupportContactProvider = ({ children }) => {
  const [supportContact, setSupportContact] = useState({
    support_phone: "",
    support_whatsapp: "",
    support_email: "",
    support_address: "",
  });
  const [loading, setLoading] = useState(true);

  const fetchSupportContact = useCallback(async () => {
    try {
      const res = await api.get("/support-contact");
      if (res.data) {
        setSupportContact({
          support_phone: res.data.support_phone || "",
          support_whatsapp: res.data.support_whatsapp || "",
          support_email: res.data.support_email || "",
          support_address: res.data.support_address || "",
        });
      }
    } catch (err) {
      console.error("Failed to fetch support contact details:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSupportContact();
  }, [fetchSupportContact]);

  return (
    <SupportContactContext.Provider
      value={{
        supportContact,
        loading,
        refreshSupportContact: fetchSupportContact,
      }}
    >
      {children}
    </SupportContactContext.Provider>
  );
};

export const useSupportContact = () => useContext(SupportContactContext);
