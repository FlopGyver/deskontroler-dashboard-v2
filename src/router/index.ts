import { createRouter, createWebHistory } from 'vue-router'

import HomeView from '../views/HomeView.vue'
import MeteoView from '../views/MeteoView.vue'
import MediaView from '../views/MediaView.vue'
import PhoneView from '../views/PhoneView.vue'
import TimerView from '../views/TimerView.vue'
import PrinterView from '../views/PrinterView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/meteo', name: 'meteo', component: MeteoView },
  { path: '/media', name: 'media', component: MediaView },
  { path: '/phone', name: 'phone', component: PhoneView },
  { path: '/timer', name: 'timer', component: TimerView },
  { path: '/printer', name: 'printer', component: PrinterView },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
