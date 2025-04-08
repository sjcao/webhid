<script setup lang="ts">
import {ref, computed, onMounted} from 'vue';
import {ElMessage} from "element-plus";

const emit = defineEmits(['deviceCreated', 'deviceNotCreated']);

// 设备列表
const devices = ref<HIDDevice[]>([])
const loading = ref(false)

async function requestDevice() {
  if (!hasHid()) {
    ElMessage({
      message: '你的浏览器不支持 WebHID 😭',
      type: 'warning',
    })
    return;
  }

  const devices = await navigator.hid.requestDevice({
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
    }else {
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
  <el-container class="connect-device-container">
    <el-header>
      <h1> WebHID 鼠标配置工具</h1>
    </el-header>

    <div>
      仅支持 Chrome、Edge、Opera 等内核的浏览器。</div>
    <div>如列表中无设备显示，请点击按钮，以允许浏览器连接到您的设备</div>

    <el-button class="btn btn-primary block w-96" @click="requestDevice" :class="{'btn-disabled': !isPythonReady}">
      请求浏览器访问设备
    </el-button>
    <button class="btn block w-96" @click="noHardwareMode" :class="{'btn-disabled': !isPythonReady}">无设备模式
    </button>

    <!-- 设备列表 -->
    <el-table
        class="el-table-devices"
        :data="devices"
        border
        stripe
        v-loading="loading"
        empty-text="未检测到已连接设备"
    >
      <el-table-column prop="productName" label="设备名称" width="220"/>
      <el-table-column label="厂商/产品 ID" width="180">
        <template #default="{ row }">
          <div>厂商: 0x{{ row.vendorId.toString(16).toUpperCase() }}</div>
          <div>产品: 0x{{ row.productId.toString(16).toUpperCase() }}</div>
        </template>
      </el-table-column>

      <el-table-column prop="opened" label="连接状态" width="120">
        <template #default="{ row }">
          <el-tag :type="row.opened ? 'success' : 'danger'">
            {{ row.opened ? '已连接' : '未连接' }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="200" align="center">
        <template #default="{ row }">
          <el-row>

          <el-button
              v-if="!row.opened"
              size="small"
              type="success"
              @click="connectDevice(row)"
          >连接</el-button>

          <el-button
              v-if="row.opened"
              size="small"
              type="danger"
              @click="disconnectDevice(row)"
          >断开</el-button>

          <el-button
              v-if="row.opened"
              size="small"
              type="success"
              @click="enterSetting(row)"
          >进入设置</el-button>
          </el-row>

        </template>
      </el-table-column>
    </el-table>
  </el-container>
</template>

<style scoped>
  .connect-device-container {
    display: flex;
    align-items: center;
    height: 100vh; /* 使容器高度占满整个视口 */
    width: 100vw;
    gap: 30px;
  }
  .el-table-devices{
    display: flex;
    justify-content: center;
  }
</style>