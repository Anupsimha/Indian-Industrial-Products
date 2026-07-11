import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Link, useNavigate } from "react-router-dom";
import { MessageSquare, Search, ArrowLeft, MessageCircle, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BackButton } from "../components/BackButton";

export default function ChatsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    api.get("/chats/conversations")
      .then((r) => {
        setConversations(r.data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [user, navigate]);

  const filteredConversations = conversations.filter((c) =>
    c.partner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.company_name && c.company_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return "";
    }
  };

  if (!user) return null;

  return (
    <div className="pb-28 px-4 pt-4 max-w-lg mx-auto" data-testid="chats-page">
      <BackButton className="mb-2" />
      
      <div className="flex items-center gap-2 mb-4">
        <span className="grid place-items-center w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600">
          <MessageCircle size={18} />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Conversations</h1>
          <p className="text-xs text-slate-500">In-platform secure chats</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Conversations list */}
      {loading ? (
        <div className="text-center text-slate-400 py-10 font-medium">Loading inbox...</div>
      ) : filteredConversations.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
          <MessageSquare className="mx-auto text-slate-300 mb-3" size={32} />
          <h3 className="font-bold text-slate-800 text-sm">No active chats</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Go to a company's detail profile page and click the "Chat" button to start a conversation.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredConversations.map((c) => (
            <Link
              to={`/chat/${c.partner_id}`}
              key={c.partner_id}
              className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200"
              data-testid={`convo-item-${c.partner_id}`}
            >
              {/* Avatar / Initials */}
              <div className="relative shrink-0">
                {c.partner_avatar ? (
                  <img
                    src={c.partner_avatar}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover border border-slate-100"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm">
                    {getInitials(c.partner_name)}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>

              {/* Message preview */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h4 className="font-bold text-slate-900 text-sm truncate">{c.partner_name}</h4>
                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5 whitespace-nowrap">
                    <Clock size={10} /> {formatTime(c.last_message_time)}
                  </span>
                </div>
                {c.company_name && (
                  <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide mb-1">
                    {c.company_name}
                  </div>
                )}
                <p className="text-xs text-slate-500 truncate">{c.last_message}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
