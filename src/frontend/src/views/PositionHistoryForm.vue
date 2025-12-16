<template>
  <div class="container mx-auto px-4 py-8">
    <div v-if="errorMessage" class="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded mb-6 flex justify-between items-center animate-fade-in" role="alert">
      <span>{{ errorMessage }}</span>
      <button type="button" class="text-red-400 hover:text-white transition-colors" @click="errorMessage = ''" aria-label="Close">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
    
    <div class="max-w-2xl mx-auto glass-card animate-slide-up">
      <div class="p-6 border-b border-white/10">
        <h5 class="text-xl font-bold text-white mb-0">{{ isEditing ? 'Edit Position History' : 'Add New Position History' }}</h5>
      </div>
      <div class="p-6">
        <form @submit.prevent="savePositionHistory" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Symbol</label>
              <input v-model="positionHistoryData.symbol" type="text" class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Position ID</label>
              <input v-model="positionHistoryData.positionId" type="text" class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Position Side</label>
              <select v-model="positionHistoryData.positionSide" class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none appearance-none" required>
                <option value="LONG">LONG</option>
                <option value="SHORT">SHORT</option>
              </select>
            </div>
            <div class="md:col-span-2">
              <div class="flex gap-6 p-4 bg-gray-800/30 rounded-xl border border-white/5">
                <div class="flex items-center gap-3">
                  <input v-model="positionHistoryData.isolated" type="checkbox" class="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500/50 focus:ring-offset-0" id="isolatedCheck" />
                  <label class="text-gray-300 cursor-pointer select-none" for="isolatedCheck">Isolated</label>
                </div>
                <div class="flex items-center gap-3">
                  <input v-model="positionHistoryData.closeAllPositions" type="checkbox" class="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500/50 focus:ring-offset-0" id="closeAllPositionsCheck" />
                  <label class="text-gray-300 cursor-pointer select-none" for="closeAllPositionsCheck">Close All Positions</label>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Position Amount</label>
              <input v-model="positionHistoryData.positionAmt" type="text" class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none font-mono" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Close Position Amount</label>
              <input v-model="positionHistoryData.closePositionAmt" type="text" class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none font-mono" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Realised Profit</label>
              <input v-model="positionHistoryData.realisedProfit" type="text" class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none font-mono" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Net Profit</label>
              <input v-model="positionHistoryData.netProfit" type="text" class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none font-mono" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Average Close Price</label>
              <input v-model.number="positionHistoryData.avgClosePrice" type="number" step="any" class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none font-mono" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Average Price</label>
              <input v-model="positionHistoryData.avgPrice" type="text" class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none font-mono" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Leverage</label>
              <input v-model.number="positionHistoryData.leverage" type="number" step="any" class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none font-mono" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Position Commission</label>
              <input v-model="positionHistoryData.positionCommission" type="text" class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none font-mono" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">Total Funding</label>
              <input v-model="positionHistoryData.totalFunding" type="text" class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none font-mono" required />
            </div>
          </div>

          <div class="border-t border-white/10 pt-6 mt-6">
            <h6 class="text-sm font-semibold text-gray-400 mb-4">Timestamps</h6>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-2">Open Time</label>
                <input v-model.number="positionHistoryData.openTime" type="number" class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none font-mono" required />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-2">Update Time</label>
                <input v-model.number="positionHistoryData.updateTime" type="number" class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none font-mono" required />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-2">Close Time</label>
                <input v-model.number="positionHistoryData.closeTime" type="number" class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none font-mono" required />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-4 pt-4 border-t border-white/10">
            <router-link to="/dashboard" class="px-6 py-2.5 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-all">Cancel</router-link>
            <button type="submit" class="btn-primary px-8">Save</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PositionHistory } from '../../../utils/types'

const route = useRoute()
const router = useRouter()

const positionHistoryData = ref<PositionHistory>({
  symbol: '',
  positionId: '',
  positionSide: 'LONG',
  isolated: false,
  closeAllPositions: false,
  positionAmt: '',
  closePositionAmt: '',
  realisedProfit: '',
  netProfit: '',
  avgClosePrice: 0,
  avgPrice: '',
  leverage: 1,
  positionCommission: '',
  totalFunding: '',
  openTime: 0,
  updateTime: 0,
  closeTime: 0,
  tradeInfo: null
})

const isEditing = computed(() => route.params.id !== undefined)
const errorMessage = ref('')

onMounted(async () => {
  if (isEditing.value) {
    try {
      const response = await fetch(`/api/position-history/${route.params.id}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to load position history')
      }
      const position = await response.json()
      positionHistoryData.value = position
    } catch (error) {
      console.error('Failed to load position history:', error)
      errorMessage.value = error instanceof Error ? error.message : 'Failed to load position history'
    }
  }
})

const sanitizePositionHistoryData = (data: Record<string, any>) => {
  const sanitized: Record<string, any> = { ...data };
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string' && sanitized[key].trim() === '') {
      sanitized[key] = null;
    }
  }
  return sanitized;
}

const savePositionHistory = async () => {
  try {
    errorMessage.value = ''
    const url = isEditing.value ? `/api/position-history/${route.params.id}` : '/api/position-history'
    const method = isEditing.value ? 'PUT' : 'POST'
    const sanitizedData = sanitizePositionHistoryData(positionHistoryData.value)
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizedData)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to save position history')
    }
    router.push('/')
  } catch (error) {
    console.error('Failed to save position history:', error)
    errorMessage.value = error instanceof Error ? error.message : 'Failed to save position history'
  }
}
</script> 