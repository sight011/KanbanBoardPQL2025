import React from 'react';
import './DNASimple.css';

const DNASimple = ({ spacing = 0.8, count = 5 }) => (
  <div className="dna">
    {Array.from({ length: count }).map((_, i) => (
      <span
        className="nucleobase"
        key={i}
        style={i !== count - 1 ? { marginRight: `${spacing}px` } : {}}
      ></span>
    ))}
  </div>
);

export default DNASimple; 