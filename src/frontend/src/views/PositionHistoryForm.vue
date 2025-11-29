<template>
  <div class="container py-4">
    <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show mb-3" role="alert">
      {{ errorMessage }}
      <button type="button" class="btn-close" @click="errorMessage = ''" aria-label="Close"></button>
    </div>
    <div class="card shadow-sm">
      <div class="card-header">
        <h5 class="card-title mb-0">{{ isEditing ? 'Edit Position History' : 'Add New Position History' }}</h5>
      </div>
      <div class="card-body">
        <form @submit.prevent="savePositionHistory">
          <div class="mb-3">
            <label class="form-label">Symbol</label>
            <input v-model="positionHistoryData.symbol" type="text" class="form-control" required />
          </div>
          <div class="mb-3">
            <label class="form-label">Position ID</label>
            <input v-model="positionHistoryData.positionId" type="text" class="form-control" required />
          </div>
          <div class="mb-3">
            <label class="form-label">Position Side</label>
            <select v-model="positionHistoryData.positionSide" class="form-select" required>
              <option value="LONG">LONG</option>
              <option value="SHORT">SHORT</option>
            </select>
          </div>
          <div class="mb-3">
            <div class="form-check">
              <input v-model="positionHistoryData.isolated" type="checkbox" class="form-check-input" id="isolatedCheck" />
              <label class="form-check-label" for="isolatedCheck">Isolated</label>
            </div>
          </div>
          <div class="mb-3">
            <div class="form-check">
              <input v-model="positionHistoryData.closeAllPositions" type="checkbox" class="form-check-input" id="closeAllPositionsCheck" />
              <label class="form-check-label" for="closeAllPositionsCheck">Close All Positions</label>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label">Position Amount</label>
            <input v-model="positionHistoryData.positionAmt" type="text" class="form-control" required />
          </div>
          <div class="mb-3">
            <label class="form-label">Close Position Amount</label>
            <input v-model="positionHistoryData.closePositionAmt" type="text" class="form-control" required />
          </div>
          <div class="mb-3">
            <label class="form-label">Realised Profit</label>
            <input v-model="positionHistoryData.realisedProfit" type="text" class="form-control" required />
          </div>
          <div class="mb-3">
            <label class="form-label">Net Profit</label>
            <input v-model="positionHistoryData.netProfit" type="text" class="form-control" required />
          </div>
          <div class="mb-3">
            <label class="form-label">Average Close Price</label>
            <input v-model.number="positionHistoryData.avgClosePrice" type="number" step="any" class="form-control" required />
          </div>
          <div class="mb-3">
            <label class="form-label">Average Price</label>
            <input v-model="positionHistoryData.avgPrice" type="text" class="form-control" required />
          </div>
          <div class="mb-3">
            <label class="form-label">Leverage</label>
            <input v-model.number="positionHistoryData.leverage" type="number" step="any" class="form-control" required />
          </div>
          <div class="mb-3">
            <label class="form-label">Position Commission</label>
            <input v-model="positionHistoryData.positionCommission" type="text" class="form-control" required />
          </div>
          <div class="mb-3">
            <label class="form-label">Total Funding</label>
            <input v-model="positionHistoryData.totalFunding" type="text" class="form-control" required />
          </div>
          <div class="mb-3">
            <label class="form-label">Open Time (timestamp)</label>
            <input v-model.number="positionHistoryData.openTime" type="number" class="form-control" required />
          </div>
          <div class="mb-3">
            <label class="form-label">Update Time (timestamp)</label>
            <input v-model.number="positionHistoryData.updateTime" type="number" class="form-control" required />
          </div>
          <div class="mb-3">
            <label class="form-label">Close Time (timestamp)</label>
            <input v-model.number="positionHistoryData.closeTime" type="number" class="form-control" required />
          </div>
          <div class="text-end">
            <router-link to="/dashboard" class="btn btn-secondary me-2">Cancel</router-link>
            <button type="submit" class="btn btn-primary">Save</button>
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