<script setup lang="ts">
import {computed, ref} from 'vue';

import {CardBody, CardContainer, CardItem} from "@/components/ui/card-3d";
import router from "@/router.ts";
import MacroRecorder from "@/components/MacroRecorder.vue";

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
    combineSelectKey.value = '';
    selectedButton.value = button;
    isShowButtonMenu.value = true;
  }
};

const hybetweenTime = ref(3)
const hyTimes = ref(1)
const combinationCheckboxGroup = ref([''])
const combinaKey = ['Ctrl', 'Shift', 'Alt', 'Win']

// 当前选中的值
const selectedValues = ref<string[]>([]);
// 选中的顺序
const selectedOrder = ref<string[]>([]);
// 获取某个选项的顺序
const getOrder = (value: string): string | null => {
  const index = selectedOrder.value.indexOf(value);
  return index !== -1 ? `${index + 1}` : null;
};
// 处理复选框变化
const handleCheckboxChange = (values: string[]) => {
  // 找出新增的值
  const addedValues = values.filter((value) => !selectedOrder.value.includes(value));

  // 找出移除的值
  const removedValues = selectedOrder.value.filter((value) => !values.includes(value));

  // 更新选中顺序
  if (removedValues.length > 0) {
    // 移除取消选中的值
    selectedOrder.value = selectedOrder.value.filter((value) => !removedValues.includes(value));
  }
  if (addedValues.length > 0) {
    // 将新增的值添加到顺序数组末尾
    selectedOrder.value.push(...addedValues);
  }
};
// 绑定输入框的值
const inputRef = ref<any>(null);
const combineSelectKey = ref<string>('');
// 处理键盘按下事件
const handleKeydown = (event: KeyboardEvent) => {
  // 阻止默认行为（如输入多个字符）
  event.preventDefault();

  // 获取按下的键值
  const key = event.key;
  combineSelectKey.value = key;
};

// 处理鼠标进入事件
const handleMouseEnter = () => {
  if (inputRef.value) {
    // 调用 focus 方法让输入框获取焦点
    inputRef.value.focus();
  }
};

// 处理鼠标离开事件
const handleMouseLeave = () => {
  if (inputRef.value) {
    // 调用 blur 方法让输入框失去焦点
    inputRef.value.blur();
  }
};

const isShowMacro = ref(false)

