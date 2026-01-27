<script setup lang="ts">
import {onMounted, ref, computed} from 'vue';
import MouseInfo from './MouseInfo.vue';
import BasicConfig from './BasicConfig.vue';
import ButtonConfig from './ButtonConfig.vue';
import LedConfig from './LedConfig.vue';
import {sendDataToDevice, useHIDListener} from "@/components/webhid.ts";

import {MouseCommandBuilder, ParamType, ResponseParser} from "@/components/command.ts";
import {Switch, SwitchFilled, Document, InfoFilled, HomeFilled, Opportunity, Tools, Back} from '@element-plus/icons-vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import en from 'element-plus/dist/locale/en.mjs'
import {useI18n} from 'vue-i18n';
import {switchLanguage} from "@/components/lang/i18n.ts";


const emit = defineEmits(['back']);

const props = defineProps<{
  hard?: boolean;
  currentDevice?: HIDDevice;
}>();

const localeI18n = useI18n();

const language = localeI18n.locale
const locale = computed(() => (language.value === 'zh-cn' ? zhCn : en))

const allProfileList = [localeI18n.t('menu_profile1')
  , localeI18n.t('menu_profile2')
  , localeI18n.t('menu_profile3')
  , localeI18n.t('menu_profile4')];
const activeProfile = ref(0);
const activeTab = ref('button');
const refreshKey = ref(0);
const hasProfileList = ref(['direct', 'white']);

function hasProfile(name: string) {
  return hasProfileList.value.indexOf(name) !== -1;
}

function updateHasProfileList(value: string[]) {
  // value = ['direct'].concat(value);
  // hasProfileList.value = value;
  // if (!value.includes(activeProfile.value)) {
  //   activeProfile.value = 'direct';
  // }
}

const profileConfigData = ref({
  basic: {},
  button: {},
  led: {},
});
const profileConfigStatus = ref({
  basic: {},
  button: {},
  led: {},
});
const isConfigAllIdle = ref(true);
const enableAllConfigSections = ref(false);

const goBack = () => {
  emit("back");
}

const handleSelectProfile = (index: number) => {
  activeProfile.value = index
  //切换
  const cmd = MouseCommandBuilder.switchProfile(index)
  sendDataToDevice(cmd)
}

const handleData = (data: Uint8Array) => {
  const [type, result] = ResponseParser.parse(Array.from(data))
  if (type === ParamType.PROFILE) {
    activeProfile.value = result.profile
  }
}

useHIDListener(handleData);

