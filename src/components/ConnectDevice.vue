<script setup lang="ts">
import {ref, computed, onMounted} from 'vue';
import {ElMessage} from "element-plus";
import {AuroraBackground} from "@/components/ui/aurora-background";
import {Motion} from "motion-v";
import {BentoGrid, BentoGridCard, BentoGridItem} from "@/components/ui/bento-grid";
import {useDark} from "@vueuse/core";
import {useI18n} from "vue-i18n";

const emit = defineEmits(['deviceCreated', 'deviceNotCreated']);

const isDark = useDark({});
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
    // filters: [
    //   {vendorId: 0x4242, productId: 0x0009},
    //   {vendorId: 0x373B, productId: 0x1135}
    // ]
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

const isPythonReady = computed(() => {
  return Boolean(true);
});

</script>
<template>
  <AuroraBackground
      class="fixed top-0 left-0 w-full h-full flex flex-col items-center justify-center gap-4 px-4"
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
          <div class="text-center text-xl font-bold md:text-4xl dark:text-white"> {{$t('top_title')}}</div>
        </el-header>

        <div class="py-4 text-base font-extralight md:text-xl dark:text-neutral-200">
          {{$t('tip_chrome')}}
        </div>
        <div class="py-4 text-base font-extralight md:text-xl dark:text-neutral-200">
          {{$t('tip_connect')}}
        </div>

        <div>

          <el-button
              class="w-fit rounded-xl bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
              size="large" type="primary" @click="requestDevice">
            {{$t('bt_request_connect_device')}}
          </el-button>

          <el-button
              class="w-fit rounded-xl bg-white px-4 py-2 text-black dark:bg-white dark:text-black"
              size="large" @click="noHardwareMode">{{$t('bt_no_device')}}
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
                    {{ item.opened ? $t('status_connect') : $t('status_disconnect') }}
                  </el-tag>
                </div>

                <div class="mb-3 m-1 flex items-center justify-center">
                  <el-button
                      v-if="!item.opened"
                      size="large"
                      type="success"
                      @click="connectDevice(item)"
                  >{{$t('bt_connect')}}
                  </el-button>

                  <el-button
                      v-if="item.opened"
                      size="large"
                      type="danger"
                      @click="disconnectDevice(item)"
                  >{{$t('bt_disconnect')}}
                  </el-button>

                  <el-button
                      v-if="item.opened"
                      size="large"
                      type="success"
                      @click="enterSetting(item)"
                  >{{$t('bt_enter')}}
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