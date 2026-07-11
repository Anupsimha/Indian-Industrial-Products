import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { PostCard } from "../components/PostCard";
import { BackButton } from "../components/BackButton";

export default function BookmarksPage() {
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState([]);

  const load = () => api.get("/me/bookmarks").then((r) => setPosts(r.data)).catch(() => {});
  useEffect(() => { if (user) load(); }, [user]);

  if (loading) return <div className="p-10 text-center text-slate-400">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="pb-28 px-4 pt-4" data-testid="bookmarks-page">
      <BackButton className="mb-2" />
      <h1 className="font-display text-2xl font-bold text-slate-900">Saved Posts</h1>
      <div className="mt-4 space-y-3">
        {posts.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
            No saved posts yet. Tap the bookmark icon on any post to save it here.
          </div>
        )}
        {posts.map((p) => <PostCard key={p.id} post={p} onUpdate={load} />)}
      </div>
    </div>
  );
}
