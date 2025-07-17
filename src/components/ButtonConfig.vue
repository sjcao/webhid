<script setup lang="ts">
import {onMounted, ref} from 'vue';

import {CardBody, CardContainer, CardItem} from "@/components/ui/card-3d";
import MacroRecorder from "@/components/MacroRecorder.vue";
import {
  KeyActionType,
  KeyType,
  loadActionsListFromLocalStorage,
  LooperType,
  saveActionsListToLocalStorage,
  SaveMacroAction,
  calculateTime
} from "@/components/macro.ts";
import {ButtonID, KeyFunctionType, MouseCommandBuilder, ParamType, ResponseParser} from "@/components/command.ts";
import {
  AllKeyBoardKeyEventKey,
  ConsumerKeyItem,
  ControlKeyBoardKeyItem,
  DPIKeyItem,
  FKeyBoardKeyItem,
  KeyBoardKeyItem,
  MouseKeyItem,
  NumPadKeyBoardKeyItem,
  ProfileKeyItem,
  ScrollKeyItem
} from "@/components/hidcode.ts";
import {sendDataToDevice, useHIDListener} from "@/components/webhid.ts";
import {ElMessage} from "element-plus";
import {useDark} from "@vueuse/core";
import {useI18n} from "vue-i18n";

const props = defineProps<{
  hard?: boolean; // should it interact with hardware or just dummy
  activeProfile: number;
  currentDevice?: HIDDevice;
}>();

const isDark = useDark({});
const localeI18n = useI18n();

const imgMouse = new URL(`/ic-moouse.png`, import.meta.url).href


const isShowButtonMenu = ref(false)
const selectedButton = ref('');
const leftDialogVisible = ref(false);


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

    //读取当前选择的键的配置
    let selectKey: ButtonID = getButtonID(selectedButton.value)
    const cmd = MouseCommandBuilder.readButtonConfig(selectKey)
    sendDataToDevice(cmd)
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

const getOrderValue = (): number[] => {
  let value:number[] = []
  for (let selectedOrderKey in selectedOrder.value) {
    const index = combinaKey.indexOf(selectedOrderKey)
    switch (index) {
      case 0:
        value.push(0xE0)
        break
      case 1:
        value.push(0xE1)

        break
      case 2:
        value.push(0xE2)

        break
      case 3:
        value.push(0xE3)
        break
    }
  }
  const combination = AllKeyBoardKeyEventKey.find(item => item.systemName === combineSelectKey.value)
  if (combination) {
    value.push(...combination.value)
  }
  return value
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
const elDrawerMacro = ref<any>(null);
const handleMacroBack = () => {
  if (elDrawerMacro.value) {
    elDrawerMacro.value.handleClose(); // 调用 close 方法关闭抽屉
  }
  macroList.value = loadActionsListFromLocalStorage()
};

const macroList = ref<SaveMacroAction[]>([])
const currentMacroIndex = ref(-1)
const handleDeletMacro = (index: number) => {
  macroList.value.splice(index, 1);
  saveActionsListToLocalStorage(macroList.value)
};

const handleSetMacro = (index: number) => {
  const macro: SaveMacroAction = macroList.value.at(index)
  currentMacroIndex.value = index

  if (selectedButton.value === '') return
  let selectKey: ButtonID = getButtonID(selectedButton.value)


  let looperType = macro.looperType
  if (looperType === LooperType.MACRO_RECORD_LOOP) {
    looperType = macro.looperTimes
  }


  for (let i = 0; i < macro.actions.length; i++) {
    const macroAction = macro.actions[i]
    let type = 0
    let action = macroAction.action
    let keyType = macroAction.type
    let keyValue = macroAction.keyCode
    if (action === KeyActionType.UP) {
      type = 0
      keyValue = [0x00]
    } else {
      if (keyType === KeyType.MOUSE) {
        type = 1
      } else {
        type = 2
      }
    }
    const times = calculateTime(i, macro.actions)
    const cmd = MouseCommandBuilder.setButtonMacro(selectKey, index, looperType, type, times, keyValue);

    sendDataToDevice(cmd)

  }

  ElMessage({
    message: localeI18n.t('message_setting_success'),
    type: 'success',
  })
};


const activeSystem = ref('');
const activeKeyBoard = ref('');
const activeTags = ref('系统按键');


const handleData = (data: Uint8Array) => {
  const [type, result] = ResponseParser.parse(Array.from(data))
  if (type === ParamType.BUTTON) {
    activeSystem.value = ''
    activeKeyBoard.value = ''
    activeTags.value = '系统按键'
    switch (result.functionType) {
      case KeyFunctionType.MOUSE:
        // 鼠标功能相关处理
        activeTags.value = '系统按键'
        activeSystem.value = '0' + result.index
        break;
      case KeyFunctionType.PROFILE_CHANGE:
        // 配置切换功能相关处理
        activeTags.value = '系统按键'

        activeSystem.value = '1' + result.index
        break;
      case KeyFunctionType.DPI_ACTION:
        // DPI 功能相关处理
        activeTags.value = '系统按键'

        activeSystem.value = '2' + result.index
        break;
      case KeyFunctionType.WHEEL:
        // 滚轮功能相关处理
        activeTags.value = '系统按键'

        activeSystem.value = '3' + result.index
        break;
      case KeyFunctionType.MULTIMEDIA:
        // 多媒体功能相关处理
        activeTags.value = '系统按键'

        activeSystem.value = '4' + result.index
        break;
      case KeyFunctionType.ALPHANUMERIC:
        // 字母数字键功能相关处理
        activeTags.value = '键盘按键'

        activeKeyBoard.value = '0' + result.index
        break;
      case KeyFunctionType.FUNCTION_KEY:
        // 功能键相关处理
        activeTags.value = '键盘按键'

        activeKeyBoard.value = '1' + result.index
        break;
      case KeyFunctionType.NUMPAD:
        // 数字小键盘功能相关处理
        activeTags.value = '键盘按键'
        activeKeyBoard.value = '2' + result.index
        break;
      case KeyFunctionType.CONTROL_KEY:
        // 控制键功能相关处理
        activeTags.value = '键盘按键'
        activeKeyBoard.value = '3' + result.index
        break;
      case KeyFunctionType.BURST_FIRE:
        // 连发功能相关处理
        activeTags.value = '特殊按键'
        const value = result.value
        const diff = value[0]
        const times = value[1]
        hybetweenTime.value = diff
        hyTimes.value = times
        break;
      case KeyFunctionType.COMBO_KEY:
        // 组合键功能相关处理
        activeTags.value = '特殊按键'

        break;
      case KeyFunctionType.MACRO:
        // 宏功能相关处理
        activeTags.value = '宏设置'
        currentMacroIndex.value = result.value[0]
        break;
      default:
        // 默认处理逻辑
        break;
    }


  }
}
useHIDListener(handleData);

// 生命周期钩子
onMounted(() => {
  macroList.value = loadActionsListFromLocalStorage()

})

const getButtonID = (key): ButtonID => {
  let selectKey: ButtonID
  switch (key) {
    case '左键':
      selectKey = ButtonID.LEFT;
      break;
    case '右键':
      selectKey = ButtonID.RIGHT;
      break;
    case '中键':
      selectKey = ButtonID.MIDDLE;
      break;
    case '前进键':
      selectKey = ButtonID.FORWARD;
      break;
    case '后退键':
      selectKey = ButtonID.BACKWARD;
      break;
  }
  return selectKey
}


const handleOnMenuClick = (keyItem: any, type: string, index: number) => {
  if (selectedButton.value === '') return
  let selectKey: ButtonID = getButtonID(selectedButton.value)

  let keytype: KeyFunctionType = KeyFunctionType.MOUSE
  //发送修改到
  switch (type) {
    case '鼠标按键':
      keytype = KeyFunctionType.MOUSE
      break;
    case '板载配置':
      keytype = KeyFunctionType.PROFILE_CHANGE

      break;

    case 'DPI切换':
      keytype = KeyFunctionType.DPI_ACTION

      // 在这里添加处理DPI切换的逻辑
      break;
    case '鼠标滚轮':
      keytype = KeyFunctionType.WHEEL

      break;
    case '多媒体':
      keytype = KeyFunctionType.MULTIMEDIA

      break;
    case '字母和数字键':
      keytype = KeyFunctionType.ALPHANUMERIC

      break;
    case 'F区功能键':
      keytype = KeyFunctionType.FUNCTION_KEY
      break;
    case '数字小键盘键':
      keytype = KeyFunctionType.NUMPAD

      break;
    case '控制键与字符键':
      keytype = KeyFunctionType.CONTROL_KEY
      break;
    case '火力键':
      keytype = KeyFunctionType.BURST_FIRE
      break;
    case '组合键':
      keytype = KeyFunctionType.COMBO_KEY
      break;
    default:
      console.warn(`未知的类型: ${type}`);
      break;
  }


  const cmd = MouseCommandBuilder.setButtonMapping(
      selectKey,
      keytype,
      index, // 播放器
      keyItem.value
  );

  sendDataToDevice(cmd)

  ElMessage({
    message: localeI18n.t('message_setting_success'),
    type: 'success',
  })
}
</script>
<template>
  <div>
    <el-row class="flex flex-row justify-center">
      <transition name="el-zoom-in-top">
        <el-col :span="11" v-if="isShowButtonMenu" class="max-h-screen">
          <div class="flex justify-between mb-1">
            <h5 class="mb-2">{{ $t('keySetting_keyMenu_title') }}
            </h5>
            <el-button :type="isDark?'':'primary'" plain class="" @click="isShowButtonMenu=false;selectedButton=''">→
            </el-button>
          </div>
          <!--        <div class="mb-2">-->
          <!--          <el-text>当前分配:{{}}</el-text>-->
          <!--        </div>-->
          <el-tabs :type="isDark?'card':'border-card'" class="dark:bg-zinc-900 dark:text-white"
                   :model-value="activeTags">
            <el-tab-pane name="系统按键" class="dark:bg-zinc-900">
              <template #label>
                <span class="dark:text-white">{{ $t('keySetting_keyMenu_system_button') }}</span>
              </template>
              <el-menu
                  class="el-menu-vertical-demo menu-height overflow-y-auto dark:bg-zinc-900"
                  :unique-opened="true"
                  :default-active="activeSystem"
                  :text-color="isDark?'#FFF':''"
                  :background-color="isDark?'#18181B':''"
                  @open=""
                  @close=""
              >
                <el-menu-item-group>
                  <el-sub-menu index="0">
                    <template #title>
                      <span class="font-bold dark:text-white">{{ $t('keySetting_keyMenu_system_mouse') }}</span>
                    </template>
                    <el-menu-item v-for="(keyItem,index) in MouseKeyItem" :index="'0'+index"
                                  @click="handleOnMenuClick(keyItem,'鼠标按键',index)">
                      <span>{{ localeI18n.locale.value === 'zh-cn' ? keyItem.keyName : keyItem.keyNameEn }}</span>
                    </el-menu-item>
                  </el-sub-menu>

                  <el-sub-menu index="1">
                    <template #title>
                      <span class="font-bold dark:text-white">{{ $t('keySetting_keyMenu_system_profile') }}</span>
                    </template>
                    <el-menu-item v-for="(keyItem,index) in ProfileKeyItem" :index="'1'+index"
                                  @click="handleOnMenuClick(keyItem,'板载配置',index)">
                      <span>{{ localeI18n.locale.value === 'zh-cn' ? keyItem.keyName : keyItem.keyNameEn }}</span>
                    </el-menu-item>
                  </el-sub-menu>

                  <el-sub-menu index="2">
                    <template #title>
                      <span class="font-bold dark:text-white">{{ $t('keySetting_keyMenu_system_dpi') }}</span>
                    </template>
                    <el-menu-item v-for="(keyItem,index) in DPIKeyItem" :index="'2'+index"
                                  @click="handleOnMenuClick(keyItem,'DPI切换',index)">
                      <span>{{ localeI18n.locale.value === 'zh-cn' ? keyItem.keyName : keyItem.keyNameEn }}</span>
                    </el-menu-item>
                  </el-sub-menu>

                  <el-sub-menu index="3">
                    <template #title>
                      <span class="font-bold dark:text-white">{{ $t('keySetting_keyMenu_system_scroll') }}</span>
                    </template>
                    <el-menu-item v-for="(keyItem,index) in ScrollKeyItem" :index="'3'+index"
                                  @click="handleOnMenuClick(keyItem,'鼠标滚轮',index)">
                      <span>{{ localeI18n.locale.value === 'zh-cn' ? keyItem.keyName : keyItem.keyNameEn }}</span>
                    </el-menu-item>
                  </el-sub-menu>

                  <el-sub-menu index="4">
                    <template #title>
                      <span class="font-bold dark:text-white">{{ $t('keySetting_keyMenu_system_media') }}</span>
                    </template>
                    <el-menu-item v-for="(keyItem,index) in ConsumerKeyItem" :index="'4'+index"
                                  @click="handleOnMenuClick(keyItem,'多媒体',index)">
                      <span>{{ localeI18n.locale.value === 'zh-cn' ? keyItem.keyName : keyItem.keyNameEn }}</span>
                    </el-menu-item>
                  </el-sub-menu>

                </el-menu-item-group>
              </el-menu>
            </el-tab-pane>
            <el-tab-pane name="键盘按键">
              <template #label>
                <span class="dark:text-white">{{ $t('keySetting_keyMenu_keyboard_button') }}</span>
              </template>
              <el-menu
                  class="el-menu-vertical-demo menu-height overflow-y-auto"
                  :unique-opened="true"
                  :default-active="activeKeyBoard"
                  @open=""
                  @close=""
                  :text-color="isDark?'#FFF':''"
                  :background-color="isDark?'#18181B':''"
              >
                <el-menu-item-group>
                  <el-sub-menu index="0">
                    <template #title>
                      <span class="font-bold">{{ $t('keySetting_keyMenu_keyboard_a_n') }}</span>
                    </template>
                    <el-menu-item v-for="(keyItem,index) in KeyBoardKeyItem" :index="'0'+index"
                                  @click="handleOnMenuClick(keyItem,'字母和数字键',index)"><span>{{
                        keyItem.keyName
                      }}</span>
                    </el-menu-item>
                  </el-sub-menu>

                  <el-sub-menu index="1">
                    <template #title>
                      <span class="font-bold">{{ $t('keySetting_keyMenu_keyboard_f') }}</span>
                    </template>
                    <el-menu-item v-for="(keyItem,index) in FKeyBoardKeyItem" :index="'1'+index"
                                  @click="handleOnMenuClick(keyItem,'F区功能键',index)"><span>{{
                        keyItem.keyName
                      }}</span>
                    </el-menu-item>
                  </el-sub-menu>

                  <el-sub-menu index="2">
                    <template #title>
                      <span class="font-bold">{{ $t('keySetting_keyMenu_keyboard_numpad') }}</span>
                    </template>
                    <el-menu-item v-for="(keyItem,index) in NumPadKeyBoardKeyItem" :index="'2'+index"
                                  @click="handleOnMenuClick(keyItem,'数字小键盘键',index)"><span>{{
                        keyItem.keyName
                      }}</span>
                    </el-menu-item>
                  </el-sub-menu>

                  <el-sub-menu index="3">
                    <template #title>
                      <span class="font-bold">{{ $t('keySetting_keyMenu_keyboard_control') }}</span>
                    </template>
                    <el-menu-item v-for="(keyItem,index) in ControlKeyBoardKeyItem" :index="'3'+index"
                                  @click="handleOnMenuClick(keyItem,'控制键与字符键',index)"><span>{{
                        keyItem.keyName
                      }}</span>
                    </el-menu-item>
                  </el-sub-menu>

                </el-menu-item-group>
              </el-menu>
            </el-tab-pane>
            <el-tab-pane name="特殊按键" class="max-h-fit overflow-y-auto">
              <template #label>
                <span class="dark:text-white">{{ $t('keySetting_keyMenu_special_button') }}</span>
              </template>
              <el-card class="box-card dark:bg-zinc-900 dark:text-white">
                <template #header>
                  <div class="card-header dark:text-white">
                    <span>{{ $t('keySetting_tabs_special_fireKey') }}</span>
                  </div>
                </template>
                <div class="flex flex-col justify-center items-center gap-2 ">
                  <div>
                    <el-text class="dark:text-white">{{ $t('keySetting_tabs_special_fireKey_h1') }}</el-text>
                  </div>
                  <div>
                    <div>
                      <el-text class="dark:text-white">{{ $t('keySetting_tabs_special_fireKey_click_delay') }}</el-text>
                      <el-input-number class="dark:text-white" size="default" v-model="hybetweenTime"
                                       :min="0"></el-input-number>
                      <el-text class="dark:text-white">ms</el-text>
                    </div>
                    <div class="mt-2">
                      <el-text class="dark:text-white">{{ $t('keySetting_tabs_special_fireKey_click_times') }}</el-text>
                      <el-input-number class="dark:text-white" size="default" v-model="hyTimes"
                                       :min="0"></el-input-number>
                      <el-text class="dark:text-white">{{ $t('unit_times') }}</el-text>
                    </div>
                  </div>
                  <div>
                    <el-text type="warning">{{ $t('keySetting_tabs_special_fireKey_h2') }}</el-text>
                  </div>
                  <div>
                    <el-button type="primary" plain
                               @click="handleOnMenuClick({value:[hybetweenTime,hyTimes]},'火力键',0)">
                      {{ $t('bt_save_select') }}
                    </el-button>
                  </div>
                </div>
              </el-card>

              <el-card class="box-card mt-2  dark:bg-zinc-900 dark:text-white">
                <template #header>
                  <div class="card-header">
                    <span>{{ $t('keySetting_tabs_special_combine') }}</span>
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
                    <el-text class="dark:text-white">+</el-text>
                    <el-input class="1" ref="inputRef" :placeholder="$t('input_key_hint')" v-model="combineSelectKey"
                              @keydown="handleKeydown" @mouseenter="handleMouseEnter"
                              @mouseleave="handleMouseLeave"
                              readonly></el-input>
                  </div>
                  <div>
                    <el-button type="primary" plain @click="handleOnMenuClick({value:getOrderValue()},'组合键',0)">
                      {{ $t('bt_save_select') }}
                    </el-button>
                    <el-button type="text" plain @click="combineSelectKey=''">{{ $t('bt_clear') }}</el-button>
                  </div>
                </div>
              </el-card>
            </el-tab-pane>
            <el-tab-pane name="宏设置" class="menu-height overflow-y-auto dark:bg-zinc-900">
              <template #label>
                <span class="dark:text-white">{{ $t('keySetting_keyMenu_macro_button') }}</span>
              </template>
              <el-card class="box-card dark:bg-zinc-900">
                <template #header>
                  <div class="card-header flex justify-between">
                    <span class="dark:text-white">{{ $t('macro_list') }}:</span>
                    <!--                  <span>当前设置编号{{ currentMacroIndex + 1 }}</span>-->
                    <el-button type="success" size="default" @click="isShowMacro=true">{{
                        $t('bt_create_macro')
                      }}
                    </el-button>
                  </div>
                </template>
                <el-empty :image-size="100" v-if="macroList.length===0"/>
                <div class="flex justify-between dark:text-white mt-2" v-if="macroList.length > 0 "
                     v-for="(item,index) in macroList">
                  {{ $t('item_macro') + (index + 1) }}
                  <div>
                    <el-checkbox v-if="currentMacroIndex === index" :checked="true" :label="$t('status_opened')"
                                 size="large"/>
                    <el-button type="primary" @click="handleSetMacro(index)" class="ml-2">{{
                        $t('bt_open')
                      }}
                    </el-button>
                    <el-button type="danger" @click="handleDeletMacro(index)">{{ $t('bt_del') }}</el-button>
                  </div>
                </div>
              </el-card>
            </el-tab-pane>
          </el-tabs>
        </el-col>
      </transition>


      <el-col :span="12">
        <CardContainer>
          <CardBody
              class="group/card relative size-auto rounded-xl border border-black/[0.1] bg-gray-50 p-6 sm:w-[19rem] dark:border-white/[0.2] dark:bg-zinc-900 dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1]"
          >
            <CardItem
                :translate-z="50"
                class="text-xl font-bold text-neutral-600 dark:text-white"
            >
              {{ $t('keySetting_selectKey_tip') }}
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
                    :type="selectedButton === '右键' ? 'warning' : isDark?'':'primary'"
                    :plain="selectedButton!=='右键'"
                >
                  {{ $t('mouseKey_right') }}
                </el-button>
                <el-button
                    class="absolute top-button-mid left-1/2  px-4 py-2 rounded-md"
                    @click="handleButtonClick('中键')"
                    :type="selectedButton === '中键' ? 'warning' : isDark?'': 'primary'"
                    :plain="selectedButton!=='中键'"
                >
                  {{ $t('mouseKey_mid') }}
                </el-button>
                <el-button
                    :type="selectedButton === '左键' ? 'warning' : isDark?'': 'primary'"
                    class="absolute top-button-left  px-4 py-2 rounded-md"
                    @click="handleButtonClick('左键')"
                    :plain="selectedButton!=='左键'"
                >
                  {{ $t('mouseKey_left') }}
                </el-button>

                <el-button
                    class="absolute top-button-next   px-4 py-2 rounded-md"
                    @click="handleButtonClick('前进键')"
                    :type="selectedButton === '前进键' ? 'warning': isDark?'' : 'primary'"
                    :plain="selectedButton!=='前进键'"
                >
                  {{ $t('mouseKey_forward') }}
                </el-button>

                <el-button
                    class="absolute top-button-back   px-4 py-2 rounded-md"
                    @click="handleButtonClick('后退键')"
                    :type="selectedButton === '后退键' ? 'warning' : isDark?'': 'primary'"
                    :plain="selectedButton!=='后退键'"
                >
                  {{ $t('mouseKey_back') }}
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
      class="dark:bg-zinc-900 dark:text-warning"
  >
    <span class="dark:text-warning">当前只有一个左键改了后可能无法点击</span>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="leftDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleButtonClick('左键'); leftDialogVisible = false">
          我就要改
        </el-button>
      </span>
    </template>
  </el-dialog>

  <el-drawer ref="elDrawerMacro" v-model="isShowMacro" :show-close="false" class="demo-drawer dark:bg-zinc-900"
             :size="'96%'"
             :lock-scroll="true" :destroy-on-close="true"
             :close-on-click-modal="false" :close-on-press-escape="false" :with-header="false">
    <div class="demo-drawer__content">
      <MacroRecorder class="macro-record" @onClose="handleMacroBack" @contextmenu.prevent/>
    </div>
    <!--    <div class="demo-drawer__footer">-->

    <!--    </div>-->
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

.menu-height {
  max-height: 460px;
}
</style>