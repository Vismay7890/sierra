import React from 'react';
import './OrbAnimation.css';

const OrbAnimation = () => {
  const particles = Array.from({ length: 300 });

  return (
    <div className="wrap">
      {particles.map((_, index) => (
        <div key={index} className="c" />
      ))}
    </div>
  );
};

export default OrbAnimation;
