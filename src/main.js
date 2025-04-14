import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import { registerSW } from 'virtual:pwa-register'
if ('serviceWorker' in navigator) {
  registerSW()
}
const app = createApp(App)
app.mount('#app')
