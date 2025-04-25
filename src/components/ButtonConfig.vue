<script setup lang="ts">
import { computed, ref } from 'vue';

import { BridgeData, BridgeStatus, makeBridge } from './bridge';
import { hidConsumerCode, hidKeyboardCode } from './hidcode';
import { fromHexString, toHexString } from './hexString';
import {CardBody, CardContainer, CardItem} from "@/components/ui/card-3d";

const props = defineProps<{
  hard?: boolean; // should it interact with hardware or just dummy
  activeProfile: string;
  currentDevice?: HIDDevice;
}>();

const imgMouse = new URL(`/ic-moouse.png`, import.meta.url).href

const bridgeData = defineModel<BridgeData>('bridgeData', {default: {}});
const bridgeStatus = defineModel<BridgeStatus>('bridgeStatus', {default: {}});

const bridge = makeBridge(bridgeData, bridgeStatus, props);

const buttonsLayout = [
  'aim', 'left', 'middle', 'right',
  'forward', 'wheel_up', 'middle_forward', 'wheel_left',
  'backward', 'wheel_down', 'middle_backward', 'wheel_right',
  'bottom'
];

const selectedButton = ref('left');
const selectedHypershift = ref(false);

const buttonFunctionMap: any = {};
for (let hs of [true, false]) {
  for (let b of buttonsLayout) {
    buttonFunctionMap[b + (hs ? '_hypershift' : '')] = bridge(b + (hs ? '_hypershift' : ''), ['disabled', {}],
`
def f(profile, button, hypershift):
  import struct
  bf = device.get_button_function(
    pt.Button[button.upper()],
    pt.Hypershift.ON if hypershift else pt.Hypershift.OFF,
    %p)
  try:
    ct = bf.get_category()
    if ct == 'mouse':
      m = bf.get_mouse()
      if 'fn' in m:
        m['fn'] = m['fn'].name.lower()
      return ct, m
    elif ct == 'keyboard':
      m = bf.get_keyboard()
      if 'modifier' in m:
        m['modifier'] = [x.name.lower() for x in list(m['modifier'])]
      return ct, m
    elif ct == 'macro':
      m = bf.get_macro()
      if 'mode' in m:
        m['mode'] = m['mode'].name.lower()
      return ct, m
    elif ct == 'system':
      m = bf.get_system()
      if 'fn' in m:
        m['fn'] = [x.name.lower() for x in list(m['fn'])]
      return ct, m
    elif ct == 'dpi_switch':
      m = bf.get_dpi_switch()
      if 'fn' in m:
        m['fn'] = m['fn'].name.lower()
      return ct, m
    elif ct == 'profile_switch':
      m = bf.get_profile_switch()
      if 'fn' in m:
        m['fn'] = m['fn'].name.lower()
      if 'profile' in m:
        m['profile'] = m['profile'].name.lower()
      return ct, m
    else:
      return ct, getattr(bf, 'get_' + ct)()
  except (IndexError, struct.error):
    return 'custom', {'fn_class': bf._fn_class, 'fn_value': list(bf.get_fn_value())}
f(profile, button, hypershift)
`, () => ({button: b, hypershift: hs}),
`
def f(profile, button, hypershift, value):
  from functools import reduce
  ct = value[0]
  m = value[1]
  if ct == 'mouse':
    if 'fn' in m:
      m['fn'] = pt.FnMouse[m['fn'].upper()]
  elif ct == 'keyboard':
    if 'modifier' in m:
      m['modifier'] = reduce((lambda x, y: x | y), [pt.FnKeyboardModifier[x.upper()] for x in list(m['modifier'])], pt.FnKeyboardModifier(0))
  elif ct == 'macro':
    if 'mode' in m:
      m['mode'] = pt.FnClass[m['mode'].upper()]
  elif ct == 'system':
    if 'fn' in m:
      m['fn'] = reduce((lambda x, y: x | y), [pt.FnSystem[x.upper()] for x in list(m['fn'])], pt.FnSystem(0))
  elif ct == 'dpi_switch':
    if 'fn' in m:
      m['fn'] = pt.FnDpiSwitch[m['fn'].upper()]
    if 'dpi' in m:
      m['dpi'] = [int(x) for x in m['dpi']]
  elif ct == 'profile_switch':
    if 'fn' in m:
      m['fn'] = pt.FnProfileSwitch[m['fn'].upper()]
    if 'profile' in m:
      m['profile'] = pt.Profile[m['profile'].upper()]
  bf = pt.ButtonFunction()
  if ct == 'custom':
    fn_class = m['fn_class']
    fn_value = bytes(m['fn_value'])
    bf._fn_class = fn_class
    bf.set_fn_value(fn_value)
  else:
    getattr(bf, 'set_' + ct)(**m)
  device.set_button_function(bf,
    pt.Button[button.upper()],
    pt.Hypershift.ON if hypershift else pt.Hypershift.OFF,
    %p)
f(profile, button, hypershift, value)
`, (value) => {
  return {button: b, hypershift: hs, value: value};
},
    );
  }
}
const functionCategoryList = [
  'disabled', 'mouse', 'keyboard', 'macro', 'dpi_switch', 'profile_switch',
  'system', 'consumer', 'hypershift_toggle', 'scroll_mode_toggle', 'custom',
];

