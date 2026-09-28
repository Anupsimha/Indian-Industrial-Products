import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FeedVideoPlayer } from "../FeedVideoPlayer";

// Mock IntersectionObserver
beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe(element) {
      // Simulate intersecting
      this.callback([{ isIntersecting: true, intersectionRatio: 0.8, target: element }]);
    }
    unobserve() {}
    disconnect() {}
  };
});

describe("FeedVideoPlayer Component", () => {
  const sampleSrc = "https://res.cloudinary.com/demo/video/upload/sample.mp4";

  beforeEach(() => {
    window.HTMLMediaElement.prototype.play = jest.fn().mockImplementation(() => Promise.resolve());
    window.HTMLMediaElement.prototype.pause = jest.fn();
  });

  test("renders video element with correct src and attributes", () => {
    render(<FeedVideoPlayer src={sampleSrc} testId="test-feed-video" />);
    const video = screen.getByTestId("test-feed-video");
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute("src", sampleSrc);
    expect(video).toHaveAttribute("loop");
  });

  test("toggles mute state when mute button is clicked", () => {
    render(<FeedVideoPlayer src={sampleSrc} testId="test-feed-video" />);
    const muteBtn = screen.getByLabelText(/mute video|unmute video/i);
    expect(muteBtn).toBeInTheDocument();

    fireEvent.click(muteBtn);
    const video = screen.getByTestId("test-feed-video");
    expect(video.muted).toBe(false);
  });

  test("toggles play/pause on video click", async () => {
    render(<FeedVideoPlayer src={sampleSrc} testId="test-feed-video" />);
    const video = screen.getByTestId("test-feed-video");
    
    await act(async () => {
      fireEvent.click(video);
    });

    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });
});
