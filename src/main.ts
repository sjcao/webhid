
import { createApp } from 'vue';
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

import { createPinia } from 'pinia';
import './style.css';
import App from './App.vue';

import {SyncClient} from 'comsync';

import { ref } from 'vue';
import type { Ref } from 'vue';
import i18n from "./components/lang/i18n.ts";


export type RunPython = (code: string, options?: object) => Promise<any>;

const pyClient: Ref<SyncClient | null> = ref(null);
const _notifyCallback: Ref<Function | null> = ref(null);
const _runPython: Ref<RunPython | null> = ref(null);

const pinia = createPinia();
const app = createApp(App);

app.use(ElementPlus,{
  locale: zhCn
})
app.use(i18n);

app.provide('pyClient', pyClient);
app.provide('notifyCallback', _notifyCallback);
app.provide('runPython', _runPython);
app.use(pinia);
app.mount('#app');

