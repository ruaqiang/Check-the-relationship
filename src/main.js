import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import VueECharts from 'vue-echarts';


createApp(App).mount('#app');
component('v-chart', VueECharts);
