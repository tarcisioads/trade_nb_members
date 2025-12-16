<template>
  <div class="glass-card h-full flex flex-col">
    <div class="p-4 border-b border-white/10">
      <h5 class="text-lg font-semibold text-white mb-0">{{ title }}</h5>
    </div>
    <div class="p-4 flex-grow" style="min-height: 300px;">
      <canvas ref="chartCanvas" :height="height"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

interface Props {
  title: string
  type: 'bar' | 'line' | 'doughnut' | 'pie'
  data: {
    labels: string[]
    datasets: {
      label: string
      data: number[]
      backgroundColor?: string | string[]
      borderColor?: string | string[]
      borderWidth?: number
    }[]
  }
  options?: any
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  height: 300
})

const chartCanvas = ref<HTMLCanvasElement>()
let chart: Chart | null = null

const createChart = () => {
  if (!chartCanvas.value) return

  // Destruir chart anterior se existir
  if (chart) {
    chart.destroy()
  }

  chart = new Chart(chartCanvas.value, {
    type: props.type,
    data: props.data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      ...props.options
    }
  })
}

const updateChart = () => {
  if (chart) {
    chart.data = props.data
    chart.update()
  }
}

onMounted(() => {
  createChart()
})

onUnmounted(() => {
  if (chart) {
    chart.destroy()
  }
})

watch(() => props.data, updateChart, { deep: true })
</script>

<style scoped>
/* Scoped styles removed */
</style> 