onMounted(() => {
  //读取DPi设置
  //处理设备数据
  const com = MouseCommandBuilder.readProfile()
  sendDataToDevice(com)
})
</script>
<template>
  <div class="fixed inset-0 w-full h-full bg-background text-foreground flex overflow-hidden">
    <!-- Background Animation -->
    <div class="absolute inset-0 pointer-events-none">
       <div class="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/10 blur-[100px] rounded-full"></div>
       <div class="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-500/10 blur-[100px] rounded-full"></div>
    </div>

    <el-config-provider :locale="locale">
      <el-container class="relative z-10 w-full h-full p-6 gap-6">
        
        <!-- Sidebar -->
        <el-aside width="280px" class="glass-panel rounded-2xl flex flex-col overflow-hidden border border-white/5 shadow-2xl">
          <div class="p-6 border-b border-white/5 flex flex-col gap-4">
             <button @click="goBack" class="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors self-start mb-2 group">
                <el-icon class="group-hover:-translate-x-1 transition-transform"><Back /></el-icon>
                <span>{{ $t('back_to_devices') }}</span>
             </button>
             <div class="flex items-center gap-3">
                 <div class="p-2 bg-primary/10 rounded-lg text-primary">
                    <el-icon size="24"><Tools /></el-icon>
                 </div>
                 <h2 class="text-xl font-bold tracking-tight m-0">{{ $t('device_settings') }}</h2>
             </div>
          </div>

          <div class="flex-1 overflow-y-auto py-6 px-4">
             <div class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">{{ $t('profileList') }}</div>
             
             <el-menu
                :default-active="String(activeProfile)"
                class="border-none bg-transparent !border-r-0"
                @select="(index) => handleSelectProfile(Number(index))"
                text-color="currentColor"
                active-text-color="var(--primary)"
             >
               <el-menu-item 
                  v-for="(item,index) in allProfileList" 
                  :key="index" 
                  :index="String(index)"
                  class="rounded-lg mb-1 hover:bg-white/5 data-[active=true]:bg-primary/10 data-[active=true]:text-primary transition-all duration-200 group"
               >
                 <el-icon class="group-hover:scale-110 transition-transform"><Document/></el-icon>
                 <span class="font-medium">{{ $t('menu_profile') }} {{ index }}</span>
               </el-menu-item>
             </el-menu>
          </div>


        </el-aside>

        <el-container class="flex flex-col gap-6 h-full overflow-hidden">
          <!-- Header -->
          <el-header height="auto" class="glass-panel rounded-2xl p-6 flex justify-between items-center border border-white/5 shadow-xl shrink-0">
             <div>
                <h1 class="text-3xl font-bold tracking-tight m-0 leading-tight">
                  {{ $t('top_title') }}
                </h1>
                <p class="text-muted-foreground text-sm mt-1">{{ $t('subtitle_desc') }}</p>
             </div>
             
             <!-- Tab Navigation (Pills) -->
             <div class="flex bg-black/20 p-1 rounded-xl backdrop-blur-sm border border-white/5">
                <button 
                  v-for="tab in [
                    { id: 'button', icon: HomeFilled, label: 'tab_button_config' },
                    { id: 'basic', icon: Tools, label: 'tab_dpi_config' },
                    { id: 'led', icon: Opportunity, label: 'tab_led_config' },
                    { id: 'info', icon: InfoFilled, label: 'tab_mouse_info' }
                  ]"
                  :key="tab.id"
                  @click="activeTab = tab.id"
                  :class="[
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    activeTab === tab.id 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  ]"
                >
                   <el-icon><component :is="tab.icon" /></el-icon>
                   <span>{{ $t(tab.label) }}</span>
                </button>
             </div>
          </el-header>

          <!-- Main Content -->
          <el-main class="glass-panel rounded-2xl p-0 border border-white/5 shadow-xl overflow-hidden relative flex-1">
             <div class="h-full overflow-y-auto p-8 custom-scrollbar">
                
                <Transition name="fade" mode="out-in">
                  <div :key="activeTab" class="h-full">
                    <ButtonConfig v-if="activeTab === 'button'"
                                  :key="refreshKey" :active-profile="activeProfile" :hard="hard"
                                  :currentDevice="currentDevice"
                                  v-model:bridge-data="profileConfigData.button"
                                  v-model:bridge-status="profileConfigStatus.button"/>
                                  
                    <BasicConfig v-if="activeTab === 'basic'"
                                 :key="refreshKey" :active-profile="activeProfile" :hard="hard"
                                 :currentDevice="currentDevice"
                                 v-model:bridge-data="profileConfigData.basic"
                                 v-model:bridge-status="profileConfigStatus.basic"/>
                                 
                    <LedConfig v-if="activeTab === 'led'"
                               :key="refreshKey" :active-profile="activeProfile" :hard="hard"
                               :currentDevice="currentDevice"
                               v-model:bridge-data="profileConfigData.led"
                               v-model:bridge-status="profileConfigStatus.led"/>
                               
                    <MouseInfo v-if="activeTab === 'info'"
                               :key="refreshKey" :currentDevice="currentDevice"/>
                  </div>
                </Transition>

             </div>
          </el-main>
        </el-container>
      </el-container>
    </el-config-provider>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

:deep(.el-menu-item:hover) {
  background-color: transparent;
}
</style>