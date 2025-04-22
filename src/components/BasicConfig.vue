<script setup lang="ts">
import {computed, CSSProperties, onMounted, reactive, ref} from 'vue';

import {BridgeData, BridgeStatus, makeBridge, sendData} from './bridge';
import {sendDataToDevice, useHIDListener} from "@/components/webhid.ts";
import {MouseCommandBuilder, ParamType, ResponseParser} from "@/components/command.ts";
import {toHexString} from "@/components/hexString.ts";

const props = defineProps<{
  hard?: boolean; // should it interact with hardware or just dummy
  activeProfile: string;
  currentDevice?: HIDDevice;
}>();

const bridgeData = defineModel<BridgeData>('bridgeData', {default: {}});
const bridgeStatus = defineModel<BridgeStatus>('bridgeStatus', {default: {}});

const bridge = makeBridge(bridgeData, bridgeStatus, props);

const scrollMode = bridge<string>('scrollMode', 'tactile',
    'device.get_scroll_mode(%p).name.lower()', () => ({}),
    'device.set_scroll_mode(pt.ScrollMode[x.upper()], %p)', (value) => ({x: value}),
);
const scrollModeToggle = computed({
  get: () => scrollMode.value === 'freespin',
  set: (value) => scrollMode.value = value ? 'freespin' : 'tactile'
});

const scrollAcceleration = bridge<Boolean>('scrollAcceleration', false,
    'device.get_scroll_acceleration(%p)', () => ({}),
    'device.set_scroll_acceleration(x, %p)', (value) => ({x: value}),
);

const scrollSmartReel = bridge<Boolean>('scrollSmartReel', false,
    'device.get_scroll_smart_reel(%p)', () => ({}),
    'device.set_scroll_smart_reel(x, %p)', (value) => ({x: value}),
);

interface Mark {
  style: CSSProperties
  label: string
}

type Marks = Record<number, Mark | string>

const pollingRate = reactive<Marks>({
  125: '125',
  250: '250',
  1000: '1000',
  500: '500',
});
// const pollingRateInput = computed({
//   get: () => pollingRate.value?.toString(),
//   set: (value) => {
//     pollingRate.value = parseInt(value ?? '1')
//   },
// });
// const pollingRateRange = computed({
//   get: () => ({1: 4, 2: 3, 4: 2, 8: 1}[pollingRate.value ?? 0] ?? 0),
//   set: (value) => {
//     pollingRate.value = {4: 1, 3: 2, 2: 4, 1: 8, 0: 16}[value] ?? 1
//   },
// });

const dpiXy = bridge<[number, number]>('dpiXy', [800, 800],
    'device.get_dpi_xy(%p)', () => ({}),
    'device.set_dpi_xy((x, y), %p)', (value) => ({x: value[0], y: value[1]}),
);

const dpiStages = bridge<[[number, number][], number]>('dpiStages', [[[800, 800]], 1],
    'device.get_dpi_stages(%p)', () => ({}),
    'device.set_dpi_stages(ds, acs, %p)', (value) => ({ds: JSON.parse(JSON.stringify(value[0])), acs: value[1]}),
);

const dpiStageCount = computed({
  get: () => dpiStages.value?.[0].length ?? 0,
  set: (value) => {
    if (!dpiStages.value) {
      dpiStages.value = [Array.from({length: value}, () => [800, 800]), 1]
    }
    dpiStages.value[0] = dpiStages.value[0].slice(0, value);
    dpiStages.value[0] = dpiStages.value[0].concat(Array.from({length: value - dpiStages.value[0].length}, () => [800, 800]));
  }
});

function dpiCopyXY() {
  for (let it of dpiStages.value[0]) {
    it[1] = it[0];
  }
}

// console.log("DPI 400 命令:", dpi400Command.map((b: number) => b.toString(16).padStart(2, '0')));


// DPI配置
const dpiOptions = [400, 800, 1600, 3200]
const defaultIndex = dpiOptions.findIndex(dpi => dpi === 3200)

// 响应式状态
const activeIndex = ref('2')
// const xSelectedIndex = ref(defaultIndex)
// const ySelectedIndex = ref(defaultIndex)
const separateXandY = ref(false)
const xAxisIndex = ref(defaultIndex)
const yAxisIndex = ref(defaultIndex)

// 计算属性
const currentDpiX = computed(() => dpiOptions[xAxisIndex.value])
const currentDpiY = computed(() => dpiOptions[yAxisIndex.value])

// 方法
const handleSelect = (key) => {
  activeIndex.value = key
}

