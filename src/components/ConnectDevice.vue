<script setup lang="ts">
import {ref, computed, onMounted} from 'vue';
import {ElMessage} from "element-plus";
import {AuroraBackground} from "@/components/ui/aurora-background";
import {Motion} from "motion-v";
import {BentoGrid, BentoGridCard, BentoGridItem} from "@/components/ui/bento-grid";

const emit = defineEmits(['deviceCreated', 'deviceNotCreated']);

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


const items = [
  {
    title: "The Dawn of Innovation",
    description: "Explore the birth of groundbreaking ideas and inventions.",
  },
  {
    title: "The Digital Revolution",
    description: "Dive into the transformative power of technology.",
  },
  {
    title: "The Art of Design",
    description: "Discover the beauty of thoughtful and experience design.",
  },
  {
    title: "The Power of Communication",
    description: "Understand the impact of effective communication in our lives.",
  },
  {
    title: "The Pursuit of Knowledge",
    description: "Join the quest for understanding and enlightenment.",
  },
  {
    title: "The Joy of Creation",
    description: "Experience the thrill of bringing ideas to life.",
  },
  {
    title: "The Spirit of Adventure",
    description: "Embark on exciting journeys and thrilling discoveries.",
  },
];

</script>
<template>
  <AuroraBackground class="fixed overflow-auto top-0 left-0 w-full h-full flex flex-col items-center justify-center gap-4 px-4"
                    :radial-gradient="true">
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

        <BentoGrid class="mx-auto max-w-4xl">
          <BentoGridItem
              v-for="(item, index) in items"
              :key="index"
              :class="index === 3 || index === 6 ? 'md:col-span-2' : ''"
          >
            <template #header>
              <div class="flex size-full animate-pulse space-x-4">
                <div class="flex size-full flex-1 rounded-md bg-zinc-800"></div>
              </div>
            </template>

            <template #title>
              <strong>{{ item.title }}</strong>
            </template>

            <template #icon> </template>

            <template #description>
              <p>{{ item.description }}</p>
            </template>
          </BentoGridItem>
        </BentoGrid>

        <!-- 设备列表 -->
        <div class="el-carousel-container">
          <el-carousel :initial-index="Math.floor(devices.length/2)" :autoplay="false" :arrow="'always'" :loop="false"
                       :indicator-position="'outside'" type="card" height="360px">
            <el-carousel-item v-for="(item,index) in devices" :key="index" @click="">
              <!--          <h3 text="2xl" justify="center">{{ item }}</h3>-->
              <div class="image-container">
                <el-image :src="imgMouse" fit="cover"></el-image>
                <!--            <div>厂商: 0x{{ item.vendorId.toString(16).toUpperCase() }}</div>-->
                <div>{{ item.productName.toString().toUpperCase() }}</div>
                <div>
                  <el-tag :type="item.opened ? 'success' : 'danger'">
                    {{ item.opened ? '已连接' : '未连接' }}
                  </el-tag>
                </div>
                <div class="mb-3">
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
              </div>
            </el-carousel-item>
          </el-carousel>
        </div>

        <!--    <el-table-->
        <!--        class="el-table-devices"-->
        <!--        :data="devices"-->
        <!--        border-->
        <!--        stripe-->
        <!--        v-loading="loading"-->
        <!--        empty-text="未检测到已连接设备"-->
        <!--    >-->
        <!--      <el-table-column prop="productName" label="设备名称"/>-->
        <!--      <el-table-column label="厂商/产品 ID">-->
        <!--        <template #default="{ row }">-->
        <!--          <div>厂商: 0x{{ row.vendorId.toString(16).toUpperCase() }}</div>-->
        <!--          <div>产品: 0x{{ row.productId.toString(16).toUpperCase() }}</div>-->
        <!--        </template>-->
        <!--      </el-table-column>-->

        <!--      <el-table-column prop="opened" label="连接状态">-->
        <!--        <template #default="{ row }">-->
        <!--          <el-tag :type="row.opened ? 'success' : 'danger'">-->
        <!--            {{ row.opened ? '已连接' : '未连接' }}-->
        <!--          </el-tag>-->
        <!--        </template>-->
        <!--      </el-table-column>-->

        <!--      <el-table-column label="操作">-->
        <!--        <template #default="{ row }">-->
        <!--          <el-row>-->

        <!--          <el-button-->
        <!--              v-if="!row.opened"-->
        <!--              size="small"-->
        <!--              type="success"-->
        <!--              @click="connectDevice(row)"-->
        <!--          >连接</el-button>-->

        <!--          <el-button-->
        <!--              v-if="row.opened"-->
        <!--              size="small"-->
        <!--              type="danger"-->
        <!--              @click="disconnectDevice(row)"-->
        <!--          >断开</el-button>-->

        <!--          <el-button-->
        <!--              v-if="row.opened"-->
        <!--              size="small"-->
        <!--              type="success"-->
        <!--              @click="enterSetting(row)"-->
        <!--          >进入设置</el-button>-->
        <!--          </el-row>-->

        <!--        </template>-->
        <!--      </el-table-column>-->
        <!--    </el-table>-->
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