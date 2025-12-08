import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { postService, categoryService } from "../api";
import PostCard from "../components/PostCard";
import Pagination from "../components/Pagination";
import Loader from "../components/Loader";
import SEO from "../components/SEO";
import "../styles/home.css";

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Get filters from URL
  const currentPage = parseInt(searchParams.get("page")) || 1;
  const searchQuery = searchParams.get("search") || "";
  const selectedTag = searchParams.get("tag") || "";
  const selectedCategory = searchParams.get("category") || "";

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: currentPage,
        limit: 9,
      };
      
      if (searchQuery) params.search = searchQuery;
      if (selectedTag) params.tag = selectedTag;
      if (selectedCategory) params.category = selectedCategory;

      const res = await postService.getAll(params);
      setPosts(res.data.posts || res.data || []);
      setPagination(res.data.pagination);
    } catch (err) {
      setError("Failed to load posts. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, selectedTag, selectedCategory]);

  const fetchFilters = useCallback(async () => {
    try {
      const [categoriesRes, tagsRes] = await Promise.all([
        categoryService.getAll().catch(() => ({ data: { categories: [] } })),
        postService.getTags().catch(() => ({ data: { tags: [] } })),
      ]);
      setCategories(categoriesRes.data.categories || categoriesRes.data || []);
      setTags(tagsRes.data.tags || []);
    } catch (err) {
      console.error("Failed to load filters", err);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page);
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const search = formData.get("search");
    
    const params = new URLSearchParams(searchParams);
    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }
    params.delete("page");
    setSearchParams(params);
  };

  const handleFilterChange = (type, value) => {
    const params = new URLSearchParams(searchParams);
    
    if (value) {
      params.set(type, value);
    } else {
      params.delete(type);
    }
    params.delete("page");
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const hasActiveFilters = searchQuery || selectedTag || selectedCategory;

  return (
    <div className="home-page">
      <SEO
        title={searchQuery ? `Search: ${searchQuery}` : null}
        description="Discover amazing stories, tutorials, and insights from our community of writers."
        keywords={["blog", "articles", "stories", "tutorials", "tech"]}
      />
      
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1 className="hero-title">Discover Amazing Stories</h1>
          <p className="hero-subtitle">
            Explore insightful articles, tutorials, and stories from our community
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              name="search"
              placeholder="Search articles..."
              defaultValue={searchQuery}
              className="search-input"
            />
            <button type="submit" className="search-btn">
              🔍 Search
            </button>
          </form>
        </div>
      </section>

      <div className="container">
        <div className="home-content">
          {/* Sidebar Filters */}
          <aside className="sidebar">
            {/* Categories */}
            {categories.length > 0 && (
              <div className="filter-section">
                <h3 className="filter-title">Categories</h3>
                <ul className="filter-list">
                  <li>
                    <button
                      className={`filter-item ${!selectedCategory ? "active" : ""}`}
                      onClick={() => handleFilterChange("category", "")}
                    >
                      All Categories
                    </button>
                  </li>
                  {categories.map((cat) => (
                    <li key={cat._id}>
                      <button
                        className={`filter-item ${selectedCategory === cat._id ? "active" : ""}`}
                        onClick={() => handleFilterChange("category", cat._id)}
                      >
                        <span
                          className="category-dot"
                          style={{ backgroundColor: cat.color }}
                        ></span>
                        {cat.name}
                        {cat.postCount > 0 && (
                          <span className="filter-count">{cat.postCount}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Popular Tags */}
            {tags.length > 0 && (
              <div className="filter-section">
                <h3 className="filter-title">Popular Tags</h3>
                <div className="tags-cloud">
                  {tags.slice(0, 15).map((tag) => (
                    <button
                      key={tag.name}
                      className={`tag-btn ${selectedTag === tag.name ? "active" : ""}`}
                      onClick={() =>
                        handleFilterChange("tag", selectedTag === tag.name ? "" : tag.name)
                      }
                    >
                      #{tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button onClick={clearFilters} className="clear-filters-btn">
                ✕ Clear all filters
              </button>
            )}
          </aside>

          {/* Main Content */}
          <main className="main-posts">
            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="active-filters">
                {searchQuery && (
                  <span className="active-filter">
                    Search: "{searchQuery}"
                    <button onClick={() => handleFilterChange("search", "")}>×</button>
                  </span>
                )}
                {selectedCategory && (
                  <span className="active-filter">
                    Category: {categories.find((c) => c._id === selectedCategory)?.name}
                    <button onClick={() => handleFilterChange("category", "")}>×</button>
                  </span>
                )}
                {selectedTag && (
                  <span className="active-filter">
                    Tag: #{selectedTag}
                    <button onClick={() => handleFilterChange("tag", "")}>×</button>
                  </span>
                )}
              </div>
            )}

            {/* Posts */}
            {loading ? (
              <Loader text="Loading posts..." />
            ) : error ? (
              <div className="error-message">
                <p>{error}</p>
                <button onClick={fetchPosts}>Try Again</button>
              </div>
            ) : posts.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📝</span>
                <h3>No posts found</h3>
                <p>
                  {hasActiveFilters
                    ? "Try adjusting your filters or search query."
                    : "Be the first to share your story!"}
                </p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="btn">
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="posts-header">
                  <h2 className="posts-title">
                    {hasActiveFilters ? "Search Results" : "Latest Posts"}
                  </h2>
                  <span className="posts-count">
                    {pagination?.totalItems || posts.length} article{posts.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="posts-grid">
                  {posts.map((post) => (
                    <PostCard key={post._id} post={post} />
                  ))}
                </div>

                <Pagination pagination={pagination} onPageChange={handlePageChange} />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
