<script setup lang="ts">
import {ref} from 'vue';
import ConnectDevice from './components/ConnectDevice.vue';
import DeviceMain from './components/DeviceMain.vue';
import LogConsole from './components/LogConsole.vue';
import {setHIDDevice} from "@/components/webhid.ts";
import Ic_language from "@/assets/ic_language.vue";
import {Switch, SwitchFilled} from "@element-plus/icons-vue";
import {useDark, useToggle} from "@vueuse/core";
import {switchLanguage} from "@/components/lang/i18n.ts";
import ic_theme_dark from "@/assets/ic_theme_dark.vue";
import ic_theme_light from "@/assets/ic_theme_light.vue";

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


const isDark = useDark({});
const isDarkOn = ref(isDark.value);
const toggleTheme = useToggle(isDark)
const toggleLanguage = (lang: string) => {
  switchLanguage(lang)
}

</script>

<template>
  <div class="global-font">
    <ConnectDevice v-if="!connected"
                   @device-created="(payload) => {connected = true; hard = false;currentDevice = payload;setHIDDevice(currentDevice)}"
                   @device-not-created="connected = true; hard = false;"/>
    <DeviceMain v-else :hard="hard" :currentDevice="currentDevice" @back="connected = false"/>
  </div>

  <div class="fixed top-5 right-20 flex justify-center items-center">
    <el-switch style="--el-switch-on-color: #2B2D30FF; --el-switch-border-color: #FFF" size="default" v-model="isDarkOn" inline-prompt
               :active-icon="ic_theme_dark" :inactive-icon="ic_theme_light" class="mr-5" @change="toggleTheme()"/>

    <el-dropdown>
        <span class="">
          <el-icon class="el-icon--right dark:text-white" size="28"><ic_language/></el-icon>
        </span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item @click="toggleLanguage('en')">English</el-dropdown-item>
          <el-dropdown-item @click="toggleLanguage('zh-cn')">中文</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<style scoped>

footer {
  position: fixed;
  display: block;
  bottom: 0;
  padding: 1em 0;
  width: 100%;
}

.global-font{
  font-family: "PingFang SC",sans-serif;
}
</style>
