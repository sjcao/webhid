import {createI18n} from 'vue-i18n';
import en from '@/components/lang/en.json'; // 导入英文语言包
import zhCn from '@/components/lang/zh-cn.json'; // 导入中文语言包

// 定义语言包
const messages = {
    en: en,
    'zh-cn': zhCn,
};

// 创建 i18n 实例
const i18n = createI18n({
    locale: 'zh-cn', // 默认语言
    fallbackLocale: 'zh-cn', // 回退语言
    messages,
});

export default i18n;