const selectedButtonFunction = computed({
  get: () => {
    if (selectedHypershift.value) {
      return buttonFunctionMap[selectedButton.value + '_hypershift'].value;
    }
    return buttonFunctionMap[selectedButton.value].value;
  },
  set: (value) => {
    if (selectedHypershift.value) {
      buttonFunctionMap[selectedButton.value + '_hypershift'].value = value;
    } else {
      buttonFunctionMap[selectedButton.value].value = value;
    }
  }
});

const fnMouse = ['left', 'right', 'middle', 'backward', 'forward', 'wheel_up', 'wheel_down', 'wheel_left', 'wheel_right'];
const fnKeyboardModifier = ['left_control', 'left_shift', 'left_alt', 'left_gui', 'right_control', 'right_shift', 'right_alt', 'right_gui'];
function resetFunctionCategory(newCategory: string) {
  if (selectedButtonFunction.value[0] === newCategory) {
    return;
  }
  if (newCategory === 'disabled') {
    selectedButtonFunction.value = ['disabled', {}];
  } else if (newCategory === 'mouse') {
    selectedButtonFunction.value = ['mouse', {'fn': 'left', 'double_click': false, 'turbo': null}];
  } else if (newCategory === 'keyboard') {
    selectedButtonFunction.value = ['keyboard', {'key': 0x04, 'modifier': [], 'turbo': null}];
  } else if (newCategory === 'macro') {
    selectedButtonFunction.value = ['macro', {'macro_id': 0x0000, mode: 'macro_fixed', times: 1}];
  } else if (newCategory === 'dpi_switch') {
    selectedButtonFunction.value = ['dpi_switch', {'fn': 'next_loop', dpi: [800, 800], stage: 1}];
  } else if (newCategory === 'profile_switch') {
    selectedButtonFunction.value = ['profile_switch', {'fn': 'next_loop'}];
  } else if (newCategory === 'consumer') {
    selectedButtonFunction.value = ['consumer', {'fn': 0xb0}];
  } else if (newCategory === 'system') {
    selectedButtonFunction.value = ['system', {'fn': ['power_down']}];
  } else if (newCategory === 'hypershift_toggle') {
    selectedButtonFunction.value = ['hypershift_toggle', {'fn': 1}];
  } else if (newCategory === 'scroll_mode_toggle') {
    selectedButtonFunction.value = ['scroll_mode_toggle', {'fn': 1}];
  } else if (newCategory === 'custom') {
    selectedButtonFunction.value = ['custom', {'fn_class': 0, 'fn_value': []}];
  }
}

function toggleKeyboardModifier(m: string) {
  if (selectedButtonFunction.value[1].modifier.includes(m)) {
    // included, remove
    const i = selectedButtonFunction.value[1].modifier.indexOf(m)
    selectedButtonFunction.value[1].modifier.splice(i, 1);
  } else {
    selectedButtonFunction.value[1].modifier.push(m);
  }
}

