<script setup lang="ts">
import { ref, computed } from 'vue';

import { BridgeData, BridgeStatus, makeBridge } from './bridge';

const props = defineProps<{
  hard?: boolean; // should it interact with hardware or just dummy
  activeProfile: number;
  currentDevice?: HIDDevice;
}>();

const bridgeData = defineModel<BridgeData>('bridgeData', {default: {}});
const bridgeStatus = defineModel<BridgeStatus>('bridgeStatus', {default: {}});

const bridge = makeBridge(bridgeData, bridgeStatus, props);

const ledRegions = ['wheel', 'logo', 'strip'];

const ledEffects: {[key: string]: any} = {};
const ledBrightnesses: {[key: string]: any} = {};

for (let region of ledRegions) {
  ledEffects[region] = bridge('effect_' + region, ['off', 0, 0, []],
    `
def f(region, profile):
  e, m, s, c = device.get_led_effect(pt.LedRegion[region.upper()], profile=profile)
  return e.name.lower(), m, s, [list(cc) for cc in c]
f(region, %p)
    `, () => ({region: region}),
    `
def f(region, e, m, s, c, profile):
  e = pt.LedEffect[e.upper()]
  device.set_led_effect(pt.LedRegion[region.upper()], e, int(m), int(s), c, profile=profile)
f(region, e, m, s, c, %p)
    `, (value) => ({region: region, e: value[0], m: value[1], s: value[2], c: value[3]})
  );
  ledBrightnesses[region] = bridge('brightness_' + region, 255,
    `device.get_led_brightness(pt.LedRegion[region.upper()], %p)`, () => ({region: region}),
    `device.set_led_brightness(pt.LedRegion[region.upper()], int(brightness), %p)
    `, (value) => ({region: region, brightness: value})
  );
}

const selectedRegion = ref('wheel');

const selectedRegionEffect = computed({
  get: () => {
    return ledEffects[selectedRegion.value].value;
  },
  set: (value) => {
    ledEffects[selectedRegion.value].value = value;
  }
});

const selectedRegionBrightness = computed({
  get: () => {
    return ledBrightnesses[selectedRegion.value].value;
  },
  set: (value) => {
    ledBrightnesses[selectedRegion.value].value = value;
  }
});

function applyToAll() {
  for (let region of ledRegions) {
    ledEffects[region].value = selectedRegionEffect.value;
    ledBrightnesses[region].value = selectedRegionBrightness.value;
  }
}

</script>
<template>
  <div class="min-w-[30em] flex flex-col gap-2">
    <h2>LED</h2>
    <div class="flex flex-row">
      <button class="btn flex flex-col"
        :class="{'btn-active': selectedRegion === b}"
        v-for="b in ledRegions"
        @click="selectedRegion = b">
        <span>{{ b }}</span>
      </button>
    </div>
    <label class="flex flex-row gap-4 content-baseline">
      <input type="radio" class="radio"
        :checked="selectedRegionEffect[0] === 'off' || selectedRegionEffect[0] === 'disabled'"
        @change="selectedRegionEffect[0] = 'disabled'"/>
      <span>Disabled</span>
    </label>
    <label class="flex flex-row gap-4 content-baseline">
      <input type="radio" class="radio"
        :checked="selectedRegionEffect[0] === 'static'"
        @change="selectedRegionEffect = ['static', 0, 0, [[255, 255, 255]]]"/>
      <span>Static</span>
      <input type="color" :disabled="selectedRegionEffect[0] !== 'static'"
       :value="'#' + (selectedRegionEffect[3]?.[0]?.map((x: number) => x.toString(16).padStart(2, '0')).join('') || '000000')"
       @change="(event) => selectedRegionEffect[3][0] = [...Array.from({ length: 3 }, (_, i) => parseInt(event.target?.value.slice(1).slice(i * 2 + 1, i * 2 + 3), 16))]"/>
    </label>
    <label class="flex flex-row gap-4 content-baseline">
      <input type="radio" class="radio"
        :checked="selectedRegionEffect[0] === 'spectrum'"
        @change="selectedRegionEffect = ['spectrum', 1, 180, []]"/>
      <span>Spectrum</span>
    </label>
    <label class="flex flex-row gap-4 content-baseline">
      <input type="radio" class="radio"
        :checked="selectedRegionEffect[0] === 'wave' && selectedRegionEffect[1] === 0"
        @change="selectedRegionEffect = ['wave', 0, 180, []]"/>
      <span>Wave (Static)</span>
    </label>
    <label class="flex flex-row gap-4 content-baseline">
      <input type="radio" class="radio"
        :checked="selectedRegionEffect[0] === 'wave' && selectedRegionEffect[1] === 1"
        @change="selectedRegionEffect = ['wave', 1, 180, []]"/>
      <span>Wave (Clockwise)</span>
    </label>
    <label class="flex flex-row gap-4 content-baseline">
      <input type="radio" class="radio"
        :checked="selectedRegionEffect[0] === 'wave' && selectedRegionEffect[1] === 2"
        @change="selectedRegionEffect = ['wave', 2, 180, []]"/>
      <span>Wave (Counter-clockwise)</span>
    </label>
    <div class="flex flex-row gap-4 items-center">
      <span>Speed</span>
      <input type="number" min="0" max="255" step="1" class="input input-sm input-bordered"
        :value="selectedRegionEffect[2]"
        @change="(event) => selectedRegionEffect[2] = parseInt(event.target?.value) || 0"
        :disabled="!(selectedRegionEffect[0] === 'spectrum' || selectedRegionEffect[0] === 'wave')"/>
      <div class="flex-1">
        <input type="range" min="0" max="255" class="range" step="1"
          :value="selectedRegionEffect[2]"
          @change="(event) => selectedRegionEffect[2] = event.target?.value"
          :disabled="!(selectedRegionEffect[0] === 'spectrum' || selectedRegionEffect[0] === 'wave')"/>
      </div>
    </div>
    <div class="flex flex-row gap-4 items-center">
      <span>Brightness</span>
      <input type="number" min="0" max="255" step="1" class="input input-sm input-bordered"
        :value="selectedRegionBrightness"
        @change="(event) => selectedRegionBrightness = parseInt(event.target?.value) || 0"/>
      <div class="flex-1">
        <input type="range" min="0" max="255" class="range" step="1"
          :value="selectedRegionBrightness"
          @change="(event) => selectedRegionBrightness = event.target?.value"/>
      </div>
    </div>
    <button class="btn" @click="applyToAll()">Apply to all</button>
  </div>
</template>