import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const BRAND_WORDS = ["fast", "accurate", "easy", "smooth"];

function BrandLogo() {
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [isPressed, setIsPressed] = useState(false);
  const pressTimeoutRef = useRef(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveWordIndex((currentIndex) => (currentIndex + 1) % BRAND_WORDS.length);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => () => {
    if (pressTimeoutRef.current) {
      window.clearTimeout(pressTimeoutRef.current);
    }
  }, []);

  const animatePress = () => {
    if (pressTimeoutRef.current) {
      window.clearTimeout(pressTimeoutRef.current);
    }

    setIsPressed(true);
    pressTimeoutRef.current = window.setTimeout(() => {
      setIsPressed(false);
    }, 180);
  };

  return (
    <Link
      className={`brand-link ${isPressed ? "is-pressed" : ""}`}
      to="/"
      aria-label="TYPE"
      onMouseDown={animatePress}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          animatePress();
        }
      }}
    >
      <span className="brand-logo-mark" aria-hidden="true">
        <span className="brand-key brand-key-t">T</span>
        <span className="brand-key brand-key-y">Y</span>
        <span className="brand-key brand-key-p">P</span>
        <span className="brand-key brand-key-e">E</span>
      </span>

      <span className="brand-reveal" aria-hidden="true">
        <span className="brand-slash">/TYPE</span>
        <span className="brand-word-window">
          <span
            className="brand-word-track"
            style={{ transform: `translateY(calc(-1 * ${activeWordIndex} * var(--brand-word-height)))` }}
          >
            {BRAND_WORDS.map((word) => (
              <span key={word} className="brand-word">
                {word}
              </span>
            ))}
          </span>
        </span>
      </span>
    </Link>
  );
}

export default BrandLogo;
