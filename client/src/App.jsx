import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Loader from "./components/Loader";
import OfflineBanner from "./components/OfflineBanner";
import AnalyticsTracker from "./components/AnalyticsTracker";
import "./App.css";
import "./styles/social.css";

// Lazy load pages for code splitting
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const CreatePost = lazy(() => import("./pages/CreatePost"));
const EditPost = lazy(() => import("./pages/EditPost"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Bookmarks = lazy(() => import("./pages/Bookmarks"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Notifications = lazy(() => import("./pages/Notifications"));

function App() {
  return (
    <AuthProvider>
      <div className="app">
        <Navbar />
        <AnalyticsTracker />
        <main className="main-content">
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/create" element={<CreatePost />} />
              <Route path="/post/:slug" element={<PostDetail />} />
              <Route path="/edit/:id" element={<EditPost />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
              <Route path="/user/:username" element={<PublicProfile />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/notifications" element={<Notifications />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
        <OfflineBanner />
      </div>
    </AuthProvider>
  );
}

export default App;
