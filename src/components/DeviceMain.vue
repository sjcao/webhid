<script setup lang="ts">
import {ref} from 'vue';
import MouseInfo from './MouseInfo.vue';
import BasicConfig from './BasicConfig.vue';
import ProfileConfig from './ProfileConfig.vue';
import ButtonConfig from './ButtonConfig.vue';
import MacroConfig from './MacroConfig.vue';
import SensorConfig from './SensorConfig.vue';
import LedConfig from './LedConfig.vue';
import {useHIDListener} from "@/components/webhid.ts";

const emit = defineEmits(['back']);

const props = defineProps<{
  hard?: boolean;
  currentDevice?: HIDDevice;
}>();

const allProfileList = ['配置文件1', '配置文件2', '配置文件3','配置文件4'];
const activeProfile = ref('direct');
const activeTab = ref('basic');
const refreshKey = ref(0);
const hasProfileList = ref(['direct', 'white']);

function hasProfile(name: string) {
  return hasProfileList.value.indexOf(name) !== -1;
}

function updateHasProfileList(value: string[]) {
  value = ['direct'].concat(value);
  hasProfileList.value = value;
  if (!value.includes(activeProfile.value)) {
    activeProfile.value = 'direct';
  }
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

const handleSelectProfile = (profile: string) => {
  activeProfile.value = profile;
}


</script>
<template>
  <el-container>
    <el-header>
      <el-page-header @back="goBack">
        <template #content>
          <span class="text-large font-600 mr-3"> WebHID 鼠标配置工具 </span>
        </template>
      </el-page-header>
    </el-header>

    <el-container>

      <el-aside width="200px">
        配置列表
        <el-menu
            :default-active="0"
            class="dynamic-menu"
            @select="handleSelectProfile"
        >
          <!-- 单层菜单项 -->
          <el-menu-item v-for="(item,index) in allProfileList" :key="index" :index="index">
            <span>{{ item }}</span>
          </el-menu-item>

        </el-menu>

      </el-aside>

      <el-main>
        <el-container direction="vertical">
            <div class="join join-horizontal">
              <el-button-group>
                <el-button class="join-item" :class="{'btn-active': activeTab === 'basic'}"
                           @click="activeTab = 'basic'; refreshKey++; ">DPI设置
                </el-button>
                <el-button class="join-item" :class="{'btn-active': activeTab === 'button'}"
                           @click="activeTab = 'button'; refreshKey++; ">按键设置
                </el-button>
                <el-button class="join-item" :class="{'btn-active': activeTab === 'led'}"
                           @click="activeTab = 'led'; refreshKey++; ">LED灯光
                </el-button>
                <el-button class="join-item" :class="{'btn-active': activeTab === 'profile'}"
                           @click="activeTab = 'profile'; refreshKey++; ">配置文件
                </el-button>
                <el-button class="join-item" :class="{'btn-active': activeTab === 'macro'}"
                           @click="activeTab = 'macro'; refreshKey++; ">宏录制
                </el-button>
                <!--              <el-button class="join-item" :class="{'btn-active': activeTab === 'sensor'}"-->
                <!--                      @click="activeTab = 'sensor'; refreshKey++; ">传感器-->
                <!--              </el-button>-->
                <el-button class="join-item" :class="{'btn-active': activeTab === 'info'}"
                           @click="activeTab = 'info'; refreshKey++; ">鼠标信息
                </el-button>
              </el-button-group>
            </div>

          <div class="w-md p-2">
            <div>
              <Suspense>
                <div>
                  <BasicConfig v-if="activeTab === 'basic' || enableAllConfigSections" v-show="!enableAllConfigSections"
                               :key="refreshKey" :active-profile="activeProfile" :hard="hard"
                               :currentDevice="currentDevice"
                               v-model:bridge-data="profileConfigData.basic"
                               v-model:bridge-status="profileConfigStatus.basic"/>
                  <ButtonConfig v-if="activeTab === 'button' || enableAllConfigSections"
                                v-show="!enableAllConfigSections"
                                :key="refreshKey" :active-profile="activeProfile" :hard="hard"
                                :currentDevice="currentDevice"
                                v-model:bridge-data="profileConfigData.button"
                                v-model:bridge-status="profileConfigStatus.button"/>
                  <LedConfig v-if="activeTab === 'led' || enableAllConfigSections" v-show="!enableAllConfigSections"
                             :key="refreshKey" :active-profile="activeProfile" :hard="hard"
                             :currentDevice="currentDevice"
                             v-model:bridge-data="profileConfigData.led"
                             v-model:bridge-status="profileConfigStatus.led"/>
                  <MacroConfig v-if="activeTab === 'macro'"
                               :key="refreshKey" :active-profile="activeProfile" :hard="hard"
                               :currentDevice="currentDevice"/>
                  <SensorConfig v-if="activeTab === 'sensor'"
                                :key="refreshKey" :active-profile="activeProfile" :hard="hard"
                                :currentDevice="currentDevice"/>
                  <MouseInfo v-if="activeTab === 'info' && hard"
                             :key="refreshKey" :currentDevice="currentDevice"/>
                  <div v-if="activeTab === 'info' && !hard">No hardware connected</div>
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
  background-color: dodgerblue;
  color: white;
}

.dynamic-menu {

}

</style>