<template>
  <div class="chart-container">
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';

Chart.register(...registerables);

interface Props {
  positions: Array<{
    closeTime: number;
    updateTime: number;
    netProfit: string;
    symbol: string;
  }>;
}

const props = defineProps<Props>();
const chartCanvas = ref<HTMLCanvasElement>();
let chart: Chart | null = null;

/**
 * Helper function to get the effective close time, using updateTime as fallback
 */
const getEffectiveCloseTime = (position: { closeTime: number; updateTime: number }): number => {
  return position.closeTime || position.updateTime;
};

const createChart = () => {
  if (!chartCanvas.value) return;

  // Process data for cumulative profit
  const sortedPositions = [...props.positions].sort(
    (a, b) => getEffectiveCloseTime(a) - getEffectiveCloseTime(b)
  );
  const cumulativeData: Array<{ x: number; y: number }> = [];
  let cumulativeProfit = 0;

  for (const position of sortedPositions) {
    cumulativeProfit += parseFloat(position.netProfit || '0');
    cumulativeData.push({
      x: getEffectiveCloseTime(position),
      y: cumulativeProfit,
    });
  }

  const ctx = chartCanvas.value.getContext('2d');
  if (!ctx) return;

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Cumulative Profit',
          data: cumulativeData,
          borderColor: '#28a745',
          backgroundColor: 'rgba(40, 167, 69, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#ffffff',
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          callbacks: {
            label: function (context) {
              return `Profit: $${(context.parsed.y as number).toFixed(2)}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day',
            displayFormats: {
              day: 'MMM dd',
            },
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
          },
          ticks: {
            color: '#ffffff',
            font: {
              size: 10,
            },
          },
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
          },
          ticks: {
            color: '#ffffff',
            font: {
              size: 10,
            },
            callback: function (value) {
              return '$' + (value as number).toFixed(0);
            },
          },
        },
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false,
      },
    },
  });
};

const updateChart = () => {
  if (chart) {
    chart.destroy();
  }
  createChart();
};

onMounted(() => {
  createChart();
});

watch(
  () => props.positions,
  () => {
    updateChart();
  },
  { deep: true }
);
</script>

<style scoped>
.chart-container {
  position: relative;
  height: 300px;
  width: 100%;
}
</style>
