import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import { PostCard } from "../PostCard";
import { AuthContext } from "../../context/AuthContext";

// Mock IntersectionObserver
beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    constructor(callback) { this.callback = callback; }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const mockPostImage = {
  id: "post-101",
  company_id: "comp-1",
  company_name: "Apex Precision Tools",
  company_logo: "https://example.com/logo.png",
  location: "Peenya, Bengaluru",
  content: "High speed CNC Milling Machine available for instant delivery.",
  media_url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  media_urls: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"],
  media_type: "image",
  likes_count: 14,
  views_count: 120,
  comments_count: 3,
  is_liked: false,
  is_saved: false,
  is_following: false,
  whatsapp: "919876543210",
  plan_name: "Gold",
  category: "Machinery",
};

const mockPostVideo = {
  ...mockPostImage,
  id: "post-102",
  media_url: "https://res.cloudinary.com/demo/video/upload/sample.mp4",
  media_urls: ["https://res.cloudinary.com/demo/video/upload/sample.mp4"],
  media_type: "video",
};

const renderPostCard = (post, user = null) => {
  return render(
    <AuthContext.Provider value={{ user }}>
      <BrowserRouter>
        <PostCard post={post} onUpdate={jest.fn()} />
      </BrowserRouter>
    </AuthContext.Provider>
  );
};

describe("PostCard Component — Lazy Loading & Media Tests", () => {
  test("renders image post with lazy loading attributes", () => {
    renderPostCard(mockPostImage);
    expect(screen.getByTestId("post-card-post-101")).toBeInTheDocument();
    expect(screen.getByText("Apex Precision Tools")).toBeInTheDocument();
    expect(screen.getByText(/High speed CNC Milling/)).toBeInTheDocument();

    const img = screen.getByRole("img", { name: "" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
  });

  test("renders video post using FeedVideoPlayer component", () => {
    renderPostCard(mockPostVideo);
    expect(screen.getByTestId("post-card-post-102")).toBeInTheDocument();
    expect(screen.getByTestId("post-video-post-102")).toBeInTheDocument();
  });

  test("action buttons row fits correctly with like and comment interactions", () => {
    const user = { id: "u1", company_id: "comp-2" };
    renderPostCard(mockPostImage, user);

    const likeBtn = screen.getByTestId("post-like-post-101");
    expect(likeBtn).toBeInTheDocument();
    fireEvent.click(likeBtn);

    const commentBtn = screen.getByTestId("post-comment-post-101");
    expect(commentBtn).toBeInTheDocument();
    fireEvent.click(commentBtn);

    expect(screen.getByTestId("post-comments-post-101")).toBeInTheDocument();
  });
});
