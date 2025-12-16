<template>
  <div class="glass-card h-full flex flex-col">
    <div class="p-4 border-b border-white/10 bg-green-500/10">
      <h5 class="flex items-center text-lg font-semibold text-green-400">
        <i class="bi bi-graph-up-arrow mr-2"></i>
        Performance Metrics
      </h5>
    </div>
    <div class="p-4 flex-grow">
      <div class="grid grid-cols-2 gap-4">
        <!-- Performance Ratios -->
        <div class="text-center p-3 rounded-lg bg-white/5">
          <div class="text-2xl font-bold text-green-400">{{ formatNumber(stats.sharpeRatio) }}</div>
          <div class="text-xs text-gray-400 mt-1">Sharpe Ratio</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-white/5">
          <div class="text-2xl font-bold text-blue-400">{{ formatNumber(stats.sortinoRatio) }}</div>
          <div class="text-xs text-gray-400 mt-1">Sortino Ratio</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-white/5">
          <div class="text-2xl font-bold text-yellow-400">{{ formatNumber(stats.calmarRatio) }}</div>
          <div class="text-xs text-gray-400 mt-1">Calmar Ratio</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-white/5">
          <div class="text-2xl font-bold text-blue-400">{{ formatNumber(stats.recoveryFactor) }}</div>
          <div class="text-xs text-gray-400 mt-1">Recovery Factor</div>
        </div>
      </div>
      
      <!-- Drawdown Info -->
      <div class="mt-4 space-y-3">
        <div class="flex justify-between items-center bg-white/5 p-2 rounded">
          <span class="text-gray-400 text-sm">Max Drawdown</span>
          <span class="px-2 py-1 text-xs font-bold text-red-900 bg-red-400 rounded">${{ formatNumber(stats.maxDrawdown) }}</span>
        </div>
        <div class="flex justify-between items-center bg-white/5 p-2 rounded">
          <span class="text-gray-400 text-sm">Avg Drawdown</span>
          <span class="px-2 py-1 text-xs font-bold text-yellow-900 bg-yellow-400 rounded">${{ formatNumber(stats.avgDrawdown) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  stats: {
    sharpeRatio: number
    sortinoRatio: number
    calmarRatio: number
    recoveryFactor: number
    maxDrawdown: number
    avgDrawdown: number
  }
}

const props = defineProps<Props>()

const formatNumber = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00'
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}
</script>

<style scoped>
/* Scoped styles removed */
</style> 