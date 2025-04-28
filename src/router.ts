import {createRouter, createWebHashHistory} from 'vue-router';
import MacroRecorder from "@/components/MacroRecorder.vue";

const routes = [
    {
        path: '/macro-recorder',
        name: 'MacroRecorder',
        component: MacroRecorder,
    },
];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

export default router;