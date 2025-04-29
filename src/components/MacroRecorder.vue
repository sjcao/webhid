<template>
  <div class="macro-recorder">
    <el-radio-group v-model="loopType">
      <el-text>循环方式：</el-text>
      <el-radio label="1" size="large" border>按住循环</el-radio>
      <el-radio label="2" size="large" border>循环至此键按下</el-radio>
      <el-radio label="3" size="large" border>循环至任何键按下</el-radio>
      <el-radio label="4" size="large" border>循环
        <el-input-number v-model="loopTimes" min="1">
          <template #suffix>次</template>
        </el-input-number>
      </el-radio>
    </el-radio-group>
    <!-- 控制按钮 -->
    <div class="control-buttons mt-5">
      <el-button
          type="primary"
          @click="toggleRecording"
          :icon="isRecording ? VideoPause : VideoPlay"
      >
        {{ isRecording ? '停止录制' : '开始录制' }}
      </el-button>
      <!--      <el-button-->
      <!--          type="success"-->
      <!--          @click="playMacro"-->
      <!--          :disabled="actions.length === 0"-->
      <!--      >-->
      <!--        执行宏-->
      <!--      </el-button>-->
      <el-button
          type="danger"
          @click="clearActions"
          :disabled="actions.length === 0 || isRecording"
      >
        清空记录
      </el-button>

      <el-button
          type="warning"
          @click="closeActions"
          :disabled="isRecording"
      >
        关闭录制
      </el-button>

      <!--      <el-text>延迟时间:</el-text>-->
      <!--      <el-input-number v-model="delay">-->
      <!--      </el-input-number>-->
    </div>

    <!-- 动作列表 -->
    <div class="action-list border-2" @mousedown="handleMouseDown" @mouseup="handleMouseUp">
      <transition-group name="list">
        <div
            v-for="(action, index) in actions"
            :key="index"
            class="flex h-20 items-center"
        >
          <!-- 延迟显示 -->
          <el-card class="delay-display" v-if="index > 0 && action.isDeleteDelay !== true">
            <el-text type="success" class="delay-text">
              <el-icon>
                <Stopwatch/>
              </el-icon>
              {{ calculateTime(index) }}ms
            </el-text>
            <el-divider direction="vertical"/>
            <el-popover :visible="activeEditTimeIndex === index" placement="top" :width="180">
              <el-input-number v-model="editInputTimeRef" :min="0"></el-input-number>
              <div style="text-align: right" class="mt-2">
                <el-button size="small" text @click="handleDeleteTime(index)">删除</el-button>
                <el-button size="small" type="primary" @click="handleEditTime(index)">修改</el-button>
              </div>
              <template #reference>
                <el-button
                    class=""
                    type="success"
                    plain
                    size="small"
                    circle
                    @click="activeEditTimeIndex=index;editInputTimeRef=calculateTime(index)"
                    :icon="Edit"
                    :disabled="isRecording"
                />
              </template>
            </el-popover>

          </el-card>
          <el-icon v-if="index>0 && action.isDeleteDelay !== true" size="25">
            <Right/>
          </el-icon>
          <!-- 按键显示 -->
          <el-card class="key-display">
            <el-text type="primary" class="key-icon">
              <el-icon v-if="action.type===KeyType.MOUSE" class="h-4">
                <Mouse/>
              </el-icon>
              <el-image v-if="action.type===KeyType.KEYBOARD" :src="imgKeyBoard" class="h-6 mr-2"></el-image>
              {{ action.keyName.toUpperCase() }}
              <el-icon v-if="action.action === KeyActionType.DOWN">
                <Bottom/>
              </el-icon>
              <el-icon v-if="action.action === KeyActionType.UP">
                <Top/>
              </el-icon>
            </el-text>
            <!--            <span class="key-name">{{ action.key.toUpperCase() }}</span>-->
            <el-divider direction="vertical"/>
            <el-popover :visible="activeEditMouseIndex === index || activeEditkeyBoardIndex === index" placement="top"
                        :width="180">
              <el-dropdown split-button type="primary" v-if="action.type===KeyType.MOUSE">
                {{ editMosueClickString }}
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-for="(item,index) in MouseKeyItem.slice(1)" :tabindex="index"
                                      @click="onEditMouseClick(item)">{{ item.keyName }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-input v-if="action.type===KeyType.KEYBOARD" class="1" :ref="el => { if (el) editInputRefs[index] = el }" placeholder="请输入键盘按键"
                        v-model="editInputKey"
                        @keydown="handleKeydown" @mouseenter="handleMouseEnter(index)"
                        @mouseleave="handleMouseLeave(index)"
                        readonly></el-input>
              <div style="text-align: right" class="mt-2">
                <el-button size="small" text @click="handleDeleteItem(index)">删除</el-button>
                <el-button size="small" type="primary" @click="handleEditItem(index)">修改</el-button>
              </div>
              <template #reference>
                <el-button
                    class="ml-1"
                    type="primary"
                    plain
                    size="small"
                    circle
                    @click="handleEditKeyBoardOrMouse(action,index)"
                    :icon="Edit"
                    :disabled="isRecording"
                />
              </template>
            </el-popover>
          </el-card>

          <el-icon v-if="index!==actions.length-1" size="25">
            <Right/>
          </el-icon>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from 'vue'

import {Bottom, Edit, Mouse, Right, Stopwatch, Top, VideoPause, VideoPlay} from '@element-plus/icons-vue'
import {KeyActionType, KeyType, MacroAction, saveActionsToLocalStorage} from "@/components/macro.ts";
import {AllKeyBoardKeyEventKey, MouseKeyItem} from "@/components/hidcode.ts";

const calculateTime = (index: number): number => {
  if (index === 0 || actions.value.length < 2) return 0;
  const current = actions.value[index];
  const previous = actions.value[index - 1];
  let delay = current.timeStamp - previous.timeStamp;
  if (delay > 65535) delay = 65535
  return delay;
};

const handleDeleteTime = (index: number) => {
  if (index > 0 && index < actions.value.length) {
    actions.value[index].isDeleteDelay = true;
  }
  activeEditTimeIndex.value = null; // 重置编辑状态
};

const handleEditTime = (index: number) => {
  if (activeEditTimeIndex.value === index && editInputTimeRef.value >= 0) {
    const oldTimestamp = actions.value[index].timeStamp;

    const newDelay = Math.min(editInputTimeRef.value, 65535);
    actions.value[index].timeStamp = actions.value[index - 1].timeStamp + newDelay;

    // 计算时间差
    const timeDifference = actions.value[index].timeStamp - oldTimestamp;

    // 更新当前及后续所有动作的时间
    for (let i = index + 1; i < actions.value.length; i++) {
      actions.value[i].timeStamp += timeDifference;
    }
  }
  activeEditTimeIndex.value = null;
};


// 绑定输入框的值
const editInputRefs = ref<Record<string, any>>({}); // 使用对象存储

const editInputKey = ref<string>('');
// 处理键盘按下事件
const handleKeydown = (event: KeyboardEvent) => {
  // 阻止默认行为（如输入多个字符）
  event.preventDefault();

  // 获取按下的键值
  const key = event.key;
  editInputKey.value = key;
};


// 处理鼠标进入事件
const handleMouseEnter = (index) => {
  const editInputRef = editInputRefs.value[index];
  if (editInputRef) {
    // 调用 focus 方法让输入框获取焦点
    editInputRef.focus();
  }
};

// 处理鼠标离开事件
const handleMouseLeave = (index) => {
  const editInputRef = editInputRefs.value[index];
  if (editInputRef) {
    // 调用 blur 方法让输入框失去焦点
    editInputRef.blur();
  }
};

const handleEditKeyBoardOrMouse = (action: MacroAction, index: number) => {
  if (action.type === KeyType.MOUSE) {
    editMosueClick.value = MouseKeyItem.find((item) => item.keyName === action.keyName)
    editMosueClickString.value = editMosueClick.value.keyName
  }

  editInputKey.value = ''

  activeEditMouseIndex.value = action.type === KeyType.MOUSE ? index : null;
  activeEditkeyBoardIndex.value = action.type === KeyType.KEYBOARD ? index : null;
};

// 删除后调整后续的时间间隔不变
const handleDeleteItem = (index: number) => {
  if (index >= 0 && index < actions.value.length) {
    const deletedAction = actions.value[index];
    actions.value.splice(index, 1); // 删除指定索引的动作项

    // 如果删除的不是最后一个动作，调整后续动作的时间戳
    if (index < actions.value.length) {
      const timeDifference = deletedAction.timeStamp - actions.value[index].timeStamp;

      for (let i = index; i < actions.value.length; i++) {
        actions.value[i].timeStamp += timeDifference;
      }
    }
  }
  activeEditMouseIndex.value = null;
  activeEditkeyBoardIndex.value = null;
};

const editMosueClick = ref<any>();
const editMosueClickString = ref('');
const onEditMouseClick = (item: any) => {
  editMosueClick.value = item
  editMosueClickString.value = item.keyName
};

const handleEditItem = (index: number) => {
  if (index >= 0 && index < actions.value.length) {
    if (actions.value[index].type === KeyType.MOUSE) {
      // 修改鼠标值逻辑
      const mouseKey = editMosueClick.value;
      if (mouseKey) {
        actions.value[index].keyName = mouseKey.keyName;
        actions.value[index].keyCode = mouseKey.keyCode; // 假设 MouseKeyItem 包含 keyCode 属性
      }
    } else if (actions.value[index].type === KeyType.KEYBOARD) {
      // 修改按键值逻辑
      if (editInputKey.value) {
        actions.value[index].keyName = editInputKey.value;
        // todo
        // actions.value[index].keyCode = Object.keys(AllKeyBoardKeyEventKey).find(key => key === editInputKey.value)
      }
    }
  }

  activeEditMouseIndex.value = null;
  activeEditkeyBoardIndex.value = null;
};

const emit = defineEmits(['onClose']);

// 响应式状态
const isRecording = ref(false);
const activeEditTimeIndex = ref<number | null>(null);
const activeEditMouseIndex = ref<number | null>(null);
const activeEditkeyBoardIndex = ref<number | null>(null);
const actions = ref<MacroAction[]>([]);
const editInputTimeRef = ref(0);

const imgKeyBoard = new URL(`/ic_keyboard.svg`, import.meta.url).href

// 按键图标映射
const keyIcons: { [key: string]: string } = {
  control: 'Ctrl',
  shift: '⇧',
  alt: '⌥',
  command: '⌘',
  enter: '⏎',
  backspace: '⌫'
}


const loopType = ref('1');
const loopTimes = ref(1);

// 监听键盘事件
const handleKeyDown = (e) => {
  if (!isRecording.value) return
  e.preventDefault()
  e.stopImmediatePropagation()
  // 记录按键（排除功能键）
  if (e.key.length) {
    let keyName = e.key
    if (e.key === ' ') {
      keyName = '空格键';
    }

    const action: MacroAction = {
      keyName: keyName,
      keyCode: e.code,
      action: KeyActionType.DOWN,
      type: KeyType.KEYBOARD,
      timeStamp: Date.now()
    }

    actions.value.push(action)
  }
}

// 监听键盘事件
const handleKeyUp = (e) => {
  if (!isRecording.value) return
  e.preventDefault()
  e.stopImmediatePropagation()

  if (e.key.length) {
    let keyName = e.key
    if (e.key === ' ') {
      keyName = '空格键';
    }

    const action: MacroAction = {
      keyName: keyName,
      keyCode: e.code,
      action: KeyActionType.UP,
      type: KeyType.KEYBOARD,
      timeStamp: Date.now()
    }
    actions.value.push(action)
  }
}


// 监听鼠标事件
const handleMouseDown = (e) => {
  if (!isRecording.value) return
  let key = ""
  if (e.button === 0) {
    key = "左键"
  } else if (e.button === 2) {
    key = "右键"
  } else if (e.button === 1) {
    key = "中键"
  } else if (e.button === 3) {
    key = "后退"
  } else if (e.button === 3) {
    key = "前进"
  }

  if (key.length === 0) return;

  const action: MacroAction = {
    keyName: key,
    keyCode: e.button,
    action: KeyActionType.DOWN,
    type: KeyType.MOUSE,
    timeStamp: Date.now()
  }

  actions.value.push(action)
}

// 监听鼠标事件
const handleMouseUp = (e) => {
  if (!isRecording.value) return
  let key = ""
  if (e.button === 0) {
    key = "左键"
  } else if (e.button === 2) {
    key = "右键"
  } else if (e.button === 1) {
    key = "中键"
  } else if (e.button === 3) {
    key = "后退"
  } else if (e.button === 3) {
    key = "前进"
  }

  if (key.length === 0) return;

  const action: MacroAction = {
    keyName: key,
    keyCode: e.button,
    action: KeyActionType.UP,
    type: KeyType.MOUSE,
    timeStamp: Date.now()
  }

  actions.value.push(action)

}

// 切换录制状态
const toggleRecording = (e) => {
  isRecording.value = !isRecording.value
  if (isRecording.value) {
    // actions.value = [] // 开始新录制时清空记录
  }
}

// 删除动作
const editAction = (index) => {
  // actions.value.splice(index, 1)
}

// 清空记录
const clearActions = () => {
  actions.value = []
}

// 清空记录
const closeActions = () => {
  //保存本地
  if (actions.value.length) {
    saveActionsToLocalStorage(actions.value)
  }
  emit('onClose')
}

// 生命周期钩子
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})
</script>

<style scoped>
.macro-recorder {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  width: 100%;
  height: 100%;
}

.control-buttons {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.action-list {
  display: flex;
  justify-items: start;
  flex-wrap: wrap;
  align-items: start;
  border-radius: 4px;
  padding: 10px;
  min-height: 550px;
}

.action-item {
  height: fit-content;
  margin: 8px;
  padding: 0;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  align-items: center;
  transition: all 0.3s;
  flex-shrink: 0;
}

.key-display, .delay-display {
  display: flex;
  align-items: center;
  width: auto;
}

.key-icon {
  font-size: 25px;
  text-align: center;
}

.clock-icon {
  color: #67c23a;
  font-size: 18px;
}

.delay-text {
  font-size: 18px;
  color: #909399;
}

.list-enter-active, .list-leave-active {
  transition: all 0.5s;
}

.list-enter-from, .list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
