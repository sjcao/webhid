<script setup lang="ts">
import { ref, computed } from 'vue';

import { BridgeData, BridgeStatus, makeBridge } from './bridge';
import { parse, stringify } from 'yaml';
import MacroRecorder from "@/components/MacroRecorder.vue";

const props = defineProps<{
  hard?: boolean; // should it interact with hardware or just dummy
  activeProfile: string;
  currentDevice?: HIDDevice;
}>();

const bridgeData = defineModel<BridgeData>('bridgeData', {default: {}});
const bridgeStatus = defineModel<BridgeStatus>('bridgeStatus', {default: {}});

const bridge = makeBridge(bridgeData, bridgeStatus, props);

const dummyRefresh = ref(0);

const macroList = bridge<number[]>('macroList', [],
  'device.get_macro_list()', () => ({dummyRefresh: dummyRefresh.value}),
  '', (value) => ({}),
);

const rr = ref();
const startRecord = ref(false);
async function getMacroFunction(macroId: number) {
//   return await props.py(`
// def macro_op_to_js(macro_op):
//   import struct
//   try:
//     ct = macro_op.get_category()
//     if ct == 'mouse_button':
//       return ct, {'button': macro_op.get_mouse_button().name}
//     it = getattr(macro_op, 'get_' + ct)()
//     if not isinstance(it, dict):
//       it = {'value': it}
//     return ct, it
//   except (IndexError, struct.error):
//     return 'custom', {'op_type': macro_op.op_type.value, 'op_value': list(macro_op.op_value)}
// [macro_op_to_js(x) for x in pt.MacroOp.list_from_bytes(device.get_macro_function(int(macro_id)))]
//   `, {locals: {macro_id: macroId}});
}
async function setMacroFunction(macroId: number, func: object[]) {
//   return await props.py(`
// def f(macro_id, func):
//   class DummyEnum:
//     def __init__(self, value):
//       self.value = value
//   def js_to_macro_op(js):
//     import struct
//     ct, args = js
//     if ct == 'custom':
//       macro_op = pt.MacroOp(op_type=DummyEnum(args['op_type']), op_value=bytes(args['op_value']))
//     elif ct == 'mouse_button':
//       macro_op = pt.MacroOp().set_mouse_button(pt.MacroOpMouseButton[args['button']])
//     else:
//       macro_op = pt.MacroOp()
//       if 'value' in args:
//         getattr(macro_op, 'set_' + ct)(args['value'])
//       else:
//         getattr(macro_op, 'set_' + ct)(**args)
//     return macro_op
//   fn = pt.MacroOp.list_to_bytes([js_to_macro_op(js) for js in func])
//   try:
//     device.delete_macro(macro_id)
//   except pt.RazerException:
//     pass
//   device.set_macro_function(macro_id, fn)
// f(macro_id, func)
//   `, {locals: {macro_id: macroId, func: func}});
}
async function deleteMacro(macroId: number) {
//   return await props.py(`
// device.delete_macro(macro_id)
//   `, {locals: {macro_id: macroId}});
}

function parseIntDefault(s: string, defaultValue: any) {
  const num = parseInt(s);
  return isNaN(num) ? defaultValue : num;
}

const selectedMacroId = ref<number | null>(null);
const macroContentInput = ref<string>('');
const saveTargetMacroId = ref<number | null>(null);

function tryDelete() {
  if (selectedMacroId.value !== null) {
    deleteMacro(selectedMacroId.value).then(() => {
      dummyRefresh.value++;
    });
  }
}

function tryLoad() {
  if (selectedMacroId.value !== null) {
    const s = selectedMacroId.value;
    getMacroFunction(selectedMacroId.value).then((r) => {
      macroContentInput.value = stringify(r, {collectionStyle: 'flow'});
      saveTargetMacroId.value = s;
    })
  }
}

function tryRecord() {
  startRecord.value = true;
}

function trySave() {
  if (saveTargetMacroId.value !== null) {
    setMacroFunction(saveTargetMacroId.value, parse(macroContentInput.value)).then(() => {
      dummyRefresh.value++;
    });
  }
}

const allMacros = ref<string>('');
async function exportMacros() {
  const allMacrosMap: {[key: string]: any} = {};
  for (let macroId of macroList.value) {
    allMacrosMap[macroId] = await getMacroFunction(macroId);
  }
  allMacros.value = stringify(allMacrosMap, {collectionStyle: 'flow'});
}

async function importMacros() {
  const allMacrosMap = parse(allMacros.value);
  for (let [macroId, macroFunction] of Object.entries(allMacrosMap)) {
    if (isNaN(parseInt(macroId))) {
      console.warn(`imported data contains invalid macro id: ${macroId}`);
      continue;
    }
    await setMacroFunction(parseInt(macroId), macroFunction);
  }
  dummyRefresh.value++;
}

</script>
<template>
  <div class="macro-recorder-container">
    <h2>Select</h2>
    <select class="select select-bordered w-full max-w-xs" v-model="selectedMacroId">
      <option :value="null">(none)</option>
      <option v-for="macroId in macroList" :value="macroId">{{ '0x' + macroId.toString(16).padStart(4, '0') }}</option>
    </select>
    <div>
      <button class="btn btn-primary" @click="tryLoad">Load</button>
      <button class="btn btn-error" @click="tryDelete">Delete</button>
      <button v-if="!startRecord" class="btn btn-primary" @click="tryRecord">宏录制</button>
      <button v-else class="btn btn-primary" @click="startRecord = false">取消宏录制</button>
    </div>
    <textarea
      placeholder="Macro content"
      class="textarea textarea-bordered textarea-sm w-full h-40 my-4"
      v-model="macroContentInput"></textarea>
    <div class="flex flex-row gap-4 place-items-center">
      <button class="btn btn-primary" @click="trySave">Save as id</button>
      <input type="text" class="input input-bordered"
        :value="saveTargetMacroId !== null ? '0x' + saveTargetMacroId.toString(16).padStart(4, '0') : ''"
        @change="(event) => saveTargetMacroId = parseIntDefault(event.target?.value, null)" />
    </div>
    <textarea
      placeholder="All Macros"
      class="textarea textarea-bordered textarea-sm w-full h-40 my-4"
      v-model="allMacros"></textarea>
    <div class="flex flex-row w-full gap-4">
      <button class="btn flex-1" @click="exportMacros">Export</button>
      <button class="btn flex-1" @click="importMacros">Import</button>
    </div>

    <MacroRecorder class="macro-record" v-if="startRecord" @onClose="startRecord=false" @contextmenu.prevent></MacroRecorder>
  </div>

</template>


<style scoped>
  .macro-recorder-container {
    position: relative;
    top: 0;
    left: 0;
  }
  .macro-record {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 9999;
    width: 100%;
    min-height: 100%;
    height: auto;
  }
</style>