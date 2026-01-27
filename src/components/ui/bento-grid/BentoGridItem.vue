<template>
  <div
    :class="
      cn(
        'row-span-1 rounded-xl group/bento hover:shadow-xl transition duration-200 shadow-input dark:shadow-none p-4 bg-card border border-border justify-between flex flex-col space-y-4',
        props.class,
      )
    "
  >
    <slot name="header" />
    <div class="transition duration-200 group-hover/bento:translate-x-2">
      <slot name="icon" />
      <div class="my-2 font-sans font-bold text-card-foreground">
        <slot name="title" />
      </div>
      <div class="font-sans text-xs font-normal text-muted-foreground">
        <slot name="description" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'vue';

interface Props {
  class?: HTMLAttributes['class'];
}

const props = defineProps<Props>();
</script>
