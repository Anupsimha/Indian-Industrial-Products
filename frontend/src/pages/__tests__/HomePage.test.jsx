import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import HomePage from "../HomePage";
import { AuthContext } from "../../context/AuthContext";
import api from "../../lib/api";

jest.mock("../../lib/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
  whatsappLink: jest.fn((phone, msg) => `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`),
}));

// Mock IntersectionObserver
beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    constructor(callback) { this.callback = callback; }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const renderHomePage = (user = null) => {
  return render(
    <AuthContext.Provider value={{ user }}>
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    </AuthContext.Provider>
  );
};

describe("HomePage Component — Batch Infinite Scroll & Tab Navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.includes("/posts")) {
        return Promise.resolve({
          data: [
            {
              id: "p1",
              company_id: "c1",
              company_name: "Bharat Steel",
              content: "Heavy Duty I-Beams",
              media_url: "https://example.com/beam.jpg",
              media_type: "image",
              likes_count: 5,
              views_count: 50,
            },
          ],
        });
      }
      if (url.includes("/requirements")) return Promise.resolve({ data: [] });
      if (url.includes("/jobs")) return Promise.resolve({ data: [] });
      if (url.includes("/stats/summary")) return Promise.resolve({ data: { formatted: { companies: "50K+", products: "2L+", leads: "1L+", members: "5L+" } } });
      if (url.includes("/companies")) return Promise.resolve({ data: [] });
      if (url.includes("/industrial-groups")) return Promise.resolve({ data: [] });
      if (url.includes("/categories")) return Promise.resolve({ data: [{ name: "Steel" }] });
      return Promise.resolve({ data: [] });
    });
  });

  test("renders homepage structure, key metrics, and category cards", async () => {
    renderHomePage();
    expect(screen.getByTestId("home-page")).toBeInTheDocument();
    expect(screen.getByText("CATEGORIES")).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText("Bharat Steel")).toBeInTheDocument();
    });
  });

  test("switches tabs correctly when feed tab buttons are clicked", async () => {
    renderHomePage();

    const jobsTab = screen.getByTestId("feed-tab-jobs");
    expect(jobsTab).toBeInTheDocument();

    fireEvent.click(jobsTab);
    await waitFor(() => {
      expect(screen.getByText("No jobs matching your search criteria.")).toBeInTheDocument();
    });

    const leadsTab = screen.getByTestId("feed-tab-leads");
    fireEvent.click(leadsTab);
    await waitFor(() => {
      expect(screen.getByText("No leads matching your search criteria.")).toBeInTheDocument();
    });
  });
});
