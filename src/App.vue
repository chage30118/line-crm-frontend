<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()

// 初始化 UI 狀態
onMounted(() => {
  uiStore.initializeUI()
})
</script>

<style>
#app {
  height: 100vh;
  overflow: hidden;
}
</style>
