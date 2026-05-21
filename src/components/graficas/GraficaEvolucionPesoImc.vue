<script setup>
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

defineProps({
  data: { type: Object, required: true },
  options: { type: Object, required: true },
});
</script>

<template>
  <Line :data="data" :options="options" :height="220" />
</template>
