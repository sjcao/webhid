<script setup lang="ts">

const props = defineProps<{
  hard?: boolean; // should it interact with hardware or just dummy
  activeProfile: number;
  currentDevice?: HIDDevice;
}>();

</script>
<template>
  <div>{{$t('commingsoon')}}
  </div>
</template>