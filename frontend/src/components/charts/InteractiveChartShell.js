import { useEffect, useMemo, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
);

function InteractiveChartShell({
  data,
  className = "chart-container-large",
  plugins = [],
  getOptions,
  renderTooltip,
  renderOverlay,
  onContainerClick,
  onContainerMouseLeave,
}) {
  const [activeState, setActiveState] = useState(null);
  const [displayState, setDisplayState] = useState(null);
  const [isDisplayVisible, setIsDisplayVisible] = useState(false);
  const containerRef = useRef(null);
  const hideTimerRef = useRef(null);

  const clearActiveState = (options = {}) => {
    const { immediate = false } = options;
    if (immediate) {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      setActiveState(null);
      setDisplayState(null);
      setIsDisplayVisible(false);
      return;
    }
    setActiveState(null);
  };

  useEffect(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (activeState) {
      setDisplayState(activeState);
      setIsDisplayVisible(true);
      return undefined;
    }

    setIsDisplayVisible(false);
    hideTimerRef.current = window.setTimeout(() => {
      setDisplayState(null);
      hideTimerRef.current = null;
    }, 160);

    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [activeState]);

  const options = useMemo(() => (
    getOptions({
      activeState,
      setActiveState,
      clearActiveState,
      containerRef,
    })
  ), [activeState, getOptions]);

  return (
    <div
      className={`chart-container ${className}`}
      ref={containerRef}
      onMouseLeave={(event) => {
        onContainerMouseLeave?.(event, { activeState, clearActiveState });
        if (!event.defaultPrevented) {
          clearActiveState();
        }
      }}
      onClick={(event) => {
        onContainerClick?.(event, { activeState, clearActiveState, setActiveState, containerRef });
      }}
    >
      <Line data={data} options={options} plugins={plugins} />
      {renderOverlay?.({
        activeState: displayState,
        liveActiveState: activeState,
        isActiveVisible: isDisplayVisible,
        setActiveState,
        clearActiveState,
        containerRef,
      })}
      {renderTooltip?.({
        activeState: displayState,
        isActiveVisible: isDisplayVisible,
        setActiveState,
        clearActiveState,
        containerRef,
      })}
    </div>
  );
}

export default InteractiveChartShell;
