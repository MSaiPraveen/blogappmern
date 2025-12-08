import { Helmet } from "react-helmet-async";

const SITE_NAME = "BlogApp";
const SITE_URL = import.meta.env.VITE_SITE_URL || "http://localhost:5173";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

/**
 * SEO Component with Open Graph, Twitter Cards, and JSON-LD support
 */
export default function SEO({
  title,
  description = "Discover amazing stories, tutorials, and insights on our blog platform.",
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  article = null,
  author = null,
  keywords = [],
  noIndex = false,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const canonicalUrl = url || SITE_URL;

  // JSON-LD Structured Data
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const articleSchema = article
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: article.title,
        description: article.excerpt || description,
        image: article.image || image,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt || article.publishedAt,
        author: {
          "@type": "Person",
          name: author?.name || author?.username || "Anonymous",
          url: author?.username ? `${SITE_URL}/user/${author.username}` : undefined,
        },
        publisher: {
          "@type": "Organization",
          name: SITE_NAME,
          logo: {
            "@type": "ImageObject",
            url: `${SITE_URL}/logo.png`,
          },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": canonicalUrl,
        },
        keywords: article.tags?.join(", ") || keywords.join(", "),
      }
    : null;

  const profileSchema = author && !article
    ? {
        "@context": "https://schema.org",
        "@type": "Person",
        name: author.name || author.username,
        url: `${SITE_URL}/user/${author.username}`,
        image: author.avatar,
        description: author.bio,
      }
    : null;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords.length > 0 && <meta name="keywords" content={keywords.join(", ")} />}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Article specific meta */}
      {article && (
        <>
          <meta property="article:published_time" content={article.publishedAt} />
          {article.updatedAt && (
            <meta property="article:modified_time" content={article.updatedAt} />
          )}
          {author?.username && (
            <meta property="article:author" content={author.username} />
          )}
          {article.tags?.map((tag, i) => (
            <meta key={i} property="article:tag" content={tag} />
          ))}
        </>
      )}

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
      
      {articleSchema && (
        <script type="application/ld+json">
          {JSON.stringify(articleSchema)}
        </script>
      )}
      
      {profileSchema && (
        <script type="application/ld+json">
          {JSON.stringify(profileSchema)}
        </script>
      )}
    </Helmet>
  );
}
