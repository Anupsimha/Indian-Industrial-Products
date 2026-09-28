import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import { TopHeader } from "../TopHeader";
import { AuthContext } from "../../context/AuthContext";
import { CartContext } from "../../context/CartContext";

const renderTopHeader = (user = null, cartCount = 0) => {
  return render(
    <AuthContext.Provider value={{ user, logout: jest.fn() }}>
      <CartContext.Provider value={{ cartCount }}>
        <BrowserRouter>
          <TopHeader />
        </BrowserRouter>
      </CartContext.Provider>
    </AuthContext.Provider>
  );
};

describe("TopHeader Component — Mobile Icon & Navigation Tests", () => {
  test("renders logo, billing button, and profile button in main bar", () => {
    renderTopHeader();

    expect(screen.getByTestId("top-header")).toBeInTheDocument();
    expect(screen.getByTestId("header-logo-link")).toBeInTheDocument();
    expect(screen.getByTestId("header-profile-btn")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-menu-toggle")).toBeInTheDocument();
  });

  test("opens profile dropdown menu when profile icon is clicked", () => {
    const mockUser = { name: "Rajesh Kumar", role: "manufacturer", plan_name: "Pro" };
    renderTopHeader(mockUser);

    const profileBtn = screen.getByTestId("header-profile-btn");
    fireEvent.click(profileBtn);

    expect(screen.getByTestId("profile-dropdown")).toBeInTheDocument();
    expect(screen.getByText("Rajesh Kumar")).toBeInTheDocument();
    expect(screen.getByTestId("dropdown-settings-link")).toBeInTheDocument();
    expect(screen.getByTestId("dropdown-logout-btn")).toBeInTheDocument();
  });

  test("opens vertically collapsible menu when mobile hamburger toggle is clicked", () => {
    renderTopHeader(null, 3);
    const menuToggle = screen.getByTestId("mobile-menu-toggle");
    expect(menuToggle).toBeInTheDocument();

    fireEvent.click(menuToggle);

    expect(screen.getByTestId("mobile-collapsible-menu")).toBeInTheDocument();
    expect(screen.getByTestId("header-search-mobile")).toBeInTheDocument();
    expect(screen.getByTestId("header-cart-mobile")).toBeInTheDocument();
    expect(screen.getByTestId("header-chats-mobile")).toBeInTheDocument();
    expect(screen.getByTestId("header-news-mobile")).toBeInTheDocument();
    expect(screen.getByTestId("header-bookmarks-mobile")).toBeInTheDocument();
    expect(screen.getByTestId("header-notifications-mobile")).toBeInTheDocument();
  });
});
