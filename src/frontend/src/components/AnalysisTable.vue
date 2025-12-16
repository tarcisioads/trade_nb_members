<template>
  <div class="glass-card h-full flex flex-col">
    <div class="p-4 border-b border-white/10 bg-blue-500/10">
      <h5 class="flex items-center text-lg font-semibold text-blue-400">
        <i class="bi bi-table mr-2"></i>
        {{ title }}
      </h5>
    </div>
    <div class="overflow-x-auto overflow-y-auto max-h-96 flex-grow">
      <table class="w-full text-sm text-left">
        <thead class="text-xs uppercase bg-white/5 text-gray-400">
          <tr>
            <th class="px-4 py-3">{{ columnTitle }}</th>
            <th class="px-4 py-3 text-right">Trades</th>
            <th class="px-4 py-3 text-right">Profit</th>
            <th class="px-4 py-3 text-right">Loss</th>
            <th class="px-4 py-3 text-right">Avg Risk</th>
            <th class="px-4 py-3 text-right">Avg R:R</th>
            <th class="px-4 py-3 text-right">Avg Leverage</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          <tr v-for="(analysis, key) in data" :key="key" class="hover:bg-white/5 transition-colors">
            <td class="px-4 py-3 font-medium">
              <span class="px-2 py-1 bg-gray-700 rounded text-xs">{{ key }}</span>
            </td>
            <td class="px-4 py-3 text-right">{{ analysis.totalTrades }}</td>
            <td class="px-4 py-3 text-right text-green-400">${{ formatNumber(analysis.totalProfit) }}</td>
            <td class="px-4 py-3 text-right text-red-400">${{ formatNumber(analysis.totalLoss) }}</td>
            <td class="px-4 py-3 text-right text-yellow-400">{{ formatNumber(analysis.avgRisk) }}</td>
            <td class="px-4 py-3 text-right text-blue-400">{{ formatNumber(analysis.avgRR) }}</td>
            <td class="px-4 py-3 text-right text-purple-400">{{ formatNumber(analysis.avgLeverage) }}x</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface AnalysisData {
  totalTrades: number
  totalProfit: number
  totalLoss: number
  avgRisk: number
  avgRR: number
  avgLeverage: number
}

interface Props {
  title: string
  columnTitle: string
  data: { [key: string]: AnalysisData }
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