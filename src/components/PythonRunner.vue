<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
}>();

const pythonCode = ref('device.get_serial()');
const pythonResponse = ref('');

async function userRunPython() {
  // pythonResponse.value = await props.py(pythonCode.value, {repr: true});
}

</script>
<template>
  <details>
    <summary>Run python code</summary>
    <div class="flex flex-col gap-2">
      <textarea class="textarea textarea-bordered w-full font-mono"
        v-model="pythonCode"
      ></textarea>
      <button class="btn btn-sm w-full block col-span-2" @click="userRunPython">Run</button>
      <textarea class="textarea textarea-bordered w-full"
        :value="pythonResponse"
        readonly
      ></textarea>
    </div>
  </details>
</template>