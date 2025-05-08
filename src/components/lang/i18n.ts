import {createI18n} from 'vue-i18n';
import en from '@/components/lang/en.json'; // 导入英文语言包
import zhCn from '@/components/lang/zh-cn.json'; // 导入中文语言包

// 定义语言包
const messages = {
    en: en,
    'zh-cn': zhCn,
};

const savedLocale = (localStorage.getItem('user-locale') as "zh-cn" | "en") || 'zh-cn';

// 创建 i18n 实例
const i18n = createI18n({
    locale: savedLocale, // 默认语言
    fallbackLocale: 'zh-cn', // 回退语言
    messages,
});


// 从 localStorage 中获取用户上次选择的语言，如果不存在则使用默认语言 'zh-cn'
// 动态切换语言并保存到 localStorage
export function switchLanguage() {
    i18n.global.locale.value = i18n.global.locale.value === 'zh-cn' ? 'en' : 'zh-cn'
    localStorage.setItem('user-locale', i18n.global.locale.value); // 保存到 localStorage
}


export default i18n;
