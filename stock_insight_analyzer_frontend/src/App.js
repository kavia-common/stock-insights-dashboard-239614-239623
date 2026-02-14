import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import DetailsPage from "./pages/DetailsPage";
import WatchlistPage from "./pages/WatchlistPage";
import NewsPage from "./pages/NewsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";
import { getNews, getWatchlist } from "./services/apiClient";
import "./App.css";

// PUBLIC_INTERFACE
export default function App() {
  /** App entry: wires up routing and global layout. */
  const [counts, setCounts] = useState({ watchlist: 0, news: 0, dashboard: "Live" });

  useEffect(() => {
    let mounted = true;
    Promise.all([getWatchlist(), getNews()]).then(([w, n]) => {
      if (!mounted) return;
      setCounts({ watchlist: w?.length || 0, news: n?.length || 0, dashboard: "Live" });
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Keep BrowserRouter basename flexible for non-root deployments if needed later.
  const router = useMemo(() => {
    return (
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout counts={counts} />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/stocks/:symbol" element={<DetailsPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    );
  }, [counts]);

  return router;
}
