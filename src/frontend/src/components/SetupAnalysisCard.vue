<template>
  <div class="glass-card h-full flex flex-col">
    <div class="p-4 border-b border-white/10 bg-purple-500/10">
      <h5 class="flex items-center text-lg font-semibold text-purple-400">
        <i class="bi bi-tags mr-2"></i>
        Setup Analysis
      </h5>
    </div>
    <div class="overflow-x-auto overflow-y-auto max-h-96 flex-grow">
      <table class="w-full text-sm text-left">
        <thead class="text-xs uppercase bg-white/5 text-gray-400">
          <tr>
            <th class="px-4 py-3">Setup</th>
            <th class="px-4 py-3 text-right">Trades</th>
            <th class="px-4 py-3 text-right">Win Rate</th>
            <th class="px-4 py-3 text-right">Profit</th>
            <th class="px-4 py-3 text-right">Avg R:R</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          <tr v-for="(analysis, setup) in setupAnalysis" :key="setup" class="hover:bg-white/5 transition-colors">
            <td class="px-4 py-3">
              <span class="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-bold">{{ setup }}</span>
            </td>
            <td class="px-4 py-3 text-right">{{ analysis.totalTrades }}</td>
            <td class="px-4 py-3 text-right">
              <span :class="analysis.winRate >= 50 ? 'text-green-400' : 'text-red-400'">
                {{ analysis.winRate.toFixed(1) }}%
              </span>
            </td>
            <td class="px-4 py-3 text-right" :class="analysis.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'">
              ${{ formatNumber(analysis.totalProfit) }}
            </td>
            <td class="px-4 py-3 text-right text-blue-400">{{ formatNumber(analysis.avgRR) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface SetupAnalysis {
  totalTrades: number
  winRate: number
  totalProfit: number
  avgRR: number
}

interface Props {
  positions: any[]
}

const props = defineProps<Props>()

const setupAnalysis = computed(() => {
  const analysis: { [key: string]: SetupAnalysis } = {}
  
  props.positions.forEach(position => {
    if (position.tradeInfo?.found && position.tradeInfo.trade?.setup_description) {
      const setup = position.tradeInfo.trade.setup_description
      const netProfit = parseFloat(position.netProfit)
      
      if (!analysis[setup]) {
        analysis[setup] = {
          totalTrades: 0,
          winRate: 0,
          totalProfit: 0,
          avgRR: 0
        }
      }
      
      analysis[setup].totalTrades++
      analysis[setup].totalProfit += netProfit
      
      // Calcular win rate
      const wins = props.positions.filter(p => 
        p.tradeInfo?.found && 
        p.tradeInfo.trade?.setup_description === setup && 
        parseFloat(p.netProfit) > 0
      ).length
      
      analysis[setup].winRate = (wins / analysis[setup].totalTrades) * 100
      
      // Calcular RR médio
      const tradesWithRR = props.positions.filter(p => 
        p.tradeInfo?.found && 
        p.tradeInfo.trade?.setup_description === setup
      )
      
      let totalRR = 0
      let rrCount = 0
      
      tradesWithRR.forEach(trade => {
        const tradeData = trade.tradeInfo.trade
        const risk = Math.abs(tradeData.entry - tradeData.stop)
        if (risk > 0) {
          totalRR += Math.abs(parseFloat(trade.netProfit)) / risk
          rrCount++
        }
      })
      
      analysis[setup].avgRR = rrCount > 0 ? totalRR / rrCount : 0
    }
  })
  
  return analysis
})

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