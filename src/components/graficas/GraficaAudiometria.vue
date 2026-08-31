<script setup>
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'

// Solo se registran los módulos necesarios para gráficas de línea
ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend)

defineProps({
  data: Object,
  options: Object,
  height: { type: Number, default: 220 },
})
</script>

<template>
  <Line :data="data" :options="options" :height="height" />
</template>
