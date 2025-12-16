<template>
  <div class="glass-card">
    <div class="p-4 border-b border-white/10 flex justify-between items-center bg-blue-600/20">
      <h5 class="text-lg font-semibold text-white mb-0">Histórico de Posições</h5>
      <div class="flex gap-2">
        <select v-model="pageSize" @change="emitPagination" class="bg-gray-900/50 border border-gray-700 rounded-lg px-2 py-1 text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none">
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
    </div>
    <div class="p-0">
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs uppercase bg-gray-800 text-gray-400">
            <tr>
              <th class="px-4 py-3">Símbolo</th>
              <th class="px-4 py-3">Tipo</th>
              <th class="px-4 py-3">Quantidade</th>
              <th class="px-4 py-3">Preço Médio</th>
              <th class="px-4 py-3">Preço Fechamento</th>
              <th class="px-4 py-3">Alavancagem</th>
              <th class="px-4 py-3">Resultado</th>
              <th class="px-4 py-3">Data Abertura</th>
              <th class="px-4 py-3">Data Fechamento</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr v-for="position in positions" :key="position.positionId" class="hover:bg-white/5 transition-colors">
              <td class="px-4 py-3">
                <span class="px-2 py-1 bg-blue-600/20 text-blue-300 rounded text-xs font-bold">{{ position.symbol }}</span>
              </td>
              <td class="px-4 py-3">
                <span 
                  class="px-2 py-1 rounded text-xs font-bold" 
                  :class="position.positionSide === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'"
                >
                  {{ position.positionSide }}
                </span>
              </td>
              <td class="px-4 py-3 font-mono">{{ position.closePositionAmt }}</td>
              <td class="px-4 py-3 font-mono">${{ formatNumber(parseFloat(position.avgPrice)) }}</td>
              <td class="px-4 py-3 font-mono">${{ formatNumber(position.avgClosePrice) }}</td>
              <td class="px-4 py-3 font-mono">{{ position.leverage }}x</td>
              <td class="px-4 py-3">
                <span 
                  class="font-bold" 
                  :class="parseFloat(position.netProfit) >= 0 ? 'text-green-400' : 'text-red-400'"
                >
                  ${{ formatNumber(parseFloat(position.netProfit)) }}
                </span>
              </td>
              <td class="px-4 py-3 text-xs text-gray-400">{{ formatDate(position.openTime) }}</td>
              <td class="px-4 py-3 text-xs text-gray-400">{{ formatDate(getEffectiveCloseTime(position)) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Paginação -->
      <nav v-if="pagination.total > 0" class="p-4 border-t border-white/10 flex justify-center">
        <ul class="flex gap-2">
          <li>
            <button 
              class="px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-white/10"
              :disabled="pagination.pageIndex <= 1"
              @click.prevent="changePage(pagination.pageIndex - 1)"
            >
              Anterior
            </button>
          </li>
          <li>
            <span class="px-3 py-1 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30">
              Página {{ pagination.pageIndex }} de {{ Math.ceil(pagination.total / pagination.pageSize) }}
            </span>
          </li>
          <li>
            <button 
              class="px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-white/10"
              :disabled="pagination.pageIndex >= Math.ceil(pagination.total / pagination.pageSize)"
              @click.prevent="changePage(pagination.pageIndex + 1)"
            >
              Próxima
            </button>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PositionHistory } from '../types/positionHistory'

interface Pagination {
  pageIndex: number
  pageSize: number
  total: number
}

interface Props {
  positions: PositionHistory[]
  pagination: Pagination
}

const props = defineProps<Props>()

const emit = defineEmits<{
  paginationChanged: [pagination: Pagination]
}>()

const pageSize = ref(props.pagination.pageSize)

const emitPagination = () => {
  emit('paginationChanged', {
    pageIndex: 1,
    pageSize: pageSize.value,
    total: props.pagination.total
  })
}

const changePage = (page: number) => {
  if (page >= 1 && page <= Math.ceil(props.pagination.total / props.pagination.pageSize)) {
    emit('paginationChanged', {
      pageIndex: page,
      pageSize: props.pagination.pageSize,
      total: props.pagination.total
    })
  }
}

const formatNumber = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00'
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('pt-BR')
}

/**
 * Helper function to get the effective close time, using updateTime as fallback
 */
const getEffectiveCloseTime = (position: PositionHistory): number => {
  return position.closeTime || position.updateTime
}
</script>

<style scoped>
/* Scoped styles removed */
</style> 