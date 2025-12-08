import "../styles/loader.css";

export default function Loader({ size = "medium", text = "Loading..." }) {
  return (
    <div className={`loader-container ${size}`}>
      <div className="loader-spinner"></div>
      {text && <p className="loader-text">{text}</p>}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="page-loader">
      <div className="loader-spinner large"></div>
    </div>
  );
}

export function ButtonLoader() {
  return <span className="button-loader"></span>;
}
