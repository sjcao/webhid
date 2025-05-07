<script setup lang="ts">
import {ref, computed, onMounted} from 'vue';
import {ElMessage} from "element-plus";
import {AuroraBackground} from "@/components/ui/aurora-background";
import {Motion} from "motion-v";
import {BentoGrid, BentoGridCard, BentoGridItem} from "@/components/ui/bento-grid";
import {useDark} from "@vueuse/core";

const emit = defineEmits(['deviceCreated', 'deviceNotCreated']);

const isDark = useDark({});

// 设备列表
const devices = ref<HIDDevice[]>([])
const loading = ref(false)
const imgMouse = new URL(`/ic-moouse.png`, import.meta.url).href

async function requestDevice() {
  if (!hasHid()) {
    ElMessage({
      message: '你的浏览器不支持 WebHID 😭',
      type: 'warning',
    })
    return;
  }

  const devices = await navigator.hid.requestDevice({
    // filters: [
    //   {vendorId: 0x4242, productId: 0x0009},
    //   {vendorId: 0x373B, productId: 0x1135}
    // ]
    filters: []
  });
  if (!(devices.length > 0)) {
    ElMessage({
      message: '没有选择设备！ 😭',
      type: 'warning',
    })
    return;
  }

  await refreshDeviceList()

  // emit('deviceCreated');
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

      ElMessage.success('设备连接成功')
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

      ElMessage.success('设备连接成功')
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
      ElMessage.success('设备已断开')
      await refreshDeviceList()
    }
  } catch (error) {
    // handleError(error, '设备断开失败')
  }
}

const isPythonReady = computed(() => {
  return Boolean(true);
});

</script>
<template>
  <AuroraBackground
      class="fixed overflow-auto flex-1 top-0 left-0 w-full h-full flex flex-col items-center justify-center gap-4 px-4"
      :radial-gradient="true" :class="isDark">
    <Motion
        as="div"
        :initial="{ opacity: 0, y: 40, filter: 'blur(10px)' }"
        :in-view="{
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
      }"
        :transition="{
        delay: 0.3,
        duration: 0.8,
        ease: 'easeInOut',
      }"
        class="relative flex flex-col items-center justify-center gap-4 px-4"
    >

      <el-container class="connect-device-container">
        <el-header class="mt-10">
          <div class="text-center text-xl font-bold md:text-4xl dark:text-white"> WebHID 鼠标配置工具</div>
        </el-header>

        <div class="py-4 text-base font-extralight md:text-xl dark:text-neutral-200">
          仅支持 Chrome、Edge、Opera 等内核的浏览器。
        </div>
        <div class="py-4 text-base font-extralight md:text-xl dark:text-neutral-200">
          如列表中无设备显示，请点击按钮，以允许浏览器连接到您的设备
        </div>

        <div>

          <el-button
              class="w-fit rounded-xl bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
              size="large" type="primary" @click="requestDevice">
            请求浏览器访问设备
          </el-button>

          <el-button
              class="w-fit rounded-xl bg-white px-4 py-2 text-black dark:bg-white dark:text-black"
              size="large" @click="noHardwareMode">无设备模式
          </el-button>
        </div>

        <div>
          <BentoGrid class="mx-auto max-w-4xl"
                     :class="devices.length===1?'md:grid-cols-1': devices.length ===2?'md:grid-cols-2':'md:grid-cols-3'">
            <BentoGridItem
                v-for="(item, index) in devices"
                :key="index"
                class="content-center flex items-center"
            >
              <template #header>
                <div class="flex content-center items-center size-full space-x-4">
                  <!--                <div class="flex size-full flex-1 rounded-md bg-zinc-800"></div>-->
                  <el-image :src="imgMouse" fit="contain" class="flex size-36 flex-1 rounded-md"></el-image>
                </div>
              </template>

              <template #title>
                <strong>{{ item.productName }}</strong>
              </template>

              <template #icon>
              </template>

              <template #description>
                <div class="flex items-center justify-center">
                  <el-tag :type="item.opened ? 'success' : 'danger'">
                    {{ item.opened ? '已连接' : '未连接' }}
                  </el-tag>
                </div>

                <div class="mb-3 m-1 flex items-center justify-center">
                  <el-button
                      v-if="!item.opened"
                      size="large"
                      type="success"
                      @click="connectDevice(item)"
                  >连接
                  </el-button>

                  <el-button
                      v-if="item.opened"
                      size="large"
                      type="danger"
                      @click="disconnectDevice(item)"
                  >断开
                  </el-button>

                  <el-button
                      v-if="item.opened"
                      size="large"
                      type="success"
                      @click="enterSetting(item)"
                  >进入设置
                  </el-button>
                </div>

              </template>
            </BentoGridItem>
          </BentoGrid>
        </div>
      </el-container>
    </Motion>
  </AuroraBackground>
</template>

<style scoped>
.connect-device-container {
  display: flex;
  align-items: center;
  height: 100vh; /* 使容器高度占满整个视口 */
  width: 100vw;
  gap: 30px;
  z-index: 9999;
}

.el-table-devices {
  display: flex;
  justify-content: center;
  width: 50vw;
}

.image-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 20px;
}

.el-carousel-container {
  width: 75%;
}

.el-carousel__item:nth-child(2n) {
  background-color: white;
  border-width: 2px;
  border-radius: 10px;
  border-color: dodgerblue;
  gap: 20px;
}

.el-carousel__item:nth-child(2n + 1) {
  background-color: white;
  border-width: 2px;
  border-radius: 10px;
  border-color: dodgerblue;
}

.wavy-background {
  display: flex;
}
</style>