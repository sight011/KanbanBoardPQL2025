import React from 'react';
import './DNA.css';

const DNA = ({
  visible = true,
  height = "80",
  width = "80",
  ariaLabel = "dna-loading",
  wrapperStyle = {},
  wrapperClass = "dna-wrapper"
}) => {
  if (!visible) return null;

  return (
    <div
      className={wrapperClass}
      style={{
        ...wrapperStyle,
        width: `${width}px`,
        height: `${height}px`
      }}
      aria-label={ariaLabel}
    >
      <div className="dna">
        <div className="dna-row">
          {[...Array(12)].map((_, i) => (
            <div key={`top-${i}`} className="dna-dot" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
        <div className="dna-row">
          {[...Array(12)].map((_, i) => (
            <div key={`bottom-${i}`} className="dna-dot" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DNA; 