<template>
  <div :class="cardClass">
    <div class="flex justify-between items-center h-full">
      <div>
        <h6 class="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">{{ title }}</h6>
        <h3 class="text-2xl font-bold text-white mb-0">{{ value }}</h3>
      </div>
      <div>
        <i :class="iconClass" class="text-3xl opacity-80"></i>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title: string
  value: string | number
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'info'
  icon?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  icon: 'bi bi-graph-up'
})

const cardClass = computed(() => {
  const baseClass = 'glass-card p-4 transition-transform hover:-translate-y-1 duration-200'
  // Map variants to specific border/bg styles if needed, or just use generic glass style with color accents
  const variantMap: Record<string, string> = {
    'primary': 'border-blue-500/30 bg-blue-500/5',
    'success': 'border-green-500/30 bg-green-500/5',
    'danger': 'border-red-500/30 bg-red-500/5',
    'warning': 'border-yellow-500/30 bg-yellow-500/5',
    'info': 'border-cyan-500/30 bg-cyan-500/5'
  }
  const variantClass = variantMap[props.variant] || variantMap['primary']
  return [baseClass, variantClass]
})

const iconClass = computed(() => props.icon)
</script>

<style scoped>
/* Scoped styles removed */
</style> 