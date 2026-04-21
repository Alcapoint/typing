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

function TrainingMiniChart({ words = [], compact = false }) {
  const safeWords = words.length ? words : [{ wpm: 0, errors: 0 }];

  const chartData = {
    labels: safeWords.map((_, index) => index + 1),
    datasets: [
      {
        label: "WPM",
        data: safeWords.map((word) => word.wpm),
        borderColor: "#e2b714",
        tension: 0.35,
        borderWidth: compact ? 2 : 3,
        pointRadius: compact ? 0 : 2,
      },
      {
        label: "Accuracy",
        data: safeWords.map((word) => Math.max(0, 100 - (word.errors * 10))),
        borderColor: "#4fc3f7",
        tension: 0.35,
        borderWidth: compact ? 2 : 3,
        pointRadius: compact ? 0 : 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: !compact,
      },
    },
    scales: {
      x: {
        display: !compact,
        grid: {
          color: "rgba(255,255,255,0.05)",
        },
      },
      y: {
        display: !compact,
        grid: {
          color: "rgba(255,255,255,0.05)",
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
}

export default TrainingMiniChart;
