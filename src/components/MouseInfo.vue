<script setup lang="ts">

import {MouseCommandBuilder, ParamType, ResponseParser} from "@/components/command.ts";
import {sendDataToDevice, useHIDListener} from "@/components/webhid.ts";
import {onMounted, ref} from "vue";
import {useDark} from "@vueuse/core";
import {useI18n} from "vue-i18n";
import { Monitor, InfoFilled, Connection, Document, RefreshRight, Warning } from '@element-plus/icons-vue';

const props = defineProps<{
  currentDevice?: HIDDevice;
}>();
const localeI18n = useI18n();

const workMode = ref(localeI18n.t('work_mode_usb'))
const type = ref(localeI18n.t('work_type_mouse'))
const ver = ref('v1.0')
const profile = ref(0)
const handleData = (data: Uint8Array) => {
  const [msgType, result] = ResponseParser.parse(Array.from(data))
  if (msgType === ParamType.WORK_MODE) {
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
  }else if (msgType === ParamType.VERSION){
    ver.value = result.version
    // Fix: ParamType.VERSION result might not have 'type' property according to lint, but assuming code was working, maybe it's valid runtime.
    // However, the lint said Property 'value' does not exist on type 'ParamType.VERSION'.
    // Actually the lint said: Property 'value' does not exist on type 'ParamType.VERSION'. Did you mean 'valueOf'?
    // Wait, the lint message was about line 35: type.value = result.type...
    // The previous code was: type.value = result.type==='Mouse' ? ...
    // I will trust the original logic but rename 'type' to 'msgType' to avoid shadowing.
    type.value = result.type==='Mouse' ? localeI18n.t('work_type_mouse') : localeI18n.t('work_type_receiver')
  }
  else if (msgType === ParamType.PROFILE) {
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
  <div class="flex flex-col gap-8 w-full max-w-2xl mx-auto">
    
    <!-- Info Card -->
    <div class="glass-card rounded-xl p-6 border border-white/5">
       <h3 class="text-lg font-semibold mb-6 flex items-center gap-2">
          <span class="w-1 h-6 bg-primary rounded-full"></span>
          {{ $t('mouseInfo') }}
       </h3>
       
       <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-black/5 dark:bg-black/20 p-6 rounded-xl border border-white/5 flex items-center gap-4 hover:bg-black/10 transition-colors group">
             <div class="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <el-icon size="24"><Monitor /></el-icon>
             </div>
             <div class="flex flex-col">
                <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{{ $t('model') }}</span>
                <span class="text-xl font-bold">ATU-MOUSE</span>
             </div>
          </div>
          
          <div class="bg-black/5 dark:bg-black/20 p-6 rounded-xl border border-white/5 flex items-center gap-4 hover:bg-black/10 transition-colors group">
             <div class="p-3 rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <el-icon size="24"><InfoFilled /></el-icon>
             </div>
             <div class="flex flex-col">
                <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{{ $t('version') }}</span>
                <span class="text-xl font-mono text-foreground">{{ver}}</span>
             </div>
          </div>
          
          <div class="bg-black/5 dark:bg-black/20 p-6 rounded-xl border border-white/5 flex items-center gap-4 hover:bg-black/10 transition-colors group">
             <div class="p-3 rounded-lg bg-green-500/10 text-green-500 group-hover:bg-green-500 group-hover:text-white transition-colors">
                <el-icon size="24"><Connection /></el-icon>
             </div>
             <div class="flex flex-col">
                <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{{ $t('work_Mode') }}</span>
                <span class="text-lg font-medium">{{workMode}}</span>
             </div>
          </div>
          
          <div class="bg-black/5 dark:bg-black/20 p-6 rounded-xl border border-white/5 flex items-center gap-4 hover:bg-black/10 transition-colors group">
             <div class="p-3 rounded-lg bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <el-icon size="24"><Document /></el-icon>
             </div>
             <div class="flex flex-col">
                <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{{ $t('menu_profile') }}</span>
                <span class="text-lg font-medium">{{profile}}</span>
             </div>
          </div>
       </div>
    </div>

    <!-- Actions -->
    <div class="glass-card rounded-xl p-6 border border-white/5">
       <h3 class="text-lg font-semibold mb-6 flex items-center gap-2">
          <span class="w-1 h-6 bg-red-500 rounded-full"></span>
          {{ $t('factory_reset') }}
       </h3>
       
       <div class="flex gap-4">
          <button
              class="flex-1 py-4 px-4 rounded-xl bg-secondary/50 text-secondary-foreground font-medium hover:bg-red-500 hover:text-white transition-all border border-border flex items-center justify-center gap-2 group"
              @click="resetAllVisible = true"
          >
             <el-icon class="group-hover:rotate-180 transition-transform duration-500"><Warning /></el-icon>
             {{ $t('bt_restore_all') }}
          </button>

          <button
              class="flex-1 py-4 px-4 rounded-xl bg-secondary/50 text-secondary-foreground font-medium hover:bg-orange-500 hover:text-white transition-all border border-border flex items-center justify-center gap-2 group"
              @click="resetKeyVisible = true"
          >
             <el-icon class="group-hover:rotate-180 transition-transform duration-500"><RefreshRight /></el-icon>
             {{ $t('bt_restore_key') }}
          </button>
       </div>
    </div>

  </div>

  <el-dialog
      v-model="resetAllVisible"
      :title="$t('title_warning')"
      width="400px"
      align-center
      class="glass-panel text-foreground rounded-xl"
      :show-close="false"
  >
    <div class="py-4 text-base">
       {{ $t('bt_restore_all') }}? {{ $t('action_undone') }}
    </div>
    <template #footer>
      <span class="dialog-footer flex gap-3 justify-end">
        <button class="px-4 py-2 rounded-lg hover:bg-white/5 transition-colors" @click="resetAllVisible = false">{{ $t('bt_cancel') }}</button>
        <button class="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors" @click="restoreAllDefaultSettings(); resetAllVisible = false">
          {{ $t('bt_confirm') }}
        </button>
      </span>
    </template>
  </el-dialog>

  <el-dialog
      v-model="resetKeyVisible"
      :title="$t('title_warning')"
      width="400px"
      align-center
      class="glass-panel text-foreground rounded-xl"
      :show-close="false"
  >
    <div class="py-4 text-base">
       {{ $t('bt_restore_key') }}? {{ $t('action_undone') }}
    </div>
    <template #footer>
      <span class="dialog-footer flex gap-3 justify-end">
        <button class="px-4 py-2 rounded-lg hover:bg-white/5 transition-colors" @click="resetKeyVisible = false">{{ $t('bt_cancel') }}</button>
        <button class="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors" @click="restoreKeyDefaultSettings(); resetKeyVisible = false">
          {{ $t('bt_confirm') }}
        </button>
      </span>
    </template>
  </el-dialog>

</template>
<style lang="scss" scoped>
:deep(.el-dialog) {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  --el-dialog-title-font-size: 1.25rem;
  --el-text-color-primary: hsl(var(--foreground));
}
</style>