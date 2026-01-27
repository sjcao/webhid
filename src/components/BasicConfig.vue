<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';

import {sendDataToDevice, useHIDListener} from "@/components/webhid.ts";
import {MouseCommandBuilder, ParamType, ResponseParser} from "@/components/command.ts";

import {HyperText} from "@/components/ui/hyper-text";

const props = defineProps<{
  hard?: boolean; // should it interact with hardware or just dummy
  activeProfile: number;
  currentDevice?: HIDDevice;
}>();

// DPI配置
const dpiOptions = [400, 800, 1600, 3200]
const defaultIndex = dpiOptions.findIndex(dpi => dpi === 1600)
// 响应式状态
const xAxisIndex = ref(defaultIndex)
const yAxisIndex = ref(defaultIndex)

// 计算属性
const currentDpiX = computed(() => dpiOptions[xAxisIndex.value])

const restoreDefaultSettings = () => {
  xAxisIndex.value = defaultIndex
  yAxisIndex.value = defaultIndex
  
  const dpi = dpiOptions[xAxisIndex.value]
  const setDpi = MouseCommandBuilder.setDPI(dpi)
  sendDataToDevice(setDpi)
}

const handleSliderChange = (val: number) => {
  xAxisIndex.value = val
  const dpi = dpiOptions[xAxisIndex.value]
  const setDpi = MouseCommandBuilder.setDPI(dpi)
  sendDataToDevice(setDpi)
}

const setDpiByIndex = (index: number) => {
  xAxisIndex.value = index
  const dpi = dpiOptions[xAxisIndex.value]
  const setDpi = MouseCommandBuilder.setDPI(dpi)
  sendDataToDevice(setDpi)
}


const handleData = (data: Uint8Array) => {
  console.log('ComponentA received:', data);
  const [type, result] = ResponseParser.parse(Array.from(data))
  if (type === ParamType.DPI) {
    const dpi = result as number
    xAxisIndex.value = dpiOptions.indexOf(dpi)
  }
}

useHIDListener(handleData);

onMounted(() => {
  //读取DPi设置
  //处理设备数据
  const com = MouseCommandBuilder.readDPI()
  sendDataToDevice(com)
})

</script>
<template>
  <div class="flex flex-col gap-8 w-full max-w-3xl mx-auto">
    
    <div class="glass-card rounded-xl p-8 border border-white/5">
        <div class="flex items-center justify-between mb-8">
           <h2 class="text-xl font-bold flex items-center gap-2 m-0">
              <span class="w-1 h-6 bg-primary rounded-full"></span>
              {{ $t('dpiSetting_title') }}
           </h2>
           
           <button 
              @click="restoreDefaultSettings"
              class="text-sm px-3 py-1 rounded bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
           >
              {{ $t('bt_restore') }}
           </button>
        </div>

        <div class="flex flex-col gap-12">
           <!-- DPI Display -->
           <div class="flex justify-center">
              <div class="relative group cursor-default">
                 <div class="absolute -inset-4 bg-primary/20 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                 <div class="relative px-12 py-8 bg-background border border-border rounded-2xl flex flex-col items-center justify-center shadow-2xl min-w-[240px]">
                    <div class="flex items-baseline gap-2">
                       <HyperText
                           :text="currentDpiX.toString()"
                           class="text-6xl font-black text-primary tracking-tighter leading-none"
                           :duration="800"
                           :animate-on-load="true"
                       />
                       <span class="text-xl font-bold text-muted-foreground ml-1">DPI</span>
                    </div>
                    <div class="mt-2 text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60">Current Value</div>
                 </div>
              </div>
           </div>

           <!-- Slider -->
           <div class="px-8">
              <div class="flex justify-between text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                 <span>{{ $t('slow') }}</span>
                 <span>{{ $t('fast') }}</span>
              </div>
              <el-slider 
                 v-model="xAxisIndex" 
                 :min="0" 
                 :max="3" 
                 :step="1" 
                 :show-tooltip="false"
                 :marks="{0: '', 1: '', 2: '', 3: ''}"
                 @change="handleSliderChange"
                 class="dpi-slider"
              />
           </div>

           <!-- Presets -->
           <div class="flex justify-center">
              <div class="grid grid-cols-4 gap-4 w-full">
                 <button 
                    v-for="(dpi, index) in dpiOptions" 
                    :key="index"
                    @click="setDpiByIndex(index)"
                    class="flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200"
                    :class="index === xAxisIndex ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105' : 'bg-secondary/30 text-muted-foreground border-transparent hover:bg-secondary hover:text-foreground'"
                 >
                    <span class="text-lg font-bold font-mono">{{ dpi }}</span>
                 </button>
              </div>
           </div>
        </div>
    </div>

  </div>
</template>
<style lang="scss" scoped>
:deep(.dpi-slider) {
  --el-slider-main-bg-color: hsl(var(--primary));
  --el-slider-runway-bg-color: hsl(var(--secondary));
  --el-slider-stop-bg-color: hsl(var(--foreground));
  height: 8px;
}

:deep(.dpi-slider .el-slider__bar) {
  background-color: hsl(var(--primary));
  height: 8px;
  border-radius: 4px;
}

:deep(.dpi-slider .el-slider__button) {
  width: 24px;
  height: 24px;
  border: 4px solid hsl(var(--background));
  background-color: hsl(var(--primary));
  box-shadow: 0 4px 12px rgba(var(--primary), 0.4);
}

:deep(.dpi-slider .el-slider__runway) {
  height: 8px;
  border-radius: 4px;
}

:deep(.dpi-slider .el-slider__stop) {
  width: 8px;
  height: 8px;
  top: 0;
  background-color: hsl(var(--background));
  border: 2px solid hsl(var(--muted));
  opacity: 0.5;
}

</style>