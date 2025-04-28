<template>
  <div class="macro-recorder">
    <!-- 控制按钮 -->
    <div class="control-buttons">
      <el-button
          type="primary"
          @click="toggleRecording"
          :icon="isRecording ? VideoPause : VideoPlay"
      >
        {{ isRecording ? '停止录制' : '开始录制' }}
      </el-button>
      <el-button
          type="success"
          @click="playMacro"
          :disabled="actions.length === 0"
      >
        执行宏
      </el-button>
      <el-button
          type="danger"
          @click="clearActions"
          :disabled="actions.length === 0"
      >
        清空记录
      </el-button>

      <el-button
          type="warning"
          @click="closeActions"
      >
        关闭录制
      </el-button>

      <el-text>延迟时间:</el-text>
      <el-input-number v-model="delay">
      </el-input-number>
    </div>

    <!-- 动作列表 -->
    <div class="action-list" @mousedown="handleMousePress">
      <transition-group name="list">
        <span
            v-for="(action, index) in actions"
            :key="index"
            class="action-item"
        >
          <!-- 按键显示 -->
          <el-card v-if="action.type === 'key'" class="key-display">
            <el-tag type="info" class="key-icon">
              {{ keyIcons[action.key] || action.key.toUpperCase() }}
            </el-tag>
            <span class="key-name">{{ action.key.toUpperCase() }}</span>
            <el-button
                type="danger"
                size="small"
                circle
                @click="deleteAction(index)"
                :icon="Delete"
            />
          </el-card>
          <!-- 延迟显示 -->
          <el-card v-else class="delay-display">
            <span>+</span>
            <el-icon class="clock-icon">
              <Clock/>
            </el-icon>
            <span class="delay-text">{{delay}}ms</span>
            <el-button
                type="danger"
                size="small"
                circle
                @click="deleteAction(index)"
                :icon="Delete"
            />
            <span>+</span>
          </el-card>
        </span>
      </transition-group>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted, onBeforeUnmount} from 'vue'
import {
  VideoPlay,
  VideoPause,
  Delete,
  Clock
} from '@element-plus/icons-vue'

const emit = defineEmits(['close']);

// 响应式状态
const isRecording = ref(false);
const actions = ref([]);
const delay = ref(30);

// 按键图标映射
const keyIcons = {
  control: '⌃',
  shift: '⇧',
  alt: '⌥',
  command: '⌘',
  enter: '⏎',
  backspace: '⌫'
}

// 监听键盘事件
const handleKeyPress = (e) => {
  if (!isRecording.value) return
  e.preventDefault()
  e.stopImmediatePropagation()
  // 记录按键（排除功能键）
  if (e.key.length) {
    // 自动添加延迟（第一个按键不加）
    if (actions.value.length > 0) {
      actions.value.push({type: 'delay', duration: 30})
    }

    actions.value.push({
      type: 'key',
      key: e.key.toLowerCase(),
      timestamp: Date.now()
    })
  }
}

// 监听鼠标事件
const handleMousePress = (e) => {
  if (!isRecording.value) return
  let key = ""
  // 记录按键（排除功能键）
  if (e.button === 0) {
    // 自动添加延迟（第一个按键不加）
    key = "鼠标左键"
  } else if (e.button === 2) {
    key = "鼠标右键"
  }

  if (actions.value.length > 0) {
    actions.value.push({type: 'delay', duration: 30})
  }

  if (key.length === 0) return;

  actions.value.push({
    type: 'key',
    key: key,
    timestamp: Date.now()
  })
}


// 切换录制状态
const toggleRecording = (e) => {
  isRecording.value = !isRecording.value
  if (isRecording.value) {
    actions.value = [] // 开始新录制时清空记录
  }
}

// 删除动作
const deleteAction = (index) => {
  actions.value.splice(index, 1)
}

// 清空记录
const clearActions = () => {
  actions.value = []
}

// 清空记录
const closeActions = () => {
  emit('close')
}


// 执行宏
const playMacro = async () => {
  for (const action of actions.value) {
    if (action.type === 'delay') {
      await new Promise(resolve => setTimeout(resolve, action.duration))
    } else {
      // 这里可以添加实际的按键模拟逻辑
      console.log('模拟按键:', action.key)
    }
  }
}

// 生命周期钩子
onMounted(() => {
  window.addEventListener('keydown', handleKeyPress)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyPress)
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
  flex-wrap: wrap;
  border: 1px solid deepskyblue;
  border-radius: 4px;
  padding: 10px;
  min-height: 400px;
}

.action-item {
  height: fit-content;
  margin: 8px;
  padding: 10px;
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
  gap: 10px;
  width: auto;
}

.key-icon {
  font-size: 18px;
  padding: 5px 10px;
  min-width: 40px;
  text-align: center;
}

.clock-icon {
  color: #67c23a;
  font-size: 18px;
}

.delay-text {
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
