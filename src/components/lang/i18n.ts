import {createI18n} from 'vue-i18n';
import {cn} from "../../lib/utils.ts";

// 定义语言包
const messages = {
    en: {
        top_title: 'WebHID Mouse Configurator',
        greeting: 'Hello, {name}!',
    },
    'zh-cn': {
        top_title: 'WebHID 鼠标配置工具',
        greeting: '你好，{name}！',
    },
};

// 创建 i18n 实例
const i18n = createI18n({
    locale: 'zh-cn', // 默认语言
    fallbackLocale: 'zh-cn', // 回退语言
    messages,
});

export default i18n;
