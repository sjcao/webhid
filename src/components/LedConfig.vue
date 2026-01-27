<script setup lang="ts">
import { Opportunity } from '@element-plus/icons-vue'

const props = defineProps<{
  hard?: boolean; 
  activeProfile: number;
  currentDevice?: HIDDevice;
}>();
</script>

<template>
  <div class="flex flex-col gap-8 w-full max-w-2xl mx-auto h-full justify-center items-center">
    <div class="glass-card rounded-xl p-12 border border-white/5 flex flex-col items-center text-center gap-6">
       <div class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
          <el-icon size="40"><Opportunity /></el-icon>
       </div>
       
       <h2 class="text-2xl font-bold tracking-tight">{{$t('led_config_title')}}</h2>
       
       <p class="text-muted-foreground max-w-md">
          {{$t('led_config_desc')}}
       </p>
       
       <div class="flex gap-2 mt-4">
          <div class="w-2 h-2 rounded-full bg-primary/50 animate-bounce"></div>
          <div class="w-2 h-2 rounded-full bg-primary/50 animate-bounce delay-100"></div>
          <div class="w-2 h-2 rounded-full bg-primary/50 animate-bounce delay-200"></div>
       </div>
    </div>
  </div>
</template>