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