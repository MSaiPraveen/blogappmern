import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { analyticsService } from "../api";
import SEO from "../components/SEO";
import Loader from "../components/Loader";
import "../styles/analytics.css";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const Analytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");
  const [activeTab, setActiveTab] = useState("overview");
  
  // Data states
  const [overview, setOverview] = useState(null);
  const [viewsData, setViewsData] = useState([]);
  const [engagement, setEngagement] = useState(null);
  const [popularPosts, setPopularPosts] = useState([]);
  const [popularAuthors, setPopularAuthors] = useState([]);
  const [geographic, setGeographic] = useState(null);
  const [realtime, setRealtime] = useState(null);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/");
      return;
    }
    fetchAnalytics();
  }, [user, period]);

  // Fetch realtime data every 30 seconds
  useEffect(() => {
    if (activeTab === "realtime") {
      const interval = setInterval(fetchRealtime, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [
        overviewRes,
        viewsRes,
        engagementRes,
        postsRes,
        authorsRes,
        geoRes,
        realtimeRes,
      ] = await Promise.all([
        analyticsService.getOverview(),
        analyticsService.getViewsOverTime(period),
        analyticsService.getEngagement(),
        analyticsService.getPopularPosts(period),
        analyticsService.getPopularAuthors(period),
        analyticsService.getGeographic(period),
        analyticsService.getRealtime(),
      ]);

      setOverview(overviewRes.data);
      setViewsData(viewsRes.data);
      setEngagement(engagementRes.data);
      setPopularPosts(postsRes.data);
      setPopularAuthors(authorsRes.data);
      setGeographic(geoRes.data);
      setRealtime(realtimeRes.data);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtime = async () => {
    try {
      const res = await analyticsService.getRealtime();
      setRealtime(res.data);
    } catch (error) {
      console.error("Failed to fetch realtime:", error);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num?.toString() || "0";
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0s";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) return <Loader />;

  return (
    <div className="analytics-dashboard">
      <SEO title="Analytics Dashboard" description="View blog analytics and metrics" />
      
      {/* Header */}
      <div className="analytics-header">
        <div className="header-left">
          <h1>Analytics Dashboard</h1>
          <p>Track your blog's performance and engagement</p>
        </div>
        <div className="header-right">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="period-select"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="analytics-tabs">
        {["overview", "engagement", "content", "audience", "realtime"].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon views">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div className="stat-content">
                <span className="stat-value">{formatNumber(overview?.totals?.views)}</span>
                <span className="stat-label">Total Views</span>
                <span className={`stat-change ${overview?.today?.viewsGrowth >= 0 ? "positive" : "negative"}`}>
                  {overview?.today?.viewsGrowth >= 0 ? "+" : ""}{overview?.today?.viewsGrowth}% from yesterday
                </span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon users">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="stat-content">
                <span className="stat-value">{formatNumber(overview?.totals?.users)}</span>
                <span className="stat-label">Total Users</span>
                <span className="stat-change positive">+{overview?.today?.newUsers} today</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon posts">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="stat-content">
                <span className="stat-value">{formatNumber(overview?.totals?.posts)}</span>
                <span className="stat-label">Published Posts</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon comments">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="stat-content">
                <span className="stat-value">{formatNumber(overview?.totals?.comments)}</span>
                <span className="stat-label">Comments</span>
              </div>
            </div>
          </div>

          {/* Views Over Time Chart */}
          <div className="chart-card">
            <h3>Views Over Time</h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={viewsData}>
                <defs>
                  <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(parseISO(date), "MMM d")}
                  stroke="#9ca3af"
                />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  labelFormatter={(date) => format(parseISO(date), "MMMM d, yyyy")}
                  contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px" }}
                  labelStyle={{ color: "#f9fafb" }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#6366f1"
                  fill="url(#viewsGradient)"
                  strokeWidth={2}
                  name="Page Views"
                />
                <Line
                  type="monotone"
                  dataKey="uniqueVisitors"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Unique Visitors"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Engagement Tab */}
      {activeTab === "engagement" && (
        <>
          {/* Engagement Metrics */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon time">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
              </div>
              <div className="stat-content">
                <span className="stat-value">{formatDuration(engagement?.avgDuration)}</span>
                <span className="stat-label">Avg. Time on Page</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon scroll">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                </svg>
              </div>
              <div className="stat-content">
                <span className="stat-value">{engagement?.avgScrollDepth}%</span>
                <span className="stat-label">Avg. Scroll Depth</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon bounce">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
                  <polyline points="17,6 23,6 23,12" />
                </svg>
              </div>
              <div className="stat-content">
                <span className="stat-value">{engagement?.bounceRate}%</span>
                <span className="stat-label">Bounce Rate</span>
              </div>
            </div>
          </div>

          {/* Comments Over Time */}
          <div className="chart-card">
            <h3>Engagement Over Time</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={engagement?.commentsOverTime || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(parseISO(date), "MMM d")}
                  stroke="#9ca3af"
                />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  labelFormatter={(date) => format(parseISO(date), "MMMM d, yyyy")}
                  contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px" }}
                  labelStyle={{ color: "#f9fafb" }}
                />
                <Legend />
                <Bar dataKey="comments" fill="#6366f1" name="Comments" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Content Tab */}
      {activeTab === "content" && (
        <div className="content-grid">
          {/* Popular Posts */}
          <div className="table-card">
            <h3>Popular Posts</h3>
            <div className="table-container">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Post</th>
                    <th>Author</th>
                    <th>Views</th>
                    <th>Unique</th>
                    <th>Avg. Time</th>
                    <th>Likes</th>
                  </tr>
                </thead>
                <tbody>
                  {popularPosts.map((post, index) => (
                    <tr key={post._id}>
                      <td>
                        <div className="post-cell">
                          <span className="rank">#{index + 1}</span>
                          <a href={`/post/${post.slug}`} className="post-title">
                            {post.title}
                          </a>
                        </div>
                      </td>
                      <td>{post.author?.name}</td>
                      <td className="number">{formatNumber(post.views)}</td>
                      <td className="number">{formatNumber(post.uniqueViews)}</td>
                      <td className="number">{formatDuration(post.avgDuration)}</td>
                      <td className="number">{post.likes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Popular Authors */}
          <div className="table-card">
            <h3>Top Authors</h3>
            <div className="authors-list">
              {popularAuthors.map((author, index) => (
                <div key={author._id} className="author-item">
                  <span className="author-rank">#{index + 1}</span>
                  <div className="author-avatar">
                    {author.avatar ? (
                      <img src={author.avatar} alt={author.name} />
                    ) : (
                      <span>{author.name?.charAt(0)}</span>
                    )}
                  </div>
                  <div className="author-info">
                    <span className="author-name">{author.name}</span>
                    <span className="author-username">@{author.username}</span>
                  </div>
                  <div className="author-stats">
                    <span className="stat">{formatNumber(author.totalViews)} views</span>
                    <span className="stat">{author.postCount} posts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Audience Tab */}
      {activeTab === "audience" && (
        <>
          <div className="charts-grid">
            {/* Device Breakdown */}
            <div className="chart-card small">
              <h3>Device Breakdown</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={geographic?.devices || []}
                    dataKey="count"
                    nameKey="device"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ device, percent }) => `${device} ${(percent * 100).toFixed(0)}%`}
                  >
                    {geographic?.devices?.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Browser Breakdown */}
            <div className="chart-card small">
              <h3>Browser Usage</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={geographic?.browsers || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#9ca3af" />
                  <YAxis dataKey="browser" type="category" stroke="#9ca3af" width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Geographic Data */}
          <div className="table-card">
            <h3>Top Countries</h3>
            <div className="countries-grid">
              {geographic?.countries?.slice(0, 10).map((country, index) => (
                <div key={country.country} className="country-item">
                  <span className="country-rank">#{index + 1}</span>
                  <span className="country-name">{country.country}</span>
                  <div className="country-bar">
                    <div
                      className="country-bar-fill"
                      style={{
                        width: `${(country.views / (geographic?.countries?.[0]?.views || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="country-views">{formatNumber(country.views)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Referrers */}
          <div className="table-card">
            <h3>Traffic Sources</h3>
            <div className="referrers-list">
              {geographic?.referrers?.map((ref, index) => (
                <div key={index} className="referrer-item">
                  <span className="referrer-source">{ref.source}</span>
                  <span className="referrer-count">{formatNumber(ref.count)} visits</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Realtime Tab */}
      {activeTab === "realtime" && (
        <>
          <div className="realtime-header">
            <div className="realtime-indicator">
              <span className="pulse"></span>
              Live
            </div>
            <p>Data updates every 30 seconds</p>
          </div>

          <div className="stats-grid">
            <div className="stat-card realtime">
              <div className="stat-content">
                <span className="stat-value large">{realtime?.activeVisitors || 0}</span>
                <span className="stat-label">Active Visitors</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <span className="stat-value">{realtime?.pageViews || 0}</span>
                <span className="stat-label">Page Views (5 min)</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <span className="stat-value">{realtime?.activePages || 0}</span>
                <span className="stat-label">Active Pages</span>
              </div>
            </div>
          </div>

          {/* Top Active Pages */}
          <div className="table-card">
            <h3>Currently Active Pages</h3>
            <div className="active-pages-list">
              {realtime?.topPages?.map((page, index) => (
                <div key={index} className="active-page-item">
                  <span className="page-path">{page.path}</span>
                  <span className="page-visitors">
                    <span className="visitor-dot"></span>
                    {page.visitors} visitors
                  </span>
                </div>
              ))}
              {(!realtime?.topPages || realtime.topPages.length === 0) && (
                <p className="no-data">No active visitors right now</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
