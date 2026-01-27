<script setup lang="ts">
import {ref, onMounted} from 'vue';
import {ElMessage} from "element-plus";

import {Motion} from "motion-v";
import {BentoGrid, BentoGridItem} from "@/components/ui/bento-grid"; // BentoGridCard unused
import {useI18n} from "vue-i18n";

const emit = defineEmits(['deviceCreated', 'deviceNotCreated']);

const localeI18n = useI18n();

// 设备列表
const devices = ref<HIDDevice[]>([])
const loading = ref(false)
const imgMouse = new URL(`/ic-moouse.png`, import.meta.url).href

async function requestDevice() {
  if (!hasHid()) {
    ElMessage({
      message: localeI18n.t('message_browser_not_support'),
      type: 'warning',
    })
    return;
  }

  const devices = await navigator.hid.requestDevice({
    filters: []
  });
  if (!(devices.length > 0)) {
    ElMessage({
      message: localeI18n.t('message_no_select_device'),
      type: 'warning',
    })
    return;
  }

  await refreshDeviceList()
}

async function noHardwareMode() {
  emit('deviceNotCreated');
}

function hasHid() {
  return Boolean(navigator.hid);
}

// 刷新设备列表
const refreshDeviceList = async () => {
  try {
    loading.value = true
    devices.value = await navigator.hid.getDevices()
  } catch (error) {
    // handleError(error, '刷新设备列表失败')
  } finally {
    loading.value = false
  }
}
// 初始化加载设备列表
onMounted(async () => {
  await refreshDeviceList()
})


// 连接设备
const connectDevice = async (device: HIDDevice) => {
  try {
    if (!device.opened) {
      await device.open()

      emit('deviceCreated', device);

      ElMessage.success(localeI18n.t('message_connect_success'))
      await refreshDeviceList()
    }
  } catch (error) {
    // handleError(error, '设备连接失败')
  }
}

// 连接设备
const enterSetting = async (device: HIDDevice) => {
  try {
    if (!device.opened) {
      await device.open()

      emit('deviceCreated', device);

      ElMessage.success(localeI18n.t('message_connect_success'))
      await refreshDeviceList()
    } else {
      emit('deviceCreated', device);
    }
  } catch (error) {
    // handleError(error, '设备连接失败')
  }
}

// 断开设备
const disconnectDevice = async (device: HIDDevice) => {
  try {
    if (device.opened) {
      await device.close()
      ElMessage.success(localeI18n.t('bt_disconnect'))
      await refreshDeviceList()
    }
  } catch (error) {
    // handleError(error, '设备断开失败')
  }
}

</script>
<template>
  <div class="fixed inset-0 w-full h-full overflow-hidden bg-background text-foreground flex flex-col items-center justify-center">
    <!-- Animated Background -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden">
      <div class="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full animate-blob"></div>
      <div class="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 blur-[120px] rounded-full animate-blob animation-delay-2000"></div>
      <div class="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-blue-400/10 blur-[100px] rounded-full animate-blob animation-delay-4000"></div>
    </div>

    <!-- Content -->
    <Motion
        as="div"
        :initial="{ opacity: 0, y: 20, filter: 'blur(10px)' }"
        :in-view="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
        :transition="{ delay: 0.2, duration: 0.8, ease: 'easeOut' }"
        class="relative z-10 w-full max-w-5xl px-6 flex flex-col items-center gap-8"
    >
      
      <!-- Header Section -->
      <div class="text-center space-y-4">
        <h1 class="text-5xl md:text-7xl font-bold tracking-tighter">
          {{$t('top_title')}}
        </h1>
        <p class="text-lg md:text-xl text-muted-foreground font-light tracking-wide max-w-2xl mx-auto">
          {{$t('tip_connect')}} <span class="hidden md:inline">|</span> {{$t('tip_chrome')}}
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-wrap gap-4 justify-center">
        <button
            class="group relative px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium text-lg shadow-lg hover:shadow-primary/50 hover:scale-105 transition-all duration-300"
            @click="requestDevice"
        >
          <span class="flex items-center gap-2">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
             {{$t('bt_request_connect_device')}}
          </span>
        </button>

        <button
            class="px-8 py-3 rounded-full bg-secondary text-secondary-foreground font-medium text-lg hover:bg-secondary/80 hover:scale-105 transition-all duration-300 backdrop-blur-sm border border-border"
            @click="noHardwareMode"
        >
          {{$t('bt_no_device')}}
        </button>
      </div>

      <!-- Device Grid -->
      <div v-if="devices.length > 0" class="w-full mt-8">
         <BentoGrid class="mx-auto w-full">
            <BentoGridItem
                v-for="(item, index) in devices"
                :key="index"
                class="glass-card"
            >
              <template #header>
                <div class="flex justify-center items-center w-full h-32 bg-secondary/30 rounded-lg mb-4">
                  <el-image :src="imgMouse" fit="contain" class="h-24 w-auto drop-shadow-md transition-transform duration-500 group-hover/bento:scale-110"></el-image>
                </div>
              </template>

              <template #title>
                <span class="text-lg font-semibold tracking-tight">{{ item.productName }}</span>
              </template>
              
              <template #description>
                <div class="flex flex-col gap-3">
                   <div class="flex items-center justify-between">
                      <span class="text-sm text-muted-foreground">{{ $t('status_label') }}</span>
                      <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', item.opened ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20']">
                        {{ item.opened ? $t('status_connect') : $t('status_disconnect') }}
                      </span>
                   </div>

                   <div class="flex gap-2 w-full mt-2">
                      <button
                          v-if="!item.opened"
                          class="flex-1 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                          @click="connectDevice(item)"
                      >
                        {{$t('bt_connect')}}
                      </button>

                      <button
                          v-if="item.opened"
                          class="flex-1 py-2 text-sm font-medium rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-colors"
                          @click="disconnectDevice(item)"
                      >
                        {{$t('bt_disconnect')}}
                      </button>

                      <button
                          v-if="item.opened"
                          class="flex-1 py-2 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors"
                          @click="enterSetting(item)"
                      >
                        {{$t('bt_enter')}}
                      </button>
                   </div>
                </div>
              </template>
            </BentoGridItem>
         </BentoGrid>
      </div>

    </Motion>
  </div>
</template>

<style scoped>
@keyframes blob {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
}
.animate-blob {
  animation: blob 7s infinite;
}
.animation-delay-2000 {
  animation-delay: 2s;
}
.animation-delay-4000 {
  animation-delay: 4s;
}
</style>