function toggleSystemFn(m: string) {
  if (selectedButtonFunction.value[1].fn.includes(m)) {
    // included, remove
    const i = selectedButtonFunction.value[1].fn.indexOf(m)
    selectedButtonFunction.value[1].fn.splice(i, 1);
  } else {
    selectedButtonFunction.value[1].fn.push(m);
  }
}

function parseIntDefault(s: string, defaultValue: number) {
  const num = parseInt(s);
  return isNaN(num) ? defaultValue : num;
}

</script>
<template>
  <div>
    <CardContainer>
      <CardBody
          class="group/card relative size-auto rounded-xl border border-black/[0.1] bg-gray-50 p-6 sm:w-[30rem] dark:border-white/[0.2] dark:bg-black dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1]"
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
          <img
              :src="imgMouse"
              class="w-full rounded-xl object-fill group-hover/card:shadow-xl"
              alt="thumbnail"
          />
        </CardItem>
      </CardBody>
    </CardContainer>
  </div>

  <div class="form-control" v-if="false">
    <h2>Button</h2>
    <div class="flex flex-row items-baseline">
      <div class="grid grid-cols-4">
        <button class="btn text-xs flex flex-col"
          :class="{'btn-active': selectedButton === b, 'btn-warning': selectedHypershift}"
          v-for="b in buttonsLayout"
          @click="selectedButton = b">
          <span>{{ b }}</span>
          <span class="opacity-40">{{ buttonFunctionMap[b + (selectedHypershift ? '_hypershift' : '')].value[0] }}</span>
        </button>
      </div>
    </div>
    <div class="flex flex-row gap-4 place-items-center">
      <span>Hypershift</span>
      <label class="label cursor-pointer space-x-4">
        <input type="checkbox" class="toggle toggle-sm" v-model="selectedHypershift"/>
      </label>
    </div>
    <h2>Function</h2>
    <div class="grid grid-cols-4 items-baseline mb-4">
      <button class="btn btn-sm"
        v-for="b in functionCategoryList"
        :class="{'btn-active': selectedButtonFunction[0] === b}"
        @click="resetFunctionCategory(b)"
        >{{ b }}</button>
    </div>
    <div v-if="selectedButtonFunction[0] == 'disabled'">
      <span>Disabled</span>
    </div>
    <div v-else-if="selectedButtonFunction[0] == 'mouse'">
      <div class="flex flex-row gap-4 place-items-center">
        <span>Mouse button function</span>
        <select class="select select-bordered w-full max-w-xs" v-model="selectedButtonFunction[1].fn">
          <option v-for="fn in fnMouse" :value="fn">{{ fn }}</option>
        </select>
      </div>
      <div class="flex flex-row gap-4 place-items-center">
        <label class="label cursor-pointer space-x-4">
          <input type="radio" class="radio radio-sm"
            :checked="selectedButtonFunction[1].turbo == null && !selectedButtonFunction[1].double_click"
            @change="selectedButtonFunction[1].turbo = null; selectedButtonFunction[1].double_click = false;" />
          <span>Single Click</span>
        </label>
      </div>
      <div class="flex flex-row gap-4 place-items-center">
        <label class="label cursor-pointer space-x-4">
          <input type="radio" class="radio radio-sm"
            :checked="selectedButtonFunction[1].double_click"
            @change="selectedButtonFunction[1].turbo = null; selectedButtonFunction[1].double_click = true;" />
          <span>Double Click</span>
        </label>
      </div>
      <div class="flex flex-row gap-4 place-items-center">
        <label class="label cursor-pointer space-x-4">
          <input type="radio" class="radio radio-sm"
            :checked="selectedButtonFunction[1].turbo != null"
            @change="selectedButtonFunction[1].turbo = 200; selectedButtonFunction[1].double_click = false;" />
          <span>Turbo</span>
        </label>
        <span>Trigger every</span>
        <input type="number" min="1" max="65535" class="input input-sm input-bordered w-24"
          :disabled="selectedButtonFunction[1].turbo == null"
          :value="selectedButtonFunction[1].turbo ?? 0"
          @change="(event) => {selectedButtonFunction[1].turbo = parseIntDefault(event.target?.value, 200)}"/>
        <span>ms</span>
        <span>({{
          isFinite(1000 / selectedButtonFunction[1].turbo)
          ? (1000 / selectedButtonFunction[1].turbo).toFixed(1)
          : '-'
        }} times / s)</span>
      </div>
    </div>
    <div v-else-if="selectedButtonFunction[0] == 'keyboard'">
      <div class="flex flex-row gap-4 place-items-center">
        <span>Key: </span>
        <input type="number" min="0" max="255" class="input input-sm input-bordered w-24"
          :value="selectedButtonFunction[1].key ?? 0"
          @change="(event) => {selectedButtonFunction[1].key = parseIntDefault(event.target?.value, 0x04)}"/>
        <select class="select select-bordered w-full max-w-xs" v-model="selectedButtonFunction[1].key">
          <option v-for="[code, name] in Object.entries(hidKeyboardCode)" :value="parseInt(code)">{{ code }} {{ name }}</option>
        </select>
      </div>
      <span>Modifiers: </span>
      <div class="grid grid-cols-4 gap-2 place-items-center">
        <label class="label cursor-pointer space-x-4" v-for="m in fnKeyboardModifier">
          <input type="checkbox" class="checkbox checkbox-sm"
            :checked="selectedButtonFunction[1].modifier.includes(m)"
            @change="toggleKeyboardModifier(m)" />
          <span>{{ m }}</span>
        </label>
      </div>
      <div class="flex flex-row gap-4 place-items-center">
        <label class="label cursor-pointer space-x-4">
          <input type="checkbox" class="checkbox checkbox-sm"
            :checked="selectedButtonFunction[1].turbo != null"
            @change="(event) => selectedButtonFunction[1].turbo = event.target?.checked ? 200 : null" />
          <span>Turbo</span>
        </label>
        <span>Trigger every</span>
        <input type="number" min="1" max="65535" class="input input-sm input-bordered w-24"
          :disabled="selectedButtonFunction[1].turbo == null"
          :value="selectedButtonFunction[1].turbo ?? 0"
          @change="(event) => {selectedButtonFunction[1].turbo = parseIntDefault(event.target?.value, 200)}"/>
        <span>ms</span>
        <span>({{
          isFinite(1000 / selectedButtonFunction[1].turbo)
          ? (1000 / selectedButtonFunction[1].turbo).toFixed(1)
          : '-'
        }} times / s)</span>
      </div>
    </div>
    <div v-else-if="selectedButtonFunction[0] == 'macro'">
      <div class="flex flex-row gap-4 place-items-center">
        <span>Macro ID</span>
        <input class="input input-sm input-bordered"
          :value="'0x' + (selectedButtonFunction[1].macro_id ?? 0).toString(16).padStart(4, '0')"
          @change="(event) => selectedButtonFunction[1].macro_id = parseIntDefault(event.target?.value, 0)"/>
      </div>
      <div class="flex flex-row gap-4 place-items-center">
        <label class="label cursor-pointer space-x-4">
          <input type="radio" class="radio radio-sm"
            :checked="selectedButtonFunction[1].mode === 'macro_fixed'"
            @change="selectedButtonFunction[1].mode = 'macro_fixed'" />
          <span>Repeat for</span>
        </label>
        <input class="input input-sm input-bordered w-20"
          :value="selectedButtonFunction[1].times.toString()"
          @change="(event) => selectedButtonFunction[1].times = parseIntDefault(event.target?.value, 1)"/>
          <span>times</span>
      </div>
      <div class="flex flex-row gap-4 place-items-center">
        <label class="label cursor-pointer space-x-4">
          <input type="radio" class="radio radio-sm"
            :checked="selectedButtonFunction[1].mode === 'macro_hold'"
            @change="selectedButtonFunction[1].mode = 'macro_hold'" />
          <span>Hold</span>
        </label>
      </div>
      <div class="flex flex-row gap-4 place-items-center">
        <label class="label cursor-pointer space-x-4">
          <input type="radio" class="radio radio-sm"
            :checked="selectedButtonFunction[1].mode === 'macro_toggle'"
            @change="selectedButtonFunction[1].mode = 'macro_toggle'" />
          <span>Toggle</span>
        </label>
      </div>
      <div class="flex flex-row gap-4 place-items-center">
        <label class="label cursor-pointer space-x-4">
          <input type="radio" class="radio radio-sm"
            :checked="selectedButtonFunction[1].mode === 'macro_sequence'"
            @change="selectedButtonFunction[1].mode = 'macro_sequence'" />
          <span>Sequence</span>
        </label>
      </div>
    </div>
    <div v-else-if="selectedButtonFunction[0] == 'dpi_switch'">
      <div class="flex flex-row gap-4 place-items-center">
        <label class="label cursor-pointer space-x-4">
          <input type="radio" class="radio radio-sm"
            :checked="selectedButtonFunction[1].fn === 'next'"
            @change="selectedButtonFunction[1].fn = 'next'" />
          <span>Next</span>
        </label>
      </div>
      <div class="flex flex-row gap-4 place-items-center">
        <label class="label cursor-pointer space-x-4">
          <input type="radio" class="radio radio-sm"
            :checked="selectedButtonFunction[1].fn === 'prev'"
            @change="selectedButtonFunction[1].fn = 'prev'" />
          <span>Previous</span>
        </label>
      </div>
      <div class="flex flex-row gap-4 place-items-center">
        <label class="label cursor-pointer space-x-4">
          <input type="radio" class="radio radio-sm"
            :checked="selectedButtonFunction[1].fn === 'next_loop'"
            @change="selectedButtonFunction[1].fn = 'next_loop'" />
          <span>Next (Loop)</span>
        </label>
      </div>
      <div class="flex flex-row gap-4 place-items-center">
        <label class="label cursor-pointer space-x-4">
          <input type="radio" class="radio radio-sm"
            :checked="selectedButtonFunction[1].fn === 'prev_loop'"
            @change="selectedButtonFunction[1].fn = 'prev_loop'" />
          <span>Previous (Loop)</span>
        </label>
      </div>
      <div class="flex flex-row gap-4 place-items-center">
        <label class="label cursor-pointer space-x-4">
          <input type="radio" class="radio radio-sm"
            :checked="selectedButtonFunction[1].fn === 'fixed'"
            @change="selectedButtonFunction[1].fn = 'fixed'; selectedButtonFunction[1].stage = selectedButtonFunction[1].stage ?? 1" />
          <span>Set dpi to stage </span>
        </label>
        <input type="number" min="1" max="5" step="1" class="input input-sm input-bordered w-20"
          :disabled="selectedButtonFunction[1].fn !== 'fixed'"
          :value="(selectedButtonFunction[1].stage ?? 1).toString()"
          @change="(event) => selectedButtonFunction[1].stage = parseIntDefault(event.target?.value, 1)"/>
      </div>
      <div class="flex flex-row gap-4 place-items-center">
        <label class="label cursor-pointer space-x-4">
          <input type="radio" class="radio radio-sm"
            :checked="selectedButtonFunction[1].fn === 'aim'"
            @change="selectedButtonFunction[1].fn = 'aim'; selectedButtonFunction[1].dpi = selectedButtonFunction[1].dpi ?? [800, 800]" />
          <span>Set dpi to </span>
        </label>
        <span>X:</span>
        <input type="number" min="100" max="25600" step="100" class="input input-sm input-bordered w-20"
          :disabled="selectedButtonFunction[1].fn !== 'aim'"
          :value="(selectedButtonFunction[1].dpi?.[0] ?? 800).toString()"
          @change="(event) => selectedButtonFunction[1].dpi[0] = parseIntDefault(event.target?.value, 800)"/>
        <span>Y:</span>
        <input type="number" min="100" max="25600" step="100" class="input input-sm input-bordered w-20"
          :disabled="selectedButtonFunction[1].fn !== 'aim'"
          :value="(selectedButtonFunction[1].dpi?.[1] ?? 800).toString()"
          @change="(event) => selectedButtonFunction[1].dpi[1] = parseIntDefault(event.target?.value, 800)"/>
      </div>
    </div>
    <div v-else-if="selectedButtonFunction[0] == 'profile_switch'">
      <div class="flex flex-row gap-4 place-items-center">
        <label class="label cursor-pointer space-x-4">
          <input type="radio" class="radio radio-sm"
            :checked="selectedButtonFunction[1].fn === 'next'"
            @change="selectedButtonFunction[1].fn = 'next'" />
          <span>Next</span>
        </label>
      </div>
      <div class="flex flex-row gap-4 place-items-center">
        <label class="label cursor-pointer space-x-4">
          <input type="radio" class="radio radio-sm"
            :checked="selectedButtonFunction[1].fn === 'prev'"
            @change="selectedButtonFunction[1].fn = 'prev'" />
          <span>Previous</span>
        </label>
      </div>
      <div class="flex flex-row gap-4 place-items-center">
        <label class="label cursor-pointer space-x-4">
          <input type="radio" class="radio radio-sm"
            :checked="selectedButtonFunction[1].fn === 'next_loop'"
            @change="selectedButtonFunction[1].fn = 'next_loop'" />
          <span>Next (Loop)</span>
        </label>
      </div>
      <div class="flex flex-row gap-4 place-items-center">
        <label class="label cursor-pointer space-x-4">
          <input type="radio" class="radio radio-sm"
            :checked="selectedButtonFunction[1].fn === 'prev_loop'"
            @change="selectedButtonFunction[1].fn = 'prev_loop'" />
          <span>Previous (Loop)</span>
        </label>
      </div>
      <div class="flex flex-row gap-4 place-items-center">
        <label class="label cursor-pointer space-x-4">
          <input type="radio" class="radio radio-sm"
            :checked="selectedButtonFunction[1].fn === 'fixed'"
            @change="selectedButtonFunction[1].fn = 'fixed'; selectedButtonFunction[1].profile = selectedButtonFunction[1].profile ?? 'white'" />
          <span>Switch to profile </span>
        </label>
        <select class="select select-bordered w-full max-w-xs"
          :disabled="selectedButtonFunction[1].fn !== 'fixed'"
          v-model="selectedButtonFunction[1].profile">
          <option v-for="profile in ['white', 'red', 'green', 'blue', 'cyan']" :value="profile">{{ profile }}</option>
        </select>
      </div>
    </div>
    <div v-else-if="selectedButtonFunction[0] == 'system'">
      <div class="grid grid-cols-4 gap-2 place-items-center">
        <label class="label cursor-pointer space-x-4" v-for="m in ['power_down', 'sleep', 'wake_up']">
          <input type="checkbox" class="checkbox checkbox-sm"
            :checked="selectedButtonFunction[1].fn.includes(m)"
            @change="toggleSystemFn(m)" />
          <span>{{ m }}</span>
        </label>
      </div>
    </div>
    <div v-else-if="selectedButtonFunction[0] == 'consumer'">
      <div class="flex flex-row gap-4 place-items-center">
        <span>Function: </span>
        <input type="number" min="0" max="65535" class="input input-sm input-bordered w-24"
          :value="selectedButtonFunction[1].fn ?? 0"
          @change="(event) => {selectedButtonFunction[1].fn = parseIntDefault(event.target?.value, 0xb0)}"/>
        <select class="select select-bordered w-full max-w-xs" v-model="selectedButtonFunction[1].fn">
          <option v-for="[code, name] in Object.entries(hidConsumerCode)" :value="parseInt(code)">{{ code }} {{ name }}</option>
        </select>
      </div>
    </div>
    <div v-else-if="selectedButtonFunction[0] == 'hypershift_toggle'">
    </div>
    <div v-else-if="selectedButtonFunction[0] == 'scroll_mode_toggle'">
    </div>
    <div v-else-if="selectedButtonFunction[0] == 'custom'">
      <div class="flex flex-row gap-4 place-items-center">
        <span>class: </span>
        <input type="number" min="0" max="255" class="input input-sm input-bordered w-24"
          :value="selectedButtonFunction[1].fn_class ?? 0"
          @change="(event) => {selectedButtonFunction[1].fn_class = parseIntDefault(event.target?.value, 0)}"/>
      </div>
      <div class="flex flex-row gap-4 place-items-center">
        <span>value: </span>
        <input type="text" class="input input-sm input-bordered"
          :value="toHexString(selectedButtonFunction[1].fn_value)"
          @change="(event) => {selectedButtonFunction[1].fn_value = fromHexString(event.target?.value)}"/>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
</style>