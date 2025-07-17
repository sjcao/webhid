<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';

import {sendDataToDevice, useHIDListener} from "@/components/webhid.ts";
import {MouseCommandBuilder, ParamType, ResponseParser} from "@/components/command.ts";
import {BalanceSlider} from "@/components/ui/balance-slider";
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
const radioIndex = ref(2)
const sidePrecent = ref(75)
const separateXandY = ref(false)
const xAxisIndex = ref(defaultIndex)
const yAxisIndex = ref(defaultIndex)

// 计算属性
const currentDpiX = computed(() => dpiOptions[xAxisIndex.value])

const restoreDefaultSettings = () => {
  // ySelectedIndex.value = defaultIndex
  xAxisIndex.value = defaultIndex
  yAxisIndex.value = defaultIndex
  radioIndex.value = defaultIndex
  sidePrecent.value = 75

  separateXandY.value = false
}

const handleRadioChage = () => {
  if (radioIndex.value === 0) {
    sidePrecent.value = 25
  } else if (radioIndex.value === 1) {
    sidePrecent.value = 50
  } else if (radioIndex.value === 2) {
    sidePrecent.value = 75
  } else if (radioIndex.value === 3) {
    sidePrecent.value = 100
  }

  xAxisIndex.value = radioIndex.value
  const dpi = dpiOptions[xAxisIndex.value]
  const setDpi = MouseCommandBuilder.setDPI(dpi)
  sendDataToDevice(setDpi)
}
const handleDpiChange = (value) => {
  sidePrecent.value = parseInt(value.value)
  if (sidePrecent.value === 0) {
    xAxisIndex.value = 0
    radioIndex.value = 0
  } else if (sidePrecent.value === 25) {
    xAxisIndex.value = 0
    radioIndex.value = 0
  } else if (sidePrecent.value === 50) {
    xAxisIndex.value = 1
    radioIndex.value = 1
  } else if (sidePrecent.value === 75) {
    xAxisIndex.value = 2
    radioIndex.value = 2
  } else if (sidePrecent.value === 100) {
    xAxisIndex.value = 3
    radioIndex.value = 3
  }
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
    <h2>{{ $t('dpiSetting_title') }}</h2>

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
                <div class="dpi-value">
                  <HyperText
                      :text=currentDpiX.toString()
                      class="text-4xl font-bold"
                      :duration="800"
                      :animate-on-load="true"
                  />
                </div>
              </div>
            </div>

            <BalanceSlider
                :left-content="$t('slow')"
                :right-content="$t('fast')"
                right-color="#ffffff"
                left-color="#409EFF"
                indicator-color="#409EFF"
                :initial-value="sidePrecent"
                v-model="sidePrecent"
                @changeValue="handleDpiChange"
            />

            <div class="mt-10">
              <el-radio-group v-model="radioIndex" class="flex justify-center " @change="handleRadioChage">
                <el-radio :label=0 size="large" border class="w-24 dark:text-white">400</el-radio>
                <el-radio :label=1 size="large" border class="w-24 dark:text-white">800</el-radio>
                <el-radio :label=2 size="large" border class="w-24 dark:text-white">1600</el-radio>
                <el-radio :label=3 size="large" border class="w-24  dark:text-white">3200</el-radio>
              </el-radio-group>
            </div>

          </div>
        </div>
      </div>
      <div class="div-button-default">

        <el-button
            type="info"
            @click="restoreDefaultSettings"
        >{{ $t('bt_restore') }}
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