const restoreDefaultSettings = () => {
  // ySelectedIndex.value = defaultIndex
  xAxisIndex.value = defaultIndex
  yAxisIndex.value = defaultIndex
  separateXandY.value = false
}

const formatTooltip = (index) => {
  const dpi = dpiOptions[index]
  return dpi === 3200 ? '3200 (快)'
      : dpi === 400 ? '400 (慢)'
          : dpi.toString()
}

const handleDpiChange = () => {
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
  <div class="form-control">
    <h2>DPI</h2>

    <div class="dpi-container">
      <!-- DPI滑动条 -->

      <!-- XY轴独立设置 -->
      <div class="xy-settings">
        <el-checkbox v-model="separateXandY" v-if="false">X/Y单独设置</el-checkbox>
        <div class="axis-sliders">
          <div class="axis-item">
            <span class="axis-label" v-if="false">X轴</span>

            <div class="slider-container">
              <div class="slider-header">
            <span class="dpi-value">
              {{ currentDpiX }}
              <span v-if="currentDpiX === 3200" class="speed-tag">(快)</span>
              <span v-if="currentDpiX === 400" class="speed-tag">(慢)</span>
            </span>
              </div>
            </div>

            <el-slider class="slider-el-slider"
                       v-model="xAxisIndex"
                       :min="0"
                       :max="dpiOptions.length - 1"
                       :step="1"
                       show-input
                       input-size="large"
                       size="large"
                       :format-tooltip="formatTooltip"
                       @change="handleDpiChange"
            >
            </el-slider>
          </div>
          <div class="axis-item" v-if="separateXandY">
            <span class="axis-label">Y轴</span>

            <div class="slider-container">
              <div class="slider-header">
            <span class="dpi-value">
              {{ currentDpiY }}
              <span v-if="currentDpiY === 3200" class="speed-tag">(快)</span>
              <span v-if="currentDpiY === 400" class="speed-tag">(慢)</span>
            </span>
              </div>
            </div>
            <el-slider class="slider-el-slider"
                       v-model="yAxisIndex"
                       :min="0"
                       :max="dpiOptions.length - 1"
                       :step="1"
                       show-input
                       input-size="large"
                       size="large"
                       :format-tooltip="formatTooltip"
                       @change="handleDpiChange"
            />
          </div>
        </div>
      </div>
      <div class="div-button-default">

        <el-button
            type="info"
            @click="restoreDefaultSettings"
        >恢复默认设置
        </el-button>

      </div>
    </div>

    <!--      <h2 class="form-header">Scroll</h2>-->
    <!--      <div class="grid grid-cols-2 place-items-baseline">-->
    <!--        <span>Wheel mode</span>-->
    <!--        <label class="label cursor-pointer space-x-4">-->
    <!--          <span class="label-text">Tactile</span>-->
    <!--          <input type="checkbox" class="toggle toggle-sm" v-model="scrollModeToggle"/>-->
    <!--          <span class="label-text">Freespin</span>-->
    <!--        </label>-->
    <!--        <span>Acceleration</span>-->
    <!--        <label class="label cursor-pointer space-x-4">-->
    <!--          <input type="checkbox" class="toggle toggle-sm" v-model="scrollAcceleration"/>-->
    <!--        </label>-->
    <!--        <span>Smart Reel</span>-->
    <!--        <label class="label cursor-pointer space-x-4">-->
    <!--          <input type="checkbox" class="toggle toggle-sm" v-model="scrollSmartReel"/>-->
    <!--        </label>-->
    <!--      </div>-->
    <!--      <h2 class="form-header">Polling rate</h2>-->
    <!--      <div class="flex flex-row gap-4">-->

    <!--        <div class="flex-1">-->
    <!--          <el-slider class="slider-el-slider"-->
    <!--                     :min="125"-->
    <!--                     :max="1000"-->
    <!--                     :step="125"-->
    <!--                     show-input-->
    <!--                     input-size="large"-->
    <!--                     size="large"-->
    <!--                     :marks="pollingRate"-->
    <!--          />-->

    <!--        </div>-->
    <!--      </div>-->

  </div>
</template>
<style lang="scss" scoped>
.form-control {
  display: flex;
  width: 100%;
  justify-content: center;
}

.form-header {
  margin-top: 50px;
}

.input-label {
  @apply flex w-full justify-between text-xs;
  span {
    @apply w-6 inline-flex justify-center;
  }
}

.slider-header {
  display: flex;
  justify-content: center;
}

.slider-container {
  display: flex;
  justify-content: center;
  padding: 10px;
}

.slider-el-slider {
  display: flex;
  justify-content: center;
  padding: 10px;
  padding-left: 10%;
  padding-right: 10%;
}

.div-button-default {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>