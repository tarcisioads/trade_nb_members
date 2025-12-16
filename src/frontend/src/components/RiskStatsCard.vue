<template>
  <div class="glass-card h-full flex flex-col">
    <div class="p-4 border-b border-white/10 bg-red-500/10">
      <h5 class="flex items-center text-lg font-semibold text-red-400">
        <i class="bi bi-shield-exclamation mr-2"></i>
        Risk-Reward Analysis
      </h5>
    </div>
    <div class="p-4 flex-grow">
      <div class="grid grid-cols-2 gap-4">
        <!-- Risk Metrics -->
        <div class="text-center p-3 rounded-lg bg-white/5">
          <div class="text-2xl font-bold text-yellow-400">{{ formatNumber(stats.avgRiskPerTrade) }}</div>
          <div class="text-xs text-gray-400 mt-1">Avg Risk/Trade</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-white/5">
          <div class="text-2xl font-bold text-blue-400">{{ formatNumber(stats.avgRiskRewardRatio) }}</div>
          <div class="text-xs text-gray-400 mt-1">Avg R:R Ratio</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-white/5">
          <div class="text-2xl font-bold text-green-400">{{ formatNumber(stats.sharpeRatio) }}</div>
          <div class="text-xs text-gray-400 mt-1">Sharpe Ratio</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-white/5">
          <div class="text-2xl font-bold text-red-400">{{ formatNumber(stats.maxDrawdown) }}</div>
          <div class="text-xs text-gray-400 mt-1">Max Drawdown</div>
        </div>
      </div>
      
      <!-- Additional Metrics -->
      <div class="mt-4 space-y-3">
        <div class="flex justify-between items-center bg-white/5 p-2 rounded">
          <span class="text-gray-400 text-sm">Positive R:R Trades</span>
          <span class="px-2 py-1 text-xs font-bold text-green-900 bg-green-400 rounded">{{ stats.tradesWithPositiveRR }}</span>
        </div>
        <div class="flex justify-between items-center bg-white/5 p-2 rounded">
          <span class="text-gray-400 text-sm">Avg R:R Positive Trades</span>
          <span class="px-2 py-1 text-xs font-bold text-blue-900 bg-blue-400 rounded">{{ formatNumber(stats.avgRiskReturnedPositive) }}</span>
        </div>
        <div class="flex justify-between items-center bg-white/5 p-2 rounded">
          <span class="text-gray-400 text-sm">Negative R:R Trades</span>
          <span class="px-2 py-1 text-xs font-bold text-red-900 bg-red-400 rounded">{{ stats.tradesWithNegativeRR }}</span>
        </div>
        <div class="flex justify-between items-center bg-white/5 p-2 rounded">
          <span class="text-gray-400 text-sm">Best R:R Ratio</span>
          <span class="px-2 py-1 text-xs font-bold text-gray-900 bg-gray-400 rounded">{{ formatNumber(stats.bestRiskRewardRatio) }}</span>
        </div>
        <div class="flex justify-between items-center bg-white/5 p-2 rounded">
          <span class="text-gray-400 text-sm">Worst R:R Ratio</span>
          <span class="px-2 py-1 text-xs font-bold text-yellow-900 bg-yellow-400 rounded">{{ formatNumber(stats.worstRiskRewardRatio) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  stats: {
    avgRiskPerTrade: number
    avgRiskRewardRatio: number
    sharpeRatio: number
    maxDrawdown: number
    tradesWithPositiveRR: number
    tradesWithNegativeRR: number
    bestRiskRewardRatio: number
    worstRiskRewardRatio: number
    avgRiskReturnedPositive: number
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