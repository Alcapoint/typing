export function getIsMobileViewport() {
  if (typeof window === "undefined") {
    return false;
  }

  const hasTouch = window.matchMedia("(pointer: coarse)").matches;
  const isNarrow = window.matchMedia("(max-width: 900px)").matches;
  const mobileAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    window.navigator.userAgent
  );

  return mobileAgent || (hasTouch && isNarrow);
}
