import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Send, ArrowLeft, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BackButton } from "../components/BackButton";
import { toast } from "sonner";

export default function ChatWindowPage() {
  const { id: receiverId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [partnerName, setPartnerName] = useState("Chat");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Load chat messages
  const loadMessages = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get(`/chats/messages/${receiverId}`);
      setMessages(data);
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Load recipient info
  const loadPartnerInfo = async () => {
    try {
      // Find the conversations list to see if we already have the partner info
      const convoRes = await api.get("/chats/conversations");
      const currentConvo = convoRes.data.find(c => c.partner_id === receiverId);
      if (currentConvo) {
        setPartnerName(currentConvo.partner_name);
        setCompanyName(currentConvo.company_name);
      } else {
        // If not found in conversations, we can try to find them by company detail page or user profile
        // But for simplicity, we will query companies list to check if this user is a company owner
        const compRes = await api.get("/companies");
        const matchComp = compRes.data.find(c => c.owner_id === receiverId);
        if (matchComp) {
          setPartnerName(matchComp.owner_name || "Company Owner");
          setCompanyName(matchComp.name);
        } else {
          setPartnerName("User");
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadPartnerInfo();
    loadMessages(true);

    // Poll for new messages every 3 seconds
    const interval = setInterval(() => {
      loadMessages(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [user, receiverId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const messageToSend = inputText;
    setInputText(""); // Clear input immediately

    try {
      const { data } = await api.post("/chats/messages", {
        receiver_id: receiverId,
        message: messageToSend
      });
      
      // Update local message list with the returned (potentially moderated) message
      setMessages(prev => [...prev, data]);
      
      // Check if message was moderated/censored by looking at the content
      if (data.message.includes("[blocked email]") || data.message.includes("[blocked number]")) {
        toast.warning("Warning: Personal contact details (emails/phone numbers) are blocked by the moderator.");
      }
    } catch (error) {
      toast.error("Failed to send message.");
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "";
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)] max-w-lg mx-auto bg-slate-50 border-x border-slate-100" data-testid="chat-window">
      {/* Header */}
      <div className="flex items-center gap-3 p-3.5 bg-white border-b border-slate-200 shrink-0">
        <BackButton to="/chats" className="p-1 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900" />
        
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-slate-900 text-sm truncate">{partnerName}</h1>
          {companyName && (
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide truncate">
              {companyName}
            </p>
          )}
        </div>

        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-xs shrink-0">
          {getInitials(partnerName)}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-slate-400 py-10 font-semibold text-xs">Loading chat history...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-slate-400 py-12 text-xs">
            No messages yet. Send a message to start the conversation!
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === user.id;
            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-[80%] ${
                  isMe ? "ml-auto items-end" : "mr-auto items-start"
                }`}
                data-testid={`chat-bubble-${isMe ? "me" : "partner"}`}
              >
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-xs font-medium shadow-sm leading-relaxed ${
                    isMe
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                  }`}
                >
                  {m.message}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 flex items-center gap-0.5">
                  <Clock size={8} /> {formatTime(m.created_at)}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input panel */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 shrink-0 flex items-center gap-2">
        <input
          type="text"
          placeholder="Type your message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          data-testid="chat-input"
        />
        <button
          type="submit"
          className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-transform active:scale-95 shadow-md flex items-center justify-center shrink-0"
          data-testid="chat-send-btn"
        >
          <Send size={14} className="fill-white" />
        </button>
      </form>
    </div>
  );
}