</script>
<template>
  <div>
    <el-row class="flex flex-row justify-center">
      <el-col :span="11" v-if="isShowButtonMenu">
        <div class="flex justify-between mb-1">
          <h5 class="mb-2">分配功能键
          </h5>
          <el-button type="primary" plain class="" @click="isShowButtonMenu=false;selectedButton=''">→</el-button>
        </div>
        <el-tabs type="border-card">
          <el-tab-pane label="系统按键">
            <el-menu
                class="el-menu-vertical-demo"
                :unique-opened="true"
                @open=""
                @close=""
            >
              <el-menu-item-group>
                <el-sub-menu index="0">
                  <template #title>
                    <span class="font-bold">鼠标按键</span>
                  </template>
                  <el-menu-item v-for="(keyItem,index) in MouseKeyItem" :index="'0'+index"><span>{{ keyItem }}</span>
                  </el-menu-item>
                </el-sub-menu>

                <el-sub-menu index="1">
                  <template #title>
                    <span class="font-bold">板载配置</span>
                  </template>
                  <el-menu-item v-for="(keyItem,index) in ProfileKeyItem" :index="'1'+index"><span>{{ keyItem }}</span>
                  </el-menu-item>
                </el-sub-menu>

                <el-sub-menu index="2">
                  <template #title>
                    <span class="font-bold">DPI切换</span>
                  </template>
                  <el-menu-item v-for="(keyItem,index) in DPIKeyItem" :index="'2'+index"><span>{{ keyItem }}</span>
                  </el-menu-item>
                </el-sub-menu>

                <el-sub-menu index="3">
                  <template #title>
                    <span class="font-bold">鼠标滚轮</span>
                  </template>
                  <el-menu-item v-for="(keyItem,index) in ScrollKeyItem" :index="'3'+index"><span>{{ keyItem }}</span>
                  </el-menu-item>
                </el-sub-menu>

                <el-sub-menu index="4">
                  <template #title>
                    <span class="font-bold">多媒体</span>
                  </template>
                  <el-menu-item v-for="(keyItem,index) in ConsumerKeyItem" :index="'4'+index"><span>{{ keyItem }}</span>
                  </el-menu-item>
                </el-sub-menu>

              </el-menu-item-group>
            </el-menu>
          </el-tab-pane>
          <el-tab-pane label="键盘按键">
            <el-menu
                class="el-menu-vertical-demo"
                :unique-opened="true"
                @open=""
                @close=""
            >
              <el-menu-item-group>
                <el-sub-menu index="0">
                  <template #title>
                    <span class="font-bold">字母和数字键</span>
                  </template>
                  <el-menu-item v-for="(keyItem,index) in KeyBoardKeyItem" :index="'0'+index"><span>{{ keyItem }}</span>
                  </el-menu-item>
                </el-sub-menu>

                <el-sub-menu index="1">
                  <template #title>
                    <span class="font-bold">F区功能键</span>
                  </template>
                  <el-menu-item v-for="(keyItem,index) in FKeyBoardKeyItem" :index="'1'+index"><span>{{
                      keyItem
                    }}</span>
                  </el-menu-item>
                </el-sub-menu>

                <el-sub-menu index="2">
                  <template #title>
                    <span class="font-bold">数字小键盘键</span>
                  </template>
                  <el-menu-item v-for="(keyItem,index) in NumPadKeyBoardKeyItem" :index="'2'+index"><span>{{
                      keyItem
                    }}</span>
                  </el-menu-item>
                </el-sub-menu>

                <el-sub-menu index="3">
                  <template #title>
                    <span class="font-bold">控制键与字符键</span>
                  </template>
                  <el-menu-item v-for="(keyItem,index) in ControlKeyBoardKeyItem" :index="'3'+index"><span>{{
                      keyItem
                    }}</span>
                  </el-menu-item>
                </el-sub-menu>

                <el-sub-menu index="4">
                  <template #title>
                    <span class="font-bold">多媒体</span>
                  </template>
                  <el-menu-item v-for="(keyItem,index) in ConsumerKeyItem" :index="'4'+index"><span>{{ keyItem }}</span>
                  </el-menu-item>
                </el-sub-menu>

              </el-menu-item-group>
            </el-menu>
          </el-tab-pane>
          <el-tab-pane label="特殊按键">
            <el-card class="box-card">
              <template #header>
                <div class="card-header">
                  <span>火力键</span>
                </div>
              </template>
              <div class="flex flex-col justify-center items-center gap-2">
                <div>
                  <el-text>根据设置的间隔和次数持续点击左键</el-text>
                </div>
                <div>
                  <div>
                    <el-text>点击间隔:</el-text>
                    <el-input-number size="default" v-model="hybetweenTime" :min="0"></el-input-number>
                    <el-text>ms</el-text>
                  </div>
                  <div class="mt-2">
                    <el-text>点击次数:</el-text>
                    <el-input-number size="default" v-model="hyTimes" :min="0"></el-input-number>
                    <el-text>次</el-text>
                  </div>
                </div>
                <div>
                  <el-text type="warning">点击次数为0时，按下按键一直发，松开按键结束</el-text>
                </div>
                <div>
                  <el-button type="primary" plain>保存并选择</el-button>
                </div>
              </div>
            </el-card>

            <el-card class="box-card mt-2">
              <template #header>
                <div class="card-header">
                  <span>组合键</span>
                </div>
              </template>

              <div class="flex flex-col justify-center items-center gap-2">
                <div class="flex flex-col gap-1">
                  <el-checkbox-group v-model="selectedValues" @change="handleCheckboxChange" size="large">
                    <el-checkbox-button v-for="(item,index) in combinaKey" :key="item" :label="item">
                      {{ item }}
                      <el-tag class="h-3.5" v-if="getOrder(item)">{{ getOrder(item) }}
                      </el-tag>
                    </el-checkbox-button>
                  </el-checkbox-group>
                  <el-text>+</el-text>
                  <el-input class="1" ref="inputRef" placeholder="请输入键盘按键" v-model="combineSelectKey"
                            @keydown="handleKeydown" @mouseenter="handleMouseEnter"
                            @mouseleave="handleMouseLeave"
                            readonly></el-input>
                </div>
                <div>
                  <el-button type="primary" plain>保存并选择</el-button>
                  <el-button type="text" plain @click="combineSelectKey=''">清除</el-button>
                </div>
              </div>
            </el-card>
          </el-tab-pane>
          <el-tab-pane label="宏设置">
            <el-card class="box-card">
              <template #header>
                <div class="card-header flex justify-between">
                  <span>宏列表</span>
                  <el-button type="success" size="default" @click="isShowMacro=true">新建宏</el-button>
                </div>
              </template>
              <el-empty :image-size="100"/>
            </el-card>
          </el-tab-pane>
        </el-tabs>
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

  <el-drawer v-model="isShowMacro" :show-close="false" class="demo-drawer" :size="'96%'">
    <template #header="{ close, titleId, titleClass }">
      <h4 :id="titleId" :class="titleClass">This is a custom header!</h4>
      <el-button type="danger" @click="close">
        <el-icon class="el-icon--left">
          <CircleCloseFilled/>
        </el-icon>
        Close
      </el-button>
    </template>
    <div class="demo-drawer__content">
    <MacroRecorder class="macro-record"/>
    </div>
    <div class="demo-drawer__footer">

    </div>
  </el-drawer>


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

.macro-record {
  width: 100%;
  min-height: 100%;
  height: 100%;
}
</style>