<script setup lang="ts">
import { ref, watch } from 'vue';

import { BridgeData, BridgeStatus, makeBridge } from './bridge';

const props = defineProps<{
  hard?: boolean; // should it interact with hardware or just dummy
  activeProfile: string;
  currentDevice?: HIDDevice;

}>();

const bridgeData = defineModel<BridgeData>('bridgeData', {default: {}});
const bridgeStatus = defineModel<BridgeStatus>('bridgeStatus', {default: {}});

const bridge = makeBridge(bridgeData, bridgeStatus, props);

const liftMode = bridge<string>('liftMode', 'sym_1',
  'device.get_sensor_lift().name.lower()', () => ({}),
  `
def f(lift_mode):
  c = pt.LiftConfig[lift_mode.upper()]
  if c.name.startswith('SYM') or c.name.startswith('ASYM'):
    device.set_sensor_state(False)
  else:
    device.set_sensor_state(True)
  device.set_sensor_lift(c)
f(lift_mode)
`, (value) => ({lift_mode: value}),
);

function startCalibration() {
  // props.py('device.set_device_mode(pt.DeviceMode.DRIVER); device.set_sensor_state(True); device.set_sensor_lift(pt.LiftConfig.CALIB1); device.set_sensor_calibration(False)');
}

function stopCalibration() {
  if (props.hard) {
    // props.py('device.set_sensor_calibration(True); device.set_sensor_state(False); device.set_device_mode(pt.DeviceMode.NORMAL)');
  }
}

const retrCalib = ref<number[]>([]);
const lift = ref(4);
const land = ref(4);
const asym = ref(false);
const paramA = ref([]);
const paramB = ref([]);

// watch(() => [retrCalib.value, lift.value, land.value, asym.value], async () => {
//   const a = asym.value;
//   const r =
//       await props.py(`
// def f(mouse_data, lift, land):
//   if land is None:
//     return list(pt.calculate_lift_config(mouse_data, lift, land))
//   else:
//     a, b = pt.calculate_lift_config(mouse_data, lift, land)
//     return list(a), list(b)
// f(mouse_data, lift, land)
//   `, {locals: {
//     mouse_data: retrCalib.value.slice(0, 4),
//     lift: lift.value,
//     land: a ? land.value : null,
//   }});
//   if (a) {
//     paramA.value = r[0];
//     paramB.value = r[1];
//   } else {
//     paramA.value = r;
//     paramB.value = [];
//   }
// }, {deep: true});

function setParams() {
  // if (paramB.value.length === 0) {
  //   props.py('device.set_sensor_lift_config(bytes([int(x) for x in data]))', {locals: {data: JSON.parse(JSON.stringify(paramA.value))}});
  // } else {
  //   props.py('device.set_sensor_lift_config_a(bytes([int(x) for x in data]))', {locals: {data: JSON.parse(JSON.stringify(paramA.value))}});
  //   props.py('device.set_sensor_lift_config_b(bytes([int(x) for x in data]))', {locals: {data: JSON.parse(JSON.stringify(paramB.value))}});
  // }
}

</script>
<template>
  <div class="min-w-[30em] flex flex-col gap-2" @keydown.s="stopCalibration">
    <h2>Sensor config</h2>
    <div class="grid gap-4 w-full place-items-center" style="grid-template-columns: repeat(4, max-content);" v-if="hard">
      <span>Smart</span>
      <label class="label cursor-pointer space-x-4">
        <input type="radio" class="radio radio-sm" v-model="liftMode" value="sym_1"/>
        <span>1</span>
      </label>
      <label class="label cursor-pointer space-x-4">
        <input type="radio" class="radio radio-sm" v-model="liftMode" value="sym_2"/>
        <span>2</span>
      </label>
      <label class="label cursor-pointer space-x-4">
        <input type="radio" class="radio radio-sm" v-model="liftMode" value="sym_3"/>
        <span>3</span>
      </label>
      <span>Smart Asym</span>
      <label class="label cursor-pointer space-x-4">
        <input type="radio" class="radio radio-sm" v-model="liftMode" value="asym_12"/>
        <span>1-2</span>
      </label>
      <label class="label cursor-pointer space-x-4">
        <input type="radio" class="radio radio-sm" v-model="liftMode" value="asym_13"/>
        <span>1-3</span>
      </label>
      <label class="label cursor-pointer space-x-4">
        <input type="radio" class="radio radio-sm" v-model="liftMode" value="asym_23"/>
        <span>2-3</span>
      </label>
      <span>Calib</span>
      <label class="label cursor-pointer space-x-4">
        <input type="radio" class="radio radio-sm" v-model="liftMode" value="config1"/>
        <span>Razer</span>
      </label>
      <label class="label cursor-pointer space-x-4">
        <input type="radio" class="radio radio-sm" v-model="liftMode" value="calib1"/>
        <span>Self</span>
      </label>
      <label class="label cursor-pointer space-x-4">
      </label>
      <span>Calib Asym</span>
      <label class="label cursor-pointer space-x-4">
        <input type="radio" class="radio radio-sm" v-model="liftMode" value="config2"/>
        <span>Razer</span>
      </label>
      <label class="label cursor-pointer space-x-4">
        <input type="radio" class="radio radio-sm" v-model="liftMode" value="calib2"/>
        <span>Self</span>
      </label>
      <label class="label cursor-pointer space-x-4">
      </label>
    </div>
    <div v-if="hard">
      <button class="btn btn-primary" @click="startCalibration">Start calibration</button>
      <button class="btn btn-error" @click="stopCalibration">Stop</button>
    </div>
    <div v-if="hard">
      Alternatively, press "S" to stop
    </div>
    <span>Retrieved calib data</span>
    <div class="flex flex-row gap-2 items-baseline">
      <input class="input input-bordered input-sm"
        :value="JSON.stringify(retrCalib)"
        @change="(event) => retrCalib = JSON.parse(event.target?.value)"/>
<!--      <button class="btn " v-if="hard" @click="py('list(device.get_sensor_lift_config())').then((r) => {retrCalib = r;})">From Calib</button>-->
      <button class="btn " @click="retrCalib = [0x30, 0x0d, 0x20, 0x02]">Razer</button>
      </div>
    <div>Calculate parameter with</div>
    <div class="grid gap-4 w-full" style="grid-template-columns: max-content 1fr max-content;">
      <div>Lift</div>
      <div class="flex flex-col gap-1">
        <input type="range" min="1" max="10" value="4" class="range" step="1" v-model.lazy.number="lift" />
        <div class="input-label">
          <span v-for="x in [...Array(11).keys()].slice(1)">{{ x }}</span>
        </div>
      </div>
      <div></div>
      <div>Land</div>
      <div class="flex flex-col gap-1">
        <input type="range" min="1" max="10" value="4" class="range" :class="{'input-disabled': !asym}" step="1" v-model.lazy.number="land" :disabled="!asym" />
        <div class="input-label">
          <span v-for="x in [...Array(11).keys()].slice(1)">{{ x }}</span>
        </div>
      </div>
      <label class="flex flex-row gap-1"><input type="checkbox" class="checkbox" v-model="asym"/><span>asym</span></label>
    </div>
    <div class="grid gap-2 items-baseline" style="grid-template-columns: max-content 1fr;">
      <span>Param A</span>
      <input class="input input-bordered input-sm"
        :value="JSON.stringify(paramA)"
        @change="(event) => paramA = JSON.parse(event.target?.value)"/>
      <span>Param B</span>
      <input class="input input-bordered input-sm"
        :value="JSON.stringify(paramB)"
        @change="(event) => paramB = JSON.parse(event.target?.value)"/>
    </div>
    <button class="btn" @click="setParams" v-if="hard">Set params</button>

  </div>
</template>
<style lang="scss" scoped>
.input-label {
  @apply flex w-full justify-between text-xs;
  span {
    @apply w-6 inline-flex justify-center;
  }
}
</style>