<script setup lang="ts">
import {onMounted, ref} from 'vue';
import MouseInfo from './MouseInfo.vue';
import BasicConfig from './BasicConfig.vue';
import ProfileConfig from './ProfileConfig.vue';
import ButtonConfig from './ButtonConfig.vue';
import MacroConfig from './MacroConfig.vue';
import SensorConfig from './SensorConfig.vue';
import LedConfig from './LedConfig.vue';
import {sendDataToDevice, useHIDListener} from "@/components/webhid.ts";
import {AuroraBackground} from "@/components/ui/aurora-background";
import {MouseCommandBuilder, ParamType, ResponseParser} from "@/components/command.ts";
import {SwitchFilled, Document,InfoFilled,HomeFilled,Opportunity,Tools} from '@element-plus/icons-vue'


const emit = defineEmits(['back']);

const props = defineProps<{
  hard?: boolean;
  currentDevice?: HIDDevice;
}>();

const allProfileList = ['配置文件1', '配置文件2', '配置文件3', '配置文件4'];
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
  <AuroraBackground class="fixed top-0 left-0 w-full h-full z-0"
                    :radial-gradient="true">
  </AuroraBackground>

  <el-container class="z-50 overflow-hidden h-full w-full">
    <el-header>
      <div class="top-0 left-0 flex flex-row">
        <el-page-header class="sm:text-2xl" @back="goBack">
          <template #content>
            <span
                class="text-center text-xl text-black sm:mb-20 sm:text-2xl dark:text-white"> WebHID 鼠标配置工具 </span>
          </template>
        </el-page-header>
        <el-icon :size="31">
          <SwitchFilled/>
        </el-icon>
      </div>
    </el-header>

    <el-container class="z-50 flex h-full">

      <el-aside class="bg-white rounded-md w-44 aside">
        <h5 class="m-4">配置列表</h5>
        <el-menu
            :default-active="0"
            class="el-menu--vertical"
            @select="handleSelectProfile"
        >
          <!-- 单层菜单项 -->
          <el-menu-item v-for="(item,index) in allProfileList" :key="index" :index="index">
            <template #title>
              <el-icon>
                <Document/>
              </el-icon>
              <span>{{ item }}</span>
            </template>
          </el-menu-item>

        </el-menu>

      </el-aside>

      <el-main class="el-main-0 flex-1 overflow-auto ">
        <el-container direction="vertical">
          <el-tabs
              v-model="activeTab"
              class="demo-tabs ml-10"
              @tab-click=""
          >
            <el-tab-pane name="button">
              <template #label>
                <span class="custom-tabs-label">
                  <el-icon size="25"><HomeFilled/></el-icon>
                  <span class="ml-1">按键设置</span>
                </span>
              </template>
              <ButtonConfig v-if="activeTab === 'button' || enableAllConfigSections"
                            v-show="!enableAllConfigSections"
                            :key="refreshKey" :active-profile="activeProfile" :hard="hard"
                            :currentDevice="currentDevice"
                            v-model:bridge-data="profileConfigData.button"
                            v-model:bridge-status="profileConfigStatus.button"/>
            </el-tab-pane>
            <el-tab-pane name="basic">
              <template #label>
                <span class="custom-tabs-label">
                  <el-icon size="25"><Tools/></el-icon>
                  <span class="ml-1">DPI设置</span>
                </span>
              </template>
              <BasicConfig v-if="activeTab === 'basic' || enableAllConfigSections"
                           v-show="!enableAllConfigSections"
                           :key="refreshKey" :active-profile="activeProfile" :hard="hard"
                           :currentDevice="currentDevice"
                           v-model:bridge-data="profileConfigData.basic"
                           v-model:bridge-status="profileConfigStatus.basic"/>
            </el-tab-pane>
            <el-tab-pane name="led">
              <template #label>
                <span class="custom-tabs-label">
                  <el-icon size="25"><Opportunity/></el-icon>
                  <span class="ml-1">LED灯光</span>
                </span>
              </template>
              <LedConfig v-if="activeTab === 'led' || enableAllConfigSections" v-show="!enableAllConfigSections"
                         :key="refreshKey" :active-profile="activeProfile" :hard="hard"
                         :currentDevice="currentDevice"
                         v-model:bridge-data="profileConfigData.led"
                         v-model:bridge-status="profileConfigStatus.led"/>
            </el-tab-pane>
            <el-tab-pane name="info">
              <template #label>
                <span class="custom-tabs-label">
                  <el-icon size="25"><InfoFilled/></el-icon>
                  <span class="ml-1">鼠标信息</span>
                </span>
              </template>
              <MouseInfo v-if="activeTab === 'info'"
                         :key="refreshKey" :currentDevice="currentDevice"/>
            </el-tab-pane>
          </el-tabs>

          <div class="ml-10 mr-10 mt-5">
            <div>
              <Suspense>
                <div>


                  <MacroConfig v-if="activeTab === 'macro'"
                               :key="refreshKey" :active-profile="activeProfile" :hard="hard"
                               :currentDevice="currentDevice"/>
                  <SensorConfig v-if="activeTab === 'sensor'"
                                :key="refreshKey" :active-profile="activeProfile" :hard="hard"
                                :currentDevice="currentDevice"/>

                  <!--                    <div v-if="activeTab === 'info' && !hard">No hardware connected</div>-->
                  <!--                  <PythonRunner v-if="activeTab === 'info'"/>-->
                  <!--                  v-show is used to load available profiles when initially loaded-->
                  <ProfileConfig v-show="activeTab === 'profile'"
                                 :key="refreshKey" :hard="hard" @update="updateHasProfileList"
                                 :is-config-all-idle="isConfigAllIdle"
                                 v-model:profile-config-data="profileConfigData"
                                 v-model:enable-all-config-sections="enableAllConfigSections"/>
                </div>
                <template #fallback>
                  <div>Loading...</div>
                </template>
              </Suspense>
            </div>
          </div>
        </el-container>
      </el-main>
    </el-container>
    <!--    <el-footer>...</el-footer>-->
  </el-container>
</template>

<style scoped>
.btn-active {
  background-color: #409EFF;
  color: white !important;
}

.el-main-0 {
  padding: 0 !important;
  margin: 0 !important;
}

.aside {
  min-height: 40rem;
}

.demo-tabs > .el-tabs__content {
  padding: 32px;
  color: #6b778c;
  font-size: 32px;
  font-weight: 600;
}

.demo-tabs .custom-tabs-label .el-icon {
  vertical-align: bottom;
}
</style>