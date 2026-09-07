import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

const DEFAULT_SUPPORT_CONTACT = {
  support_phone: "+91 9380036328",
  support_whatsapp: "9380036328",
  support_email: "support@indianindustrialplatform.com",
  support_address: "No. 35 Suvarna Nagar Doddabidrekallu Nagasandra - 560073",
};

if (typeof window !== "undefined") {
  window.__IIP_SUPPORT_CONTACT = DEFAULT_SUPPORT_CONTACT;
}

const SupportContactContext = createContext({
  supportContact: DEFAULT_SUPPORT_CONTACT,
  loading: true,
  refreshSupportContact: async () => {},
});

export const SupportContactProvider = ({ children }) => {
  const [supportContact, setSupportContact] = useState(DEFAULT_SUPPORT_CONTACT);
  const [loading, setLoading] = useState(true);

  const fetchSupportContact = useCallback(async () => {
    try {
      const res = await api.get("/support-contact");
      if (res.data) {
        const contactData = {
          support_phone: res.data.support_phone || DEFAULT_SUPPORT_CONTACT.support_phone,
          support_whatsapp: res.data.support_whatsapp || DEFAULT_SUPPORT_CONTACT.support_whatsapp,
          support_email: res.data.support_email || DEFAULT_SUPPORT_CONTACT.support_email,
          support_address: res.data.support_address || DEFAULT_SUPPORT_CONTACT.support_address,
        };
        setSupportContact(contactData);
        if (typeof window !== "undefined") {
          window.__IIP_SUPPORT_CONTACT = contactData;
        }
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
