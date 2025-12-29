<template>
  <div class="chart-container">
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Chart, registerables } from 'chart.js'
import 'chartjs-adapter-date-fns'

Chart.register(...registerables)

interface Props {
  positions: Array<{
    openTime: number
    netProfit: string
  }>
}

const props = defineProps<Props>()
const chartCanvas = ref<HTMLCanvasElement>()
let chart: Chart | null = null

const createChart = () => {
  if (!chartCanvas.value) return

  // Process data for monthly performance based on openTime
  const monthlyData: { [key: string]: number } = {}
  
  props.positions.forEach(position => {
    const date = new Date(position.openTime)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const profit = parseFloat(position.netProfit || '0')
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = 0
    }
    monthlyData[monthKey] += profit
  })

  // Sort months chronologically
  const sortedMonths = Object.keys(monthlyData).sort()
  const labels = sortedMonths.map(month => {
    const [year, monthNum] = month.split('-')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${monthNames[parseInt(monthNum) - 1]} ${year}`
  })
  const data = sortedMonths.map(month => monthlyData[month])

  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Monthly Profit/Loss (By Open Date)',
        data: data,
        backgroundColor: data.map(value => value >= 0 ? 'rgba(40, 167, 69, 0.8)' : 'rgba(220, 53, 69, 0.8)'),
        borderColor: data.map(value => value >= 0 ? '#28a745' : '#dc3545'),
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          callbacks: {
            label: function(context) {
              const value = context.parsed.y as number
              return `Profit/Loss: $${value.toFixed(2)}`
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#ffffff',
            font: {
              size: 10
            },
            maxRotation: 45
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#ffffff',
            font: {
              size: 10
            },
            callback: function(value) {
              return '$' + (value as number).toFixed(0)
            }
          }
        }
      }
    }
  })
}

const updateChart = () => {
  if (chart) {
    chart.destroy()
  }
  createChart()
}

onMounted(() => {
  createChart()
})

watch(() => props.positions, () => {
  updateChart()
}, { deep: true })
</script>

<style scoped>
.chart-container {
  position: relative;
  height: 300px;
  width: 100%;
}
</style>
