import './assets/main.css'
import './assets/dark-mode.css'
import './assets/modal-dirty-guard.css'

import { applyAppTheme, readInitialDarkPreference } from '@/theme/appTheme'

applyAppTheme(readInitialDarkPreference())

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { plugin, defaultConfig } from '@formkit/vue'
import { useToast } from 'vue-toast-notification'
import config from '../formkit.config'
import { initToast } from '@/utils/toast'

import App from './App.vue'
import router from './router'

import "vue-toast-notification/dist/theme-bootstrap.css"

// Initialize global toast instance for interceptors
const $toast = initToast()

const app = createApp(App)

app.provide('toast', $toast)
app.use(createPinia())
app.use(plugin, defaultConfig(config))
app.use(router)

app.mount('#app')
