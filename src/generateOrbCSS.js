export const generateOrbCSS = () => {
  let css = '';
  for (let i = 1; i <= 300; i++) {
    const z = Math.random() * 360;
    const y = Math.random() * 360;
    css += `
      .c:nth-child(${i}) {
        animation: orbit${i} 14s infinite;
        animation-delay: ${i * 0.01}s;
        background-color: hsla(240, 100%, 50%, 1); /* Initial blue color */
      }

      @keyframes orbit${i} {
        20% {
          opacity: 1; /* fade in */
        }
        30% {
          transform: rotateZ(-${z}deg) rotateY(${y}deg) translateX(100px) rotateZ(${z}deg); /* form orb */
        }
        80% {
          transform: rotateZ(-${z}deg) rotateY(${y}deg) translateX(100px) rotateZ(${z}deg); /* hold orb state 30-80 */
          opacity: 1; /* hold opacity 20-80 */
        }
        100% {
          transform: rotateZ(-${z}deg) rotateY(${y}deg) translateX(300px) rotateZ(${z}deg); /* translateX * 3 */
        }
      }
    `;
  }
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = css;
  document.head.appendChild(styleSheet);
};
