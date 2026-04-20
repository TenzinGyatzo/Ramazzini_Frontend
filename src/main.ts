import './assets/main.css'
import './assets/dark-mode.css'

import { applyAppTheme, readInitialDarkPreference } from '@/theme/appTheme'

applyAppTheme(readInitialDarkPreference())

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { plugin, defaultConfig } from '@formkit/vue'
import { useToast } from 'vue-toast-notification'
import config from '../formkit.config'

import App from './App.vue'
import router from './router'

import "vue-toast-notification/dist/theme-bootstrap.css"

const $toast = useToast({
    position: 'bottom-right',
    duration: 4000
})

const app = createApp(App)

app.provide('toast', $toast)
app.use(createPinia())
app.use(plugin, defaultConfig(config))
app.use(router)

app.mount('#app')
