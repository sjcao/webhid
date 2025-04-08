
import { createApp } from 'vue';
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

import { createPinia } from 'pinia';
import './style.css';
import App from './App.vue';

import {makeChannel} from 'sync-message';
import {SyncClient} from 'comsync';
import * as Comlink from "comlink";
import { serviceWorkerFile } from 'virtual:vite-plugin-service-worker'

import { ref } from 'vue';
import type { Ref } from 'vue';


export type RunPython = (code: string, options?: object) => Promise<any>;

const pyClient: Ref<SyncClient | null> = ref(null);
const _notifyCallback: Ref<Function | null> = ref(null);
const _runPython: Ref<RunPython | null> = ref(null);

const pinia = createPinia();
const app = createApp(App);

app.use(ElementPlus,{
  locale: zhCn
})
app.provide('pyClient', pyClient);
app.provide('notifyCallback', _notifyCallback);
app.provide('runPython', _runPython);
app.use(pinia);
app.mount('#app');

if ("serviceWorker" in navigator) {
  // Register a service worker hosted at the root of the
  // site using the default scope.
  navigator.serviceWorker.register(serviceWorkerFile.slice(1), {type: 'module'}).then(
    (registration) => {
      console.log("Service worker registration succeeded:", registration);
      
      const channel = makeChannel({
        serviceWorker: {
          scope: registration.scope,
          timeout: 10
        }
      });
      const client = new SyncClient(() => new Worker(new URL('./worker/pyodide.ts', import.meta.url), {type: 'module'}), channel);
      
      const await_js_this: object = {};

      function notifyCallback(name: string, ...args: any[]) {
        const table: { [key: string]: any } = {
          print: (...args: any[]) => {
            console.log(...args);
          },
          sleep: (seconds: number) => {
            setTimeout(() => client.writeMessage('time up'), seconds*1000);
          },
          await_js: (code: string) => {
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            const f = new AsyncFunction(`'use strict';${code}`);
            const p = f.apply(await_js_this);
            p.then((result: any) => {
              client.writeMessage([true, result]);
            }).catch((error: any) => {
              client.writeMessage([false, error.toString()]);
            });
          }
        };
        const fn = table[name];
        if (fn) {
          return fn(...args);
        } else {
          throw new Error(`no function with name ${name}`);
        }
      }

      var lastRunPython: Promise<any> | null = null;

      function runPython(code: string, options: object) {
        if (client.state === 'idle') {
          const p = client.call(client.workerProxy.runPython, code, options, Comlink.proxy(notifyCallback));
          console.log('python: [[' + code.trimStart().split('\n')[0] + ']]', JSON.stringify(options));
          lastRunPython = p;
          return p;
        } else {
          const newRunPython = new Promise((resolve, reject) => {
            if (lastRunPython == null) {
              throw new Error('client is busy and cannot get last run python');
            }
            lastRunPython.finally(() => {
              const p = client.call(client.workerProxy.runPython, code, options, Comlink.proxy(notifyCallback));
              console.log('python: [[' + code.trimStart().split('\n')[0] + ']]', JSON.stringify(options));
              p.then((result: any) => {
                resolve(result);
              }).catch((error: any) => {
                reject(error);
              });
            });
          });
          lastRunPython = newRunPython;
          return newRunPython;
        }
      }

      client.call(client.workerProxy.init).then(() => {
        console.log('init ok');
        return client.workerProxy.setStdout(Comlink.proxy(notifyCallback));
      }).then(() => {
        console.log('set stdout ok');
        // client.call(client.workerProxy.runPython, `
        //   print('before')
        //   await_js('new Promise((resolve, reject) => setTimeout(resolve, 1000))')
        //   print('after')
        // `, {}, Comlink.proxy(notifyCallback));
        // client.call(client.workerProxy.runTest, Comlink.proxy(notifyCallback));
        pyClient.value = client;
        _notifyCallback.value = notifyCallback;
        // _runPython.value = runPython;
      });
    },
    (error) => {
      console.error(`Service worker registration failed: ${error}`);
    },
  );
} else {
  console.error("Service workers are not supported.");
}
