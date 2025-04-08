<script setup lang="ts">
import { ref } from 'vue';
import { until } from '@vueuse/core';
import { parse, stringify } from 'yaml';
const emit = defineEmits(['update']);
const props = defineProps<{
  hard?: Boolean;
  isConfigAllIdle: boolean;
}>();

const profileConfigData = defineModel<any>('profileConfigData');
const enableAllConfigSections = defineModel<boolean>('enableAllConfigSections');

const profileTextData = ref();

const allProfileList = ['direct', 'white', 'red', 'green', 'blue', 'cyan'];
const profileList = ref<string[]>([]);
const confirmDelete = ref<{ [key: string]: boolean }>(
  allProfileList.reduce((acc:{ [key: string]: boolean },curr)=> (acc[curr]=false,acc),{}));
  // all profile list as key, false as value
async function updateProfileList() {
  // const newList = ref<string[]>([]);
  // profileList.value = newList;
  // emit('update', newList);
}
if (props.hard) {
  updateProfileList();
}

async function newProfile(profile: string) {
  // await props.py('device.new_profile(pt.Profile[profile.upper()])', {locals: {profile: profile}});
  // await updateProfileList();
}

async function deleteProfile(profile: string) {
  // confirmDelete.value[profile] = false;
  // await props.py('device.delete_profile(pt.Profile[profile.upper()])', {locals: {profile: profile}});
  // await updateProfileList();
}

async function exportConfig() {
  enableAllConfigSections.value = true;
  if (props.hard && props.isConfigAllIdle){
    await until(() => props.isConfigAllIdle).toBe(false, {timeout: 10000, throwOnTimeout: true});
  }
  await until(() => props.isConfigAllIdle).toBe(true, {timeout: 10000, throwOnTimeout: true});
  profileTextData.value = stringify(profileConfigData.value, {collectionStyle: 'flow'});
  enableAllConfigSections.value = false;
}

async function importConfig() {
  enableAllConfigSections.value = true;
  if (props.hard && props.isConfigAllIdle){
    await until(() => props.isConfigAllIdle).toBe(false, {timeout: 10000, throwOnTimeout: true});
  }
  await until(() => props.isConfigAllIdle).toBe(true, {timeout: 10000, throwOnTimeout: true});
  profileConfigData.value = parse(profileTextData.value);
  if (props.hard && props.isConfigAllIdle){
    await until(() => props.isConfigAllIdle).toBe(false, {timeout: 10000, throwOnTimeout: true});
  }
  await until(() => props.isConfigAllIdle).toBe(true, {timeout: 10000, throwOnTimeout: true});
  enableAllConfigSections.value = false;
}

</script>
<template>
  <div class="form-control">
    <h2>Profile</h2>
    <div class="grid grid-rows-2 grid-flow-col" v-if="hard">
      <template v-for="p in allProfileList">
        <span class="inline-flex justify-center items-center" :class="{'bg-info text-info-content': profileList.includes(p), 'opacity-40': !profileList.includes(p)}">
          <span>{{ p }}</span>
        </span>
        <button class="btn btn-sm min-w-24 btn-success join-item"
          v-if="p != 'direct' && !profileList.includes(p)"
          @click="newProfile(p)">New</button>
        <button class="btn btn-sm min-w-24 btn-error join-item"
          v-else-if="p != 'direct' && profileList.includes(p) && confirmDelete[p]"
          @click="deleteProfile(p)">Confirm</button>
        <button class="btn btn-sm min-w-24 btn-warning join-item"
          v-else-if="p != 'direct' && profileList.includes(p)"
          @click="confirmDelete[p] = true">Delete</button>
        <button class="btn btn-sm min-w-24 btn-disabled join-item" v-else></button>
      </template>
    </div>
    <textarea
      placeholder="Profile text data"
      class="textarea textarea-bordered textarea-sm w-full h-40 my-4"
      v-model="profileTextData"></textarea>
    <div class="flex flex-row w-full gap-4">
      <button class="btn flex-1" @click="exportConfig">Export config</button>
      <button class="btn flex-1" @click="importConfig">Import config</button>
    </div>
  </div>
</template>