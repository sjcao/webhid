<script setup lang="ts">
import {onMounted, ref} from 'vue';

import {CardBody, CardContainer, CardItem} from "@/components/ui/card-3d";
import MacroRecorder from "@/components/MacroRecorder.vue";
import {
  calculateTime,
  KeyActionType,
  KeyType,
  loadActionsListFromLocalStorage,
  LooperType,
  saveActionsListToLocalStorage,
  SaveMacroAction
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

import {useI18n} from "vue-i18n";
import { Check, Delete, Back, Close, Pointer } from '@element-plus/icons-vue';

const props = defineProps<{
  hard?: boolean; // should it interact with hardware or just dummy
  activeProfile: number;
  currentDevice?: HIDDevice;
}>();


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
  const macro: SaveMacroAction = macroList.value[index]
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

const getButtonID = (key: string): ButtonID => {
  let selectKey: ButtonID = ButtonID.FORWARD
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
  <div class="flex flex-col xl:flex-row gap-8 w-full h-full overflow-hidden p-1">
    
    <!-- Left Column: Menu / Settings -->
    <div class="w-full xl:w-5/12 flex flex-col gap-6 overflow-hidden">
       <transition name="el-zoom-in-top" mode="out-in">
          <div v-if="isShowButtonMenu" class="h-full flex flex-col glass-card rounded-xl border border-white/5 overflow-hidden">
             <!-- Menu Header -->
             <div class="flex items-center justify-between p-4 border-b border-white/5 bg-black/5 dark:bg-black/20">
                <h3 class="text-lg font-semibold flex items-center gap-2">
                   <span class="w-1 h-5 bg-primary rounded-full"></span>
                   {{ $t('keySetting_keyMenu_title') }}
                </h3>
                <button 
                   class="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                   @click="isShowButtonMenu=false;selectedButton=''"
                >
                   <el-icon><Back /></el-icon>
                </button>
             </div>

             <!-- Tabs -->
             <div class="flex-1 overflow-hidden flex flex-col">
                <el-tabs 
                   v-model="activeTags" 
                   tab-position="bottom"
                   class="h-full flex flex-col custom-tabs"
                >
                   <!-- System Keys -->
                   <el-tab-pane :label="$t('keySetting_keyMenu_system_button')" name="系统按键" class="h-full flex flex-col overflow-hidden">
                      <div class="flex-1 overflow-y-auto custom-scrollbar p-2">
                         <el-menu
                            :default-active="activeSystem"
                            class="border-none bg-transparent w-full"
                            :unique-opened="true"
                         >
                            <el-sub-menu index="0">
                               <template #title><span class="font-medium">{{ $t('keySetting_keyMenu_system_mouse') }}</span></template>
                               <el-menu-item v-for="(keyItem,index) in MouseKeyItem" :index="'0'+index" @click="handleOnMenuClick(keyItem,'鼠标按键',index)" class="rounded-md hover:bg-accent hover:text-accent-foreground">
                                  {{ localeI18n.locale.value === 'zh-cn' ? keyItem.keyName : keyItem.keyNameEn }}
                               </el-menu-item>
                            </el-sub-menu>
                            <el-sub-menu index="1">
                               <template #title><span class="font-medium">{{ $t('keySetting_keyMenu_system_profile') }}</span></template>
                               <el-menu-item v-for="(keyItem,index) in ProfileKeyItem" :index="'1'+index" @click="handleOnMenuClick(keyItem,'板载配置',index)">
                                  {{ localeI18n.locale.value === 'zh-cn' ? keyItem.keyName : keyItem.keyNameEn }}
                               </el-menu-item>
                            </el-sub-menu>
                            <el-sub-menu index="2">
                               <template #title><span class="font-medium">{{ $t('keySetting_keyMenu_system_dpi') }}</span></template>
                               <el-menu-item v-for="(keyItem,index) in DPIKeyItem" :index="'2'+index" @click="handleOnMenuClick(keyItem,'DPI切换',index)">
                                  {{ localeI18n.locale.value === 'zh-cn' ? keyItem.keyName : keyItem.keyNameEn }}
                               </el-menu-item>
                            </el-sub-menu>
                            <el-sub-menu index="3">
                               <template #title><span class="font-medium">{{ $t('keySetting_keyMenu_system_scroll') }}</span></template>
                               <el-menu-item v-for="(keyItem,index) in ScrollKeyItem" :index="'3'+index" @click="handleOnMenuClick(keyItem,'鼠标滚轮',index)">
                                  {{ localeI18n.locale.value === 'zh-cn' ? keyItem.keyName : keyItem.keyNameEn }}
                               </el-menu-item>
                            </el-sub-menu>
                            <el-sub-menu index="4">
                               <template #title><span class="font-medium">{{ $t('keySetting_keyMenu_system_media') }}</span></template>
                               <el-menu-item v-for="(keyItem,index) in ConsumerKeyItem" :index="'4'+index" @click="handleOnMenuClick(keyItem,'多媒体',index)">
                                  {{ localeI18n.locale.value === 'zh-cn' ? keyItem.keyName : keyItem.keyNameEn }}
                               </el-menu-item>
                            </el-sub-menu>
                         </el-menu>
                      </div>
                   </el-tab-pane>

                   <!-- Keyboard Keys -->
                   <el-tab-pane :label="$t('keySetting_keyMenu_keyboard_button')" name="键盘按键" class="h-full flex flex-col overflow-hidden">
                      <div class="flex-1 overflow-y-auto custom-scrollbar p-2">
                         <el-menu
                            :default-active="activeKeyBoard"
                            class="border-none bg-transparent w-full"
                            :unique-opened="true"
                         >
                            <el-sub-menu index="0">
                               <template #title><span class="font-medium">{{ $t('keySetting_keyMenu_keyboard_a_n') }}</span></template>
                               <el-menu-item v-for="(keyItem,index) in KeyBoardKeyItem" :index="'0'+index" @click="handleOnMenuClick(keyItem,'字母和数字键',index)">{{ keyItem.keyName }}</el-menu-item>
                            </el-sub-menu>
                            <el-sub-menu index="1">
                               <template #title><span class="font-medium">{{ $t('keySetting_keyMenu_keyboard_f') }}</span></template>
                               <el-menu-item v-for="(keyItem,index) in FKeyBoardKeyItem" :index="'1'+index" @click="handleOnMenuClick(keyItem,'F区功能键',index)">{{ keyItem.keyName }}</el-menu-item>
                            </el-sub-menu>
                            <el-sub-menu index="2">
                               <template #title><span class="font-medium">{{ $t('keySetting_keyMenu_keyboard_numpad') }}</span></template>
                               <el-menu-item v-for="(keyItem,index) in NumPadKeyBoardKeyItem" :index="'2'+index" @click="handleOnMenuClick(keyItem,'数字小键盘键',index)">{{ keyItem.keyName }}</el-menu-item>
                            </el-sub-menu>
                            <el-sub-menu index="3">
                               <template #title><span class="font-medium">{{ $t('keySetting_keyMenu_keyboard_control') }}</span></template>
                               <el-menu-item v-for="(keyItem,index) in ControlKeyBoardKeyItem" :index="'3'+index" @click="handleOnMenuClick(keyItem,'控制键与字符键',index)">{{ keyItem.keyName }}</el-menu-item>
                            </el-sub-menu>
                         </el-menu>
                      </div>
                   </el-tab-pane>

                   <!-- Special Keys -->
                   <el-tab-pane :label="$t('keySetting_keyMenu_special_button')" name="特殊按键" class="h-full flex flex-col overflow-hidden">
                      <div class="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
                         <!-- Burst Fire -->
                         <div class="glass-panel p-4 rounded-lg bg-secondary/30">
                            <h4 class="text-sm font-semibold mb-3">{{ $t('keySetting_tabs_special_fireKey') }}</h4>
                            <div class="space-y-4">
                               <div class="text-xs text-muted-foreground">{{ $t('keySetting_tabs_special_fireKey_h1') }}</div>
                               <div class="grid grid-cols-2 gap-4">
                                  <div>
                                     <div class="text-xs mb-1">{{ $t('keySetting_tabs_special_fireKey_click_delay') }} (ms)</div>
                                     <el-input-number v-model="hybetweenTime" :min="0" size="small" class="w-full" />
                                  </div>
                                  <div>
                                     <div class="text-xs mb-1">{{ $t('keySetting_tabs_special_fireKey_click_times') }}</div>
                                     <el-input-number v-model="hyTimes" :min="0" size="small" class="w-full" />
                                  </div>
                               </div>
                               <div class="text-xs text-warning">{{ $t('keySetting_tabs_special_fireKey_h2') }}</div>
                               <button class="w-full py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors text-sm font-medium" @click="handleOnMenuClick({value:[hybetweenTime,hyTimes]},'火力键',0)">
                                  {{ $t('bt_save_select') }}
                               </button>
                            </div>
                         </div>

                         <!-- Combo Key -->
                         <div class="glass-panel p-4 rounded-lg bg-secondary/30">
                            <h4 class="text-sm font-semibold mb-3">{{ $t('keySetting_tabs_special_combine') }}</h4>
                            <div class="space-y-4">
                               <el-checkbox-group v-model="selectedValues" @change="handleCheckboxChange" class="flex flex-wrap gap-2">
                                  <el-checkbox-button v-for="item in combinaKey" :key="item" :label="item">
                                     {{ item }}
                                     <sup v-if="getOrder(item)" class="ml-1" :class="selectedValues.includes(item) ? 'text-white' : 'text-primary'">{{ getOrder(item) }}</sup>
                                  </el-checkbox-button>
                               </el-checkbox-group>
                               <div class="flex items-center gap-2">
                                  <span class="text-xl">+</span>
                                  <el-input ref="inputRef" v-model="combineSelectKey" :placeholder="$t('input_key_hint')" readonly @keydown="handleKeydown" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave" />
                               </div>
                               <div class="flex gap-2">
                                  <button class="flex-1 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors text-sm font-medium" @click="handleOnMenuClick({value:getOrderValue()},'组合键',0)">
                                     {{ $t('bt_save_select') }}
                                  </button>
                                  <button class="px-4 py-2 hover:bg-secondary rounded-md transition-colors text-sm" @click="combineSelectKey=''">
                                     {{ $t('bt_clear') }}
                                  </button>
                               </div>
                            </div>
                         </div>
                      </div>
                   </el-tab-pane>

                   <!-- Macro Keys -->
                   <el-tab-pane :label="$t('keySetting_keyMenu_macro_button')" name="宏设置" class="h-full flex flex-col overflow-hidden">
                      <div class="flex-1 overflow-y-auto custom-scrollbar p-4">
                         <div class="flex justify-between items-center mb-4">
                            <span class="text-sm font-medium">{{ $t('macro_list') }}</span>
                            <button class="px-3 py-1.5 bg-green-500/20 text-green-500 hover:bg-green-500/30 rounded-md text-sm transition-colors" @click="isShowMacro=true">
                               {{ $t('bt_create_macro') }}
                            </button>
                         </div>
                         
                         <div v-if="macroList.length === 0" class="text-center py-8 text-muted-foreground text-sm">
                            {{ $t('no_macros') }}
                         </div>

                         <div v-else class="space-y-2">
                            <div v-for="(_item,index) in macroList" :key="index" class="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                                <div class="flex items-center gap-3">
                                   <span class="font-medium text-sm">{{ $t('item_macro') }} {{ index + 1 }}</span>
                                   <el-tag v-if="currentMacroIndex === index" type="success" size="small">{{ $t('status_opened') }}</el-tag>
                                </div>
                                <div class="flex gap-2">
                                   <button class="p-1.5 hover:bg-primary/20 text-primary rounded transition-colors" @click="handleSetMacro(index)" :title="$t('bt_save_select')">
                                      <el-icon><Check /></el-icon>
                                   </button>
                                   <button class="p-1.5 hover:bg-red-500/20 text-red-500 rounded transition-colors" @click="handleDeletMacro(index)" :title="$t('bt_delete')">
                                      <el-icon><Delete /></el-icon>
                                   </button>
                                </div>
                            </div>
                         </div>
                      </div>
                   </el-tab-pane>
                </el-tabs>
             </div>
          </div>
       </transition>
       
       <!-- Placeholder when menu is hidden -->
       <div v-if="!isShowButtonMenu" class="h-full flex flex-col items-center justify-center glass-card rounded-xl border border-white/5 p-8 text-center text-muted-foreground">
          <el-icon size="48" class="mb-4 opacity-50"><Pointer /></el-icon>
          <p>{{ $t('select_button_tip') }}</p>
       </div>
    </div>


    <!-- Right Column: Mouse Visualizer -->
    <div class="w-full xl:w-7/12 h-full flex items-center justify-center relative">
       <CardContainer class="inter-var w-full max-w-lg">
          <CardBody class="bg-transparent relative group/card dark:hover:shadow-2xl dark:hover:shadow-primary/[0.1] w-auto sm:w-[20rem] h-auto rounded-xl p-2 border border-white/10 glass-card">
             <CardItem :translate-z="50" class="text-xl font-bold text-center w-full">
                {{ $t('keySetting_selectKey_tip') }}
             </CardItem>
             
             <CardItem :translate-z="100" class="w-full">
                <div class="relative w-full aspect-[4/5] flex items-center justify-center">
                   <img :src="imgMouse" class="h-full w-auto object-contain drop-shadow-2xl" alt="mouse" />
                   
                   <!-- Overlay Buttons -->
                   <!-- Right Click -->
                   <button 
                      class="absolute top-[20%] right-[20%] w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 z-20"
                      :class="selectedButton === '右键' ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-white/80 dark:bg-black/80 text-foreground hover:bg-primary hover:text-white'"
                      @click="handleButtonClick('右键')"
                   >
                      <span class="text-xs font-bold">{{ $t('mouse_view_right') }}</span>
                   </button>
                   
                   <!-- Left Click -->
                   <button 
                      class="absolute top-[20%] left-[20%] w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 z-20"
                      :class="selectedButton === '左键' ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-white/80 dark:bg-black/80 text-foreground hover:bg-primary hover:text-white'"
                      @click="handleButtonClick('左键')"
                   >
                      <span class="text-xs font-bold">{{ $t('mouse_view_left') }}</span>
                   </button>
                   
                   <!-- Middle Click -->
                   <button 
                      class="absolute top-[10%] left-1/2 -translate-x-1/2 w-8 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 z-20"
                      :class="selectedButton === '中键' ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-white/80 dark:bg-black/80 text-foreground hover:bg-primary hover:text-white'"
                      @click="handleButtonClick('中键')"
                   >
                      <span class="text-xs font-bold">{{ $t('mouse_view_mid') }}</span>
                   </button>
                   
                   <!-- Forward -->
                   <button 
                      class="absolute top-[40%] left-[8%] w-8 h-12 rounded-l-lg flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 z-20"
                      :class="selectedButton === '前进键' ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-white/80 dark:bg-black/80 text-foreground hover:bg-primary hover:text-white'"
                      @click="handleButtonClick('前进键')"
                   >
                      <span class="text-xs font-bold rotate-90">{{ $t('mouse_view_fw') }}</span>
                   </button>
                   
                   <!-- Backward -->
                   <button 
                      class="absolute top-[55%] left-[8%] w-8 h-12 rounded-l-lg flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 z-20"
                      :class="selectedButton === '后退键' ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-white/80 dark:bg-black/80 text-foreground hover:bg-primary hover:text-white'"
                      @click="handleButtonClick('后退键')"
                   >
                      <span class="text-xs font-bold rotate-90">{{ $t('mouse_view_bw') }}</span>
                   </button>
                </div>
             </CardItem>
          </CardBody>
       </CardContainer>
    </div>

  </div>

  <!-- Dialogs -->
  <el-dialog
      v-model="leftDialogVisible"
      :title="$t('title_warning')"
      width="400px"
      align-center
      class="glass-panel"
  >
    <div class="py-4">{{ $t('left_click_warning') }}</div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button class="px-4 py-2 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80" @click="leftDialogVisible = false">{{ $t('bt_cancel') }}</button>
        <button class="px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90" @click="handleButtonClick('左键'); leftDialogVisible = false">
          {{ $t('bt_confirm') }}
        </button>
      </div>
    </template>
  </el-dialog>

  <el-drawer 
    ref="elDrawerMacro" 
    v-model="isShowMacro" 
    :show-close="false" 
    class="glass-panel"
    size="100%"
    :with-header="false"
    append-to-body
  >
    <div class="h-full p-6">
       <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold">{{ $t('macro_recorder_title') }}</h2>
          <button class="p-2 hover:bg-white/10 rounded-full" @click="handleMacroBack">
             <el-icon size="24"><Close /></el-icon>
          </button>
       </div>
       <MacroRecorder class="macro-record h-[calc(100%-4rem)]" @onClose="handleMacroBack" />
    </div>
  </el-drawer>

</template>

<style scoped>
:deep(.el-tabs__nav-wrap::after) {
  background-color: transparent !important;
}
:deep(.el-tabs__header) {
  margin: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(0, 0, 0, 0.02);
}
:deep(.el-tabs__nav-wrap::after) {
  height: 0;
}
:deep(.el-tabs__active-bar) {
  background-color: hsl(var(--primary));
  height: 3px;
  border-radius: 3px 3px 0 0;
}
:deep(.el-tabs__item) {
  color: hsl(var(--muted-foreground));
  font-size: 0.9rem;
  padding: 0 16px !important;
  height: 48px;
  line-height: 48px;
  transition: all 0.3s ease;
}
:deep(.el-tabs__item:hover) {
  color: hsl(var(--foreground));
  background: rgba(255, 255, 255, 0.05);
}
:deep(.el-tabs__item.is-active) {
  color: hsl(var(--primary));
  font-weight: 600;
  background: rgba(var(--primary), 0.05);
}
:deep(.el-checkbox-button__inner) {
    background: transparent;
    border: 1px solid hsl(var(--border));
    color: hsl(var(--foreground));
    border-radius: 4px !important;
}
:deep(.el-checkbox-button.is-checked .el-checkbox-button__inner) {
    background-color: hsl(var(--primary));
    border-color: hsl(var(--primary));
    color: white;
    box-shadow: none;
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