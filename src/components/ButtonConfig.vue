<script setup lang="ts">
import {computed, ref} from 'vue';

import {CardBody, CardContainer, CardItem} from "@/components/ui/card-3d";

const props = defineProps<{
  hard?: boolean; // should it interact with hardware or just dummy
  activeProfile: string;
  currentDevice?: HIDDevice;
}>();

const imgMouse = new URL(`/ic-moouse.png`, import.meta.url).href


const isShowButtonMenu = ref(false)
const selectedButton = ref('left');
const leftDialogVisible = ref(false);

const functionCategoryList = [
  '系统按键', '键盘按键', '特殊按键', '录制宏'
];

const MouseKeyItem = ['关闭', '左键', '右键', '中键', '后退', '前进']
const ProfileKeyItem = ['切换板载配置1', '切换板载配置2', '切换板载配置3', '切换板载配置4']
const DPIKeyItem = ['DPI循环', 'DPI+', 'DPI-']
const ScrollKeyItem = ['左滚', '右滚', '上滚', '下滚']
const ConsumerKeyItem = ['亮度+', '亮度-', '播放器', '停止播放', '播放/暂停', '上一首', '下一首', '静音', '音量+', '音量-', '邮件', '主页', '搜索', '刷新', '收藏夹', '网页停止', '网页前进', '网页后退', '计算器', '我的电脑']
const KeyBoardKeyItem = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '!1', '@2', '#3', '$4', '%5', '^6', '&7', '*8', '(9', ')0', 'K', 'L', 'Z']
const FKeyBoardKeyItem = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']
const NumPadKeyBoardKeyItem = ['/', '*', '-', '+', 'enter', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.']
const ControlKeyBoardKeyItem = ['~`', '_-', '+=', '{[', ']}', ':;', '”’', '<,', '>.', '?/'
  , 'Esc', 'Tab', 'Back Space', 'Enter', 'Space', 'Left Win', 'Right Win'
  , 'Left Ctrl', 'Right Ctrl', 'Left Alt', 'Right Alt', 'Left Shift', 'Right Shift', 'Up'
  , 'Left', 'Down', 'Right', 'Print Screen', 'Scroll Lock', 'Pause', 'Insert'
  , 'Home', 'Delete', 'End', 'Page Up', 'Page Down', 'Caps Lock', 'Num Lock']

// 当前选中的按钮
// 如果 selectedButton 已经在其他地方声明，请删除此处的重复声明
// const selectedButton = ref('');
// 处理按钮点击事件
const handleButtonClick = (button: string) => {
  // 设置当前选中的按钮
  if (selectedButton.value === button) {
    isShowButtonMenu.value = false;
    selectedButton.value = '';
  } else {
    if (button === '左键' && leftDialogVisible.value === false) {
      leftDialogVisible.value = true
      return
    }
    selectedButton.value = button;
    isShowButtonMenu.value = true;
  }
};


</script>
<template>
  <div>
    <el-row class="flex flex-row justify-center">
      <el-col :span="6" v-if="isShowButtonMenu">
        <h5 class="mb-2">分配功能键</h5>
        <el-menu
            class="el-menu-vertical-demo"
            @open=""
            @close=""
        >
          <el-sub-menu index="0">
            <template #title>
              <el-icon>
                <location/>
              </el-icon>
              <span>系统按键</span>
            </template>
            <el-menu-item-group title="鼠标按键">
              <el-menu-item v-for="(keyItem,index) in MouseKeyItem" :index="index"><span>{{ keyItem }}</span>
              </el-menu-item>
            </el-menu-item-group>
          </el-sub-menu>

          <el-sub-menu index="1">
            <template #title>
              <el-icon>
                <location/>
              </el-icon>
              <span>键盘按键</span>
            </template>
          </el-sub-menu>
          <el-sub-menu index="2">
            <template #title>
              <el-icon>
                <location/>
              </el-icon>
              <span>特殊按键</span>
            </template>
          </el-sub-menu>
          <el-sub-menu index="3">
            <template #title>
              <el-icon>
                <location/>
              </el-icon>
              <span>宏设置</span>
            </template>
          </el-sub-menu>
        </el-menu>
      </el-col>

      <el-col :span="12">
        <CardContainer>
          <CardBody
              class="group/card relative size-auto rounded-xl border border-black/[0.1] bg-gray-50 p-6 sm:w-[19rem] dark:border-white/[0.2] dark:bg-black dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1]"
          >
            <CardItem
                :translate-z="50"
                class="text-xl font-bold text-neutral-600 dark:text-white"
            >
              选中需要设置的按键
            </CardItem>

            <CardItem
                :translate-z="100"
                class="mt-4 w-full"
            >
              <div class="relative">
                <img
                    :src="imgMouse"
                    class="w-full rounded-xl object-fill group-hover/card:shadow-xl"
                    alt="thumbnail"
                />

                <el-button
                    class="absolute top-button-right   px-4 py-2 rounded-md"
                    @click="handleButtonClick('右键')"
                    :type="selectedButton === '右键' ? 'warning' : 'primary'"
                    :plain="selectedButton!=='右键'"
                >
                  右键
                </el-button>
                <el-button
                    class="absolute top-button-mid left-1/2  px-4 py-2 rounded-md"
                    @click="handleButtonClick('中键')"
                    :type="selectedButton === '中键' ? 'warning' : 'primary'"
                    :plain="selectedButton!=='中键'"
                >
                  中键
                </el-button>
                <el-button
                    :type="selectedButton === '左键' ? 'warning' : 'primary'"
                    class="absolute top-button-left  px-4 py-2 rounded-md"
                    @click="handleButtonClick('左键')"
                    :plain="selectedButton!=='左键'"
                >
                  左键
                </el-button>

                <el-button
                    class="absolute top-button-next   px-4 py-2 rounded-md"
                    @click="handleButtonClick('前进键')"
                    :type="selectedButton === '前进键' ? 'warning' : 'primary'"
                    :plain="selectedButton!=='前进键'"
                >
                  前进键
                </el-button>

                <el-button
                    class="absolute top-button-back   px-4 py-2 rounded-md"
                    @click="handleButtonClick('后退键')"
                    :type="selectedButton === '后退键' ? 'warning' : 'primary'"
                    :plain="selectedButton!=='后退键'"
                >
                  后退键
                </el-button>
              </div>
            </CardItem>

          </CardBody>
        </CardContainer>
      </el-col>
    </el-row>
  </div>

  <el-dialog
      v-model="leftDialogVisible"
      title="提示"
      width="30%"
      align-center
  >
    <span>当前只有一个左键改了后可能无法点击</span>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="leftDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleButtonClick('左键'); leftDialogVisible = false">
          我就要改
        </el-button>
      </span>
    </template>
  </el-dialog>

</template>
<style lang="scss" scoped>
.top-button-right {
  top: 15%;
  right: 12%;
}

.top-button-left {
  top: 15%;
  left: 12%;
}

.top-button-mid {
  top: 0%;
  transform: translateX(-65%);
}

.top-button-next {
  top: 38%;
  transform: translateX(-30%);
}

.top-button-back {
  top: 50%;
  transform: translateX(-30%);
}
</style>