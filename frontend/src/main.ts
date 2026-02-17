import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Aura from '@primevue/themes/aura'

import App from './App.vue'
import router from './router'

import Tooltip from 'primevue/tooltip'

import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'
import './assets/styles/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
  pt: {
    dialog: {
      root: { class: 'm-3' },
    },
    confirmdialog: {
      root: { class: 'm-3' },
    },
  },
})
app.use(ToastService)
app.use(ConfirmationService)
app.directive('tooltip', Tooltip)

app.mount('#app')
