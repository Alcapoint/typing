import { useEffect, useRef, useState } from "react";

const LOADING_HINTS = [
  "Пожалуйста подождите",
  "Еще чуть-чуть",
  "Скоро все покажем",
  "Вот-вот и все готово",
  "Осталось немного",
];

const SERVICE_SYMBOLS = ["#", "@", "%", "&", "*", "+", "=", "?", "/", "\\", "[", "]", "{", "}", "!", "~"];
const SYMBOL_FILL_DURATION_MS = 500;
const LETTER_REVEAL_DURATION_MS = 500;
const HINT_DISPLAY_DURATION_MS = 2000;
const CYCLE_DURATION_MS =
  SYMBOL_FILL_DURATION_MS + LETTER_REVEAL_DURATION_MS + HINT_DISPLAY_DURATION_MS;

function getRandomServiceSymbol() {
  return SERVICE_SYMBOLS[Math.floor(Math.random() * SERVICE_SYMBOLS.length)];
}

function getRandomHintIndex(previousIndex) {
  if (LOADING_HINTS.length === 1) {
    return 0;
  }

  let nextIndex = previousIndex;

  while (nextIndex === previousIndex) {
    nextIndex = Math.floor(Math.random() * LOADING_HINTS.length);
  }

  return nextIndex;
}

function createRevealOrder(length) {
  const order = Array.from({ length }, (_, index) => index);

  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }

  return order;
}

function buildSymbolFrame(length, visibleCount) {
  return Array.from({ length }, (_, index) => (index < visibleCount ? getRandomServiceSymbol() : " ")).join("");
}

function buildRevealFrame(hint, revealedCount, revealOrder) {
  const characters = hint.split("").map(() => getRandomServiceSymbol());

  for (let index = 0; index < revealedCount; index += 1) {
    const revealIndex = revealOrder[index];
    characters[revealIndex] = hint[revealIndex];
  }

  return characters.join("");
}

function LoadingHint({ className = "", variant = "block" }) {
  const [displayText, setDisplayText] = useState("");
  const [isFinalTextVisible, setIsFinalTextVisible] = useState(false);
  const animationFrameRef = useRef(0);
  const previousHintIndexRef = useRef(-1);

  useEffect(() => {
    let isDisposed = false;

    const runCycle = () => {
      const hintIndex = getRandomHintIndex(previousHintIndexRef.current);
      const hint = LOADING_HINTS[hintIndex];
      const revealOrder = createRevealOrder(hint.length);
      const startedAt = performance.now();

      previousHintIndexRef.current = hintIndex;
      setIsFinalTextVisible(false);

      const animate = (timestamp) => {
        if (isDisposed) {
          return;
        }

        const elapsed = timestamp - startedAt;

        if (elapsed < SYMBOL_FILL_DURATION_MS) {
          const progress = elapsed / SYMBOL_FILL_DURATION_MS;
          const visibleCount = Math.min(hint.length, Math.ceil(progress * hint.length));
          setDisplayText(buildSymbolFrame(hint.length, visibleCount));
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }

        if (elapsed < SYMBOL_FILL_DURATION_MS + LETTER_REVEAL_DURATION_MS) {
          const progress = (elapsed - SYMBOL_FILL_DURATION_MS) / LETTER_REVEAL_DURATION_MS;
          const revealedCount = Math.min(hint.length, Math.ceil(progress * hint.length));
          setDisplayText(buildRevealFrame(hint, revealedCount, revealOrder));
          setIsFinalTextVisible(false);
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }

        if (elapsed < CYCLE_DURATION_MS) {
          setDisplayText(hint);
          setIsFinalTextVisible(true);
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }

        runCycle();
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    runCycle();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <span
      className={`loading-hint loading-hint-${variant} ${isFinalTextVisible ? "loading-hint-final" : "loading-hint-scramble"} ${className}`.trim()}
      aria-live="polite"
    >
      {displayText}
    </span>
  );
}

export default LoadingHint;
