<script setup lang="ts">
import {ref} from 'vue';
import ConnectDevice from './components/ConnectDevice.vue';
import DeviceMain from './components/DeviceMain.vue';
import LogConsole from './components/LogConsole.vue';
import {setHIDDevice} from "@/components/webhid.ts";

const connected = ref(false);
const hard = ref(false);

const currentDevice = ref<HIDDevice>()

const showConsole = ref(false);
const logConsole = ref<InstanceType<typeof LogConsole> | null>(null);

const logs = ref<[Date, string][]>([[new Date(), 'Here be logs']]);

function addLog(text: string) {
  logs.value.push([new Date(), text]);
}

var cl: Function, ce: Function, cw: Function;

if (window.console && console.log) {
  cl = console.log;
  console.log = function () {
    addLog([...arguments].map(x => String(x)).join(', '));
    cl.apply(this, arguments)
  }
}

if (window.console && console.warn) {
  cw = console.warn;
  console.warn = function () {
    addLog(['Warn', ...arguments].map(x => String(x)).join(', '));
    cw.apply(this, arguments)
  }
}

if (window.console && console.error) {
  ce = console.error;
  console.error = function () {
    addLog(['Error', ...arguments].map(x => String(x)).join(', '));
    ce.apply(this, arguments)
  }
}

window.addEventListener("error", (event) => {
  console.error(`${event.type}: ${event.message}`);
});
window.addEventListener("unhandledrejection", (event) => {
  console.error(`${event.type}: ${event.reason}`);
});

</script>

<template>
  <div>
    <ConnectDevice v-if="!connected"
                   @device-created="(payload) => {connected = true; hard = false;currentDevice = payload;setHIDDevice(currentDevice)}"
                   @device-not-created="connected = true; hard = false;"/>
    <DeviceMain v-else :hard="hard" :currentDevice="currentDevice" @back="connected = false"/>
  </div>
  <div class="h-96"></div>
  <!--  <footer>-->
  <!--    <div class="flex flex-row gap-2 items-baseline">-->
  <!--      <button class="btn btn-sm" @click="showConsole = !showConsole; if(logConsole) {logConsole.scrollToBottom()}">-->
  <!--        Console-->
  <!--      </button>-->
  <!--      <LogGlance :messages="logs"></LogGlance>-->
  <!--    </div>-->
  <!--    <LogConsole v-show="showConsole" ref="logConsole" :messages="logs"/>-->
  <!--  </footer>-->
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}

footer {
  position: fixed;
  display: block;
  bottom: 0;
  padding: 1em 0;
  width: 100%;
}
</style>
