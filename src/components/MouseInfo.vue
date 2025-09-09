<script setup lang="ts">

import {MouseCommandBuilder, ParamType, ResponseParser} from "@/components/command.ts";
import {sendDataToDevice, useHIDListener} from "@/components/webhid.ts";
import {onMounted, ref} from "vue";
import {useDark} from "@vueuse/core";
import {useI18n} from "vue-i18n";

const props = defineProps<{
  currentDevice?: HIDDevice;
}>();
const localeI18n = useI18n();

const workMode = ref(localeI18n.t('work_mode_usb'))
const type = ref(localeI18n.t('work_type_mouse'))
const ver = ref('v1.0')
const profile = ref(0)
const handleData = (data: Uint8Array) => {
  const [type, result] = ResponseParser.parse(Array.from(data))
  if (type === ParamType.WORK_MODE) {
    const mode = result.mode
    if (mode === 0) {
      workMode.value = localeI18n.t('work_mode_usb')
      const com = MouseCommandBuilder.readVersion(0)
      sendDataToDevice(com)
    } else if (mode === 1) {
      const com = MouseCommandBuilder.readVersion(1)
      sendDataToDevice(com)
      workMode.value = localeI18n.t('work_mode_wireless')
    } else if (mode === 2) {
      workMode.value = localeI18n.t('work_mode_ble')
    }
  }else if (type === ParamType.VERSION){
    ver.value = result.version
    type.value = result.type==='Mouse' ? localeI18n.t('work_type_mouse') : localeI18n.t('work_type_receiver')
  }
  else if (type === ParamType.PROFILE) {
    profile.value = result.profile
  }
}

useHIDListener(handleData);

onMounted(() => {
  //读取DPi设置
  //处理设备数据
  const com = MouseCommandBuilder.readWorkMode()
  sendDataToDevice(com)

  sendDataToDevice(MouseCommandBuilder.readProfile())
})

const isDark = useDark({});

const resetAllVisible = ref(false);
const resetKeyVisible = ref(false);

const restoreAllDefaultSettings = () => {
  const com = MouseCommandBuilder.resetAllSettings()
  sendDataToDevice(com)
}
const restoreKeyDefaultSettings = () => {
  // ySelectedIndex.value = defaultIndex
  const com = MouseCommandBuilder.resetKeySettings()
  sendDataToDevice(com)
}

</script>
<template>
  <div class="flex w-full h-full dark:bg-transparent dark:text-white">
    <el-descriptions :column="1" border>
      <template #title>
        <span class="dark:text-white">{{ $t('mouseInfo') }}</span>
      </template>
      <el-descriptions-item
          :label="$t('model')"
          label-align="right"
          align="center"
          label-class-name="my-label"
          class-name="my-content"
          width="150px"
      >ATU-MOUSE
      </el-descriptions-item
      >
      <el-descriptions-item :label="$t('version')" label-align="right" align="center"
                            label-class-name="my-label"
                            class-name="my-content"
      >{{ver}}
      </el-descriptions-item>
      <el-descriptions-item :label="$t('work_Mode')" label-align="right" align="center"
                            label-class-name="my-label"
                            class-name="my-content"
      >{{workMode}}
      </el-descriptions-item>
      <el-descriptions-item :label="$t('menu_profile')" label-align="right" align="center"
                            label-class-name="my-label"
                            class-name="my-content"
      >{{profile}}
      </el-descriptions-item>
    </el-descriptions>
  </div>

  <div class="mt-5">
    <el-button
        type="info"
        @click="resetAllVisible = true"
    >{{ $t('bt_restore_all') }}
    </el-button>

    <el-button
        type="info"
        @click="resetKeyVisible = true"
    >{{ $t('bt_restore_key') }}
    </el-button>
  </div>

  <el-dialog
      v-model="resetAllVisible"
      title="提示"
      width="30%"
      align-center
      class="dark:bg-zinc-900 dark:text-warning"
  >
    <span class="dark:text-warning">是否恢复默认设置</span>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="resetAllVisible = false">取消</el-button>
        <el-button type="primary" @click="restoreAllDefaultSettings(); resetAllVisible = false">
          确认
        </el-button>
      </span>
    </template>
  </el-dialog>

  <el-dialog
      v-model="resetKeyVisible"
      title="提示"
      width="30%"
      align-center
      class="dark:bg-zinc-900 dark:text-warning"
  >
    <span class="dark:text-warning">是否恢复默认设置</span>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="resetKeyVisible = false">取消</el-button>
        <el-button type="primary" @click="restoreKeyDefaultSettings(); resetKeyVisible = false">
          确认
        </el-button>
      </span>
    </template>
  </el-dialog>

</template>
<style lang="scss" scoped>
:deep(.my-label) {
  background: v-bind("isDark ? '#18181B' : ''") !important;
  color: v-bind("isDark ? '#FFF' : ''") !important;
}

:deep(.my-content) {
  background: v-bind("isDark ? '#18181B' : ''");
  color: v-bind("isDark ? '#FFF' : ''") !important;
}
</style>