<template>
  <div>
    <!-- Custom Toast -->
    <div v-if="toast.show" class="fixed bottom-4 right-4 z-50">
      <div class="glass-card p-4 flex items-center gap-3 border-l-4 border-green-500 animate-slide-up">
        <div class="text-green-400">
          <i class="bi bi-check-circle-fill text-xl"></i>
        </div>
        <div>
          <h6 class="font-bold text-white">Success</h6>
          <p class="text-sm text-gray-300">{{ toast.message }}</p>
        </div>
        <button @click="toast.show = false" class="ml-4 text-gray-400 hover:text-white">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    </div>
    <div v-if="trades.length === 0" class="text-center text-gray-400 p-8">
      No trade notifications received yet
    </div>
    <div v-else class="flex flex-col gap-4">
      <div v-for="(trade, index) in trades" :key="index" class="glass-card p-4 animate-fade-in">
        <div class="flex justify-between items-start">
          <div class="w-full">
            <div class="flex justify-between items-center mb-2">
              <h6 class="text-lg font-semibold text-white mb-0">{{ trade.symbol }}</h6>
              <small class="text-gray-400">{{ formatTimestamp(trade.timestamp) }}</small>
            </div>
            <div class="flex flex-wrap gap-3 text-sm">
              <span :class="trade.type === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'"
                class="px-2 py-1 rounded font-bold">
                {{ trade.type }}
              </span>
              <span class="text-gray-300">Entry: <span class="font-mono">{{ trade.entry }}</span></span>
              <span class="text-gray-300">Stop: <span class="font-mono">{{ trade.stop }}</span></span>
              <span class="px-2 py-1 bg-gray-700 rounded text-gray-300 text-xs">Interval: {{ trade.interval }}</span>
            </div>
            <div class="mt-3">
              <strong class="text-gray-400 text-sm">Take Profits:</strong>
              <div class="flex flex-wrap gap-2 mt-1">
                <span v-if="trade.takeProfits.tp1" class="px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded text-xs">TP1: {{ trade.takeProfits.tp1 }}</span>
                <span v-if="trade.takeProfits.tp2" class="px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded text-xs">TP2: {{ trade.takeProfits.tp2 }}</span>
                <span v-if="trade.takeProfits.tp3" class="px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded text-xs">TP3: {{ trade.takeProfits.tp3 }}</span>
                <span v-if="trade.takeProfits.tp4" class="px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded text-xs">TP4: {{ trade.takeProfits.tp4 }}</span>
                <span v-if="trade.takeProfits.tp5" class="px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded text-xs">TP5: {{ trade.takeProfits.tp5 }}</span>
                <span v-if="trade.takeProfits.tp6" class="px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded text-xs">TP6: {{ trade.takeProfits.tp6 }}</span>
              </div>
            </div>
            <div class="mt-3">
              <div class="flex flex-wrap gap-2 items-center text-xs">
                <span :class="trade.validation.isValid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'"
                  class="px-2 py-1 rounded font-bold">
                  {{ trade.validation.isValid ? 'Valid' : 'Invalid' }}
                </span>
                <span v-if="trade.isWarning" class="px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded font-bold">
                  ⚠️ Warning
                </span>
                <span :class="trade.volume_required ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'"
                  class="px-2 py-1 rounded">
                  {{ trade.volume_required ? 'Volume Required' : 'Volume Optional' }}
                </span>
                <span :class="trade.volume_adds_margin ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'"
                  class="px-2 py-1 rounded">
                  {{ trade.volume_adds_margin ? 'Adds Margin' : 'No Extra Margin' }}
                </span>
                <span :class="trade.manually_generated ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-gray-400'"
                  class="px-2 py-1 rounded">
                  {{ trade.manually_generated ? 'Manual' : 'Auto' }}
                </span>
                <small class="text-gray-400 block w-full mt-1">{{ trade.validation.message }}</small>
              </div>
              <div class="mt-2 text-xs text-gray-400">
                <div class="flex items-center gap-1">
                  <span>Entry Analysis:</span>
                  <span class="text-gray-300">{{ trade.validation.entryAnalysis.message }}</span>
                </div>
              </div>
              <div class="mt-1 text-xs text-gray-400">
                Volume: {{ trade.validation.volumeAnalysis.currentVolume.toFixed(2) }}
                (std: {{ trade.validation.volumeAnalysis.stdBar.toFixed(2) }})
                <span class="ml-1 font-bold" :class="{
                  'text-red-400': trade.validation.volumeAnalysis.color === 'RED',
                  'text-yellow-400': trade.validation.volumeAnalysis.color === 'ORANGE',
                  'text-yellow-200': trade.validation.volumeAnalysis.color === 'YELLOW',
                  'text-gray-400': trade.validation.volumeAnalysis.color === 'WHITE',
                  'text-blue-400': trade.validation.volumeAnalysis.color === 'BLUE'
                }">
                  [{{ trade.validation.volumeAnalysis.color }}]
                </span>
              </div>
              <div v-if="trade.setup_description" class="mt-3">
                <div class="bg-white/5 rounded p-3 border border-white/10">
                  <h6 class="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-top">Setup Description</h6>
                  <p class="text-sm text-gray-300 m-0">{{ trade.setup_description }}</p>
                </div>
              </div>
            </div>

            <!-- Execution Results Section -->
            <div v-if="trade.executionResult" class="mt-3">
              <div class="bg-blue-500/10 rounded p-3 border border-blue-500/20">
                <h6 class="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wide">Execution Results</h6>
                <div class="flex flex-col gap-1 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-400">Leverage:</span>
                    <span class="font-bold text-white font-mono">{{ trade.executionResult.leverage }}x</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-400">Quantity:</span>
                    <span class="font-bold text-white font-mono">{{ trade.executionResult.quantity.toFixed(4) }}</span>
                  </div>
                  <div v-if="trade.volume_adds_margin && trade.executionResult.volumeMarginAdded"
                    class="mt-1 pt-1 border-t border-white/10">
                    <div class="flex justify-between">
                      <span class="text-gray-400">Volume Margin:</span>
                      <span class="font-bold text-green-400 font-mono">+{{ trade.executionResult.volumeMarginAdded.percentage
                      }}%</span>
                    </div>
                  </div>
                  <div v-if="trade.sentiment_adds_margin && trade.executionResult.sentimentMarginAdded"
                    class="mt-1 pt-1 border-t border-white/10">
                    <div class="flex justify-between">
                      <span class="text-gray-400">Sentiment Margin:</span>
                      <span class="font-bold text-green-400 font-mono">+{{ trade.executionResult.sentimentMarginAdded.percentage
                      }}%</span>
                    </div>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-400">Entry Order:</span>
                    <span class="font-mono text-gray-300 truncate max-w-[150px]">{{ trade.executionResult.entryOrderId
                    }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-400">Stop Order:</span>
                    <span class="font-mono text-gray-300 truncate max-w-[150px]">{{ trade.executionResult.stopOrderId
                    }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Execution Error Section -->
            <div v-if="trade.executionError" class="mt-3">
              <div class="bg-red-500/10 rounded p-3 border border-red-500/20 text-red-300 text-sm flex items-start gap-2">
                <i class="bi bi-exclamation-triangle-fill mt-0.5"></i>
                <span>Execution Error: {{ trade.executionError }}</span>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-white/5">
              <div class="flex gap-2">
                <a :href="trade.analysisUrl" target="_blank" class="px-3 py-1.5 border border-blue-500 text-blue-400 rounded hover:bg-blue-500/10 transition-colors text-sm">
                  View Analysis
                </a>
                <template v-if="trade.isWarning">
                  <button @click="enterMarket(trade)" class="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm disabled:opacity-50" :disabled="trade.isLoading">
                    <span v-if="trade.isLoading" class="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-1"></span>
                    {{ trade.isLoading ? 'Entering...' : 'Enter Market' }}
                  </button>
                  <button @click="enterMarketWithTP1(trade)" class="px-3 py-1.5 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm disabled:opacity-50"
                    :disabled="trade.isLoadingTP1">
                    <span v-if="trade.isLoadingTP1" class="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-1"></span>
                    {{ trade.isLoadingTP1 ? 'Entering...' : 'Enter Market (TP1 Adjusted)' }}
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, ref, reactive } from 'vue'
import { TradeNotification } from '../../../utils/types'
import axios from 'axios'

const props = defineProps<{
  trades: TradeNotification[]
}>()

const toast = reactive({
  show: false,
  message: ''
})

// Add loading states to trades
const trades = ref(props.trades.map(trade => ({
  ...trade,
  isLoading: false,
  isLoadingTP1: false
})))

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

const showSuccessToast = (message = 'Trade executed successfully!') => {
  toast.message = message
  toast.show = true
  setTimeout(() => {
    toast.show = false
  }, 3000)
}

const enterMarket = async (trade: TradeNotification) => {
  const tradeIndex = trades.value.findIndex(t => t === trade)
  if (tradeIndex === -1) return

  trades.value[tradeIndex].isLoading = true
  try {
    await axios.post('/api/trade/market', trade)
    showSuccessToast()
  } catch (error) {
    console.error('Error entering market:', error)
    alert('Failed to enter market. Please try again.')
  } finally {
    trades.value[tradeIndex].isLoading = false
  }
}

const enterMarketWithTP1 = async (trade: TradeNotification) => {
  const tradeIndex = trades.value.findIndex(t => t === trade)
  if (tradeIndex === -1) return

  trades.value[tradeIndex].isLoadingTP1 = true
  try {
    await axios.post('/api/trade/market/tp_adjusted', trade)
    showSuccessToast()
  } catch (error) {
    console.error('Error entering market with modified TP1:', error)
    alert('Failed to enter market with modified TP1. Please try again.')
  } finally {
    trades.value[tradeIndex].isLoadingTP1 = false
  }
}
</script>

<style scoped>
/* Scoped styles removed */
</style> 
