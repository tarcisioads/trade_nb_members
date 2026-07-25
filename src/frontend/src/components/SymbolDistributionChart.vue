<template>
  <div class="chart-container">
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface Props {
  positions: Array<{
    symbol: string;
    netProfit: string;
  }>;
}

const props = defineProps<Props>();
const chartCanvas = ref<HTMLCanvasElement>();
let chart: Chart | null = null;

const createChart = () => {
  if (!chartCanvas.value) return;

  // Process data for symbol distribution
  const symbolData: { [key: string]: number } = {};

  props.positions.forEach((position) => {
    const symbol = position.symbol;
    const profit = parseFloat(position.netProfit || '0');

    if (!symbolData[symbol]) {
      symbolData[symbol] = 0;
    }
    symbolData[symbol] += profit;
  });

  const labels = Object.keys(symbolData);
  const data = Object.values(symbolData);

  // Generate colors
  const colors = [
    '#FF6384',
    '#36A2EB',
    '#FFCE56',
    '#4BC0C0',
    '#9966FF',
    '#FF9F40',
    '#FF6384',
    '#C9CBCF',
    '#4BC0C0',
    '#FF6384',
  ];

  const ctx = chartCanvas.value.getContext('2d');
  if (!ctx) return;

  chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#ffffff',
            font: {
              size: 11,
            },
            padding: 15,
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          callbacks: {
            label: function (context) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: $${value.toFixed(2)} (${percentage}%)`;
            },
          },
        },
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
