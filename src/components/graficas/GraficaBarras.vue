<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { useHtmlDarkMode } from '@/composables/useHtmlDarkMode'

// Solo se registran los módulos que realmente usarás
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, ChartDataLabels)

const props = defineProps({
  data: Object,
  options: Object
})

const isHtmlDark = useHtmlDarkMode()

const themedOptions = computed(() => {
  const base = props.options || {}
  if (!isHtmlDark.value) return base

  const darkTick = '#e2e8f0'
  const darkBorder = '#94a3b8'
  const darkGrid = 'rgba(148, 163, 184, 0.35)'

  const applyAxisTheme = (axis) => {
    if (!axis) return axis
    return {
      ...axis,
      ticks: {
        ...(axis.ticks || {}),
        color: darkTick
      },
      title: axis.title
        ? {
            ...axis.title,
            color: darkTick
          }
        : axis.title,
      border: axis.border
        ? {
            ...axis.border,
            color: darkBorder
          }
        : axis.border,
      grid: axis.grid
        ? {
            ...axis.grid,
            color: axis.grid.display === false ? axis.grid.color : darkGrid
          }
        : axis.grid
    }
  }

  const baseDatalabels = base.plugins?.datalabels
  const datalabelsThemed =
    baseDatalabels && baseDatalabels.display !== false
      ? {
          ...baseDatalabels,
          color: darkTick
        }
      : baseDatalabels

  return {
    ...base,
    plugins: {
      ...(base.plugins || {}),
      ...(datalabelsThemed !== undefined ? { datalabels: datalabelsThemed } : {}),
      legend: base.plugins?.legend
        ? {
            ...base.plugins.legend,
            labels: {
              ...(base.plugins.legend.labels || {}),
              color: darkTick
            }
          }
        : base.plugins?.legend
    },
    scales: {
      ...(base.scales || {}),
      x: applyAxisTheme(base.scales?.x),
      y: applyAxisTheme(base.scales?.y)
    }
  }
})
</script>

<template>
  <Bar :data="data" :options="themedOptions" :height="147" />
</template>
