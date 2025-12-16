<template>
  <div class="glass-card">
    <div class="p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div>
          <label for="symbolFilter" class="block text-sm font-semibold mb-2 text-gray-400">Símbolo</label>
          <select v-model="filters.symbol" @change="emitFilters" class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" id="symbolFilter">
            <option value="ALL">Todos os Símbolos</option>
            <option v-for="symbol in availableSymbols" :key="symbol" :value="symbol">
              {{ symbol }}
            </option>
          </select>
        </div>
        <div>
          <label for="startDate" class="block text-sm font-semibold mb-2 text-gray-400">Data Início</label>
          <input 
            type="date" 
            v-model="filters.startDate" 
            @change="emitFilters" 
            class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" 
            id="startDate"
          >
        </div>
        <div>
          <label for="endDate" class="block text-sm font-semibold mb-2 text-gray-400">Data Fim</label>
          <input 
            type="date" 
            v-model="filters.endDate" 
            @change="emitFilters" 
            class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" 
            id="endDate"
          >
        </div>
        <div>
          <label class="block text-sm font-semibold mb-2 opacity-0">&nbsp;</label>
          <div class="flex gap-2">
            <button @click="emitFilters" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
              <i class="bi bi-arrow-clockwise"></i> Atualizar
            </button>
            <button @click="resetFilters" class="px-4 py-2 border border-gray-600 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors">
              Limpar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Filters {
  symbol: string
  startDate: string
  endDate: string
}

interface Props {
  availableSymbols: string[]
  initialFilters?: Partial<Filters>
}

const props = withDefaults(defineProps<Props>(), {
  initialFilters: () => ({
    symbol: 'ALL',
    startDate: '',
    endDate: ''
  })
})

const emit = defineEmits<{
  filtersChanged: [filters: Filters]
}>()

const filters = ref<Filters>({
  symbol: props.initialFilters.symbol || 'ALL',
  startDate: props.initialFilters.startDate || '',
  endDate: props.initialFilters.endDate || ''
})

const emitFilters = () => {
  emit('filtersChanged', { ...filters.value })
}

const resetFilters = () => {
  filters.value = {
    symbol: 'ALL',
    startDate: '',
    endDate: ''
  }
  emitFilters()
}

// Emit initial filters
watch(() => props.initialFilters, (newFilters) => {
  if (newFilters) {
    filters.value = {
      symbol: newFilters.symbol || 'ALL',
      startDate: newFilters.startDate || '',
      endDate: newFilters.endDate || ''
    }
  }
}, { immediate: true })
</script>

<style scoped>
/* Scoped styles removed */
</style> 