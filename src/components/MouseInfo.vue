<script setup lang="ts">
import { filesize } from 'filesize';
import { ref } from 'vue';
import { fromHexString, toHexString } from './hexString';

const props = defineProps<{
  currentDevice?: HIDDevice;
}>();
const serial = "serial";
const fwVersion = "fwVersion"
const flashUsage = [90,100,100,100];
const [_, flashTotal, flashFree, flashRecycled] = flashUsage;
const flashCanUse = flashFree - flashRecycled;
const flashUsed = flashTotal - flashFree;
const macroCount = "macroCount"


const confirmReset = ref(false);

async function resetFlash() {
  // await props.py(`device.reset_flash()`);
  confirmReset.value = false;
}

const sendCommand = ref(0x0082);
const sendArgument = ref<number[]>([]);
const sendResponse = ref<number[]>([]);

async function sendRawReport() {
//   const resp = await props.py(`
// a, b = device.sr_with(
//   full_command,
//   f'>{len(argument)}s{80-len(argument)}s', bytes([int(x) for x in argument]),
//   all=True);
// list(a + b)
// `, {locals: {
//     full_command: sendCommand.value,
//     argument: JSON.parse(JSON.stringify(sendArgument.value))
//   }});
//   sendResponse.value = resp;
}

</script>
<template>
  <div class="min-w-[30em] *:my-2">
    <table class="table"><tbody>
      <tr><td colspan="2" class="subtitle">System</td></tr>
      <tr><td>Serial</td><td>{{ serial }}</td></tr>
      <tr><td>Firmware</td><td>{{ fwVersion }}</td></tr>
      <tr><td>Flash</td><td>
        <div>Total: {{ flashTotal / 256 }} ({{ filesize(flashTotal) }})</div>
        <div>In use: {{ flashUsed / 256 }} ({{ filesize(flashUsed) }})</div>
        <div>Available: {{ flashCanUse / 256 }} ({{ filesize(flashCanUse) }})</div>
        <div>Recycled: {{ flashRecycled / 256 }} ({{ filesize(flashRecycled) }})</div>
      </td></tr>
      <tr><td>Macro count</td><td>{{ macroCount }}</td></tr>
    </tbody></table>
    <div class="flex items-center h-4">
      <div 
        class="h-full text-center bg-error text-error-content"
        :style="{'width': ((flashUsed / flashTotal) * 100).toString() + '%'}"
      ></div>
      <div 
        class="h-full text-center bg-success text-success-content"
        :style="{'width': ((flashCanUse / flashTotal) * 100).toString() + '%'}"
      ></div>
      <div 
        class="h-full text-center bg-warning text-warning-content"
        :style="{'width': ((flashRecycled / flashTotal) * 100).toString() + '%'}"
      ></div>
    </div>
    <div class="flex justify-between items-center">
      <span>{{ flashUsed / 256 }}<br>in use</span>
      <span>{{ flashCanUse / 256 }}<br>can be used</span>
      <span>{{ flashRecycled / 256 }}<br>recycled</span>
    </div>
    <button class="btn btn-sm min-w-24 btn-warning w-full"
      v-if="!confirmReset"
      @click="confirmReset = true">Reset flash</button>
    <button class="btn btn-sm min-w-24 btn-error w-full"
      v-if="confirmReset"
      @click="resetFlash">Confirm</button>
    <details>
      <summary>Send raw report</summary>
      <div class="grid gap-2 items-baseline" style="grid-template-columns: max-content auto;">
        <span>Command</span>
        <input type="text" class="input input-bordered input-sm w-32"
          :value="'0x' + sendCommand.toString(16).padStart(4, '0')"
          @change="(event) => sendCommand = parseInt(event.target?.value) || 0"
        />
        <span>Argument</span>
        <textarea class="textarea textarea-bordered w-full"
          :value="toHexString(sendArgument)"
          @change="(event) => sendArgument = fromHexString(event.target?.value)"
        ></textarea>
        <button class="btn btn-sm w-full block col-span-2" @click="sendRawReport">Send</button>
        <span>Response</span>
        <textarea class="textarea textarea-bordered w-full"
          :value="toHexString(sendResponse)"
          readonly
        ></textarea>
      </div>
    </details>
  </div>
  
</template>
<style lang="scss" scoped>
.subtitle {
  text-align: center;
  background-color: rgba(255, 255, 255, 0.1);
  padding: 0.25em 0.5em;
}
</style>