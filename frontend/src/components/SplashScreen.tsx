import { useEffect } from "react";

interface SplashScreenProps {
  onDismiss: () => void;
}

export function SplashScreen({ onDismiss }: SplashScreenProps) {
  useEffect(() => {
    // Prevent body scrolling while splash is visible
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        onDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onDismiss]);

  return (
    <div
      className="splash-overlay"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Duplex0r PDF Interleaver"
    >
      {/* Background gradient effect */}
      <div className="splash-bg-effect" />

      {/* Animation container */}
      <div className="splash-animation-container">
        {/* Left PDF stack */}
        <div className="pdf-stack pdf-stack-left">
          <div className="pdf-page pdf-left-1">
            <div className="pdf-page-lines">
              <span /><span /><span /><span />
            </div>
          </div>
          <div className="pdf-page pdf-left-2">
            <div className="pdf-page-lines">
              <span /><span /><span /><span />
            </div>
          </div>
          <div className="pdf-page pdf-left-3">
            <div className="pdf-page-lines">
              <span /><span /><span /><span />
            </div>
          </div>
        </div>

        {/* Right PDF stack */}
        <div className="pdf-stack pdf-stack-right">
          <div className="pdf-page pdf-right-1">
            <div className="pdf-page-lines">
              <span /><span /><span /><span />
            </div>
          </div>
          <div className="pdf-page pdf-right-2">
            <div className="pdf-page-lines">
              <span /><span /><span /><span />
            </div>
          </div>
          <div className="pdf-page pdf-right-3">
            <div className="pdf-page-lines">
              <span /><span /><span /><span />
            </div>
          </div>
        </div>

        {/* Center merged document */}
        <div className="merged-document">
          <div className="merged-page merged-page-1" />
          <div className="merged-page merged-page-2" />
          <div className="merged-page merged-page-3" />
          <div className="merged-page merged-page-4" />
          <div className="merged-page merged-page-5" />
          <div className="merged-page merged-page-6" />
        </div>
      </div>

      {/* Title section */}
      <div className="splash-content">
        <h1 className="splash-title">Duplex0r</h1>
        <p className="splash-subtitle">PDF Interleaver</p>
        <p className="splash-description">
          No duplex scanner? Merge your odd and even page scans into one.
        </p>
      </div>

      {/* Click prompt */}
      <p className="splash-prompt">Click anywhere to continue</p>
    </div>
  );
}
