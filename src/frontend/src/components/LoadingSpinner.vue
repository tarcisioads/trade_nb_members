<template>
  <div class="flex flex-col items-center justify-center p-8" v-if="loading">
    <div class="animate-spin rounded-full h-10 w-10 border-4 border-blue-500/30 border-t-blue-500 hover:border-t-blue-400 transition-colors"></div>
    <p class="mt-4 text-gray-400 font-medium animate-pulse">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  loading: boolean
  message?: string
}

withDefaults(defineProps<Props>(), {
  message: 'Carregando dados...'
})
</script>

<style scoped>
/* Scoped styles removed */
</style> 