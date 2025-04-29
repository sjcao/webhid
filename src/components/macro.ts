
export enum KeyType {
    KEYBOARD, MOUSE
}

export enum KeyActionType {
    DOWN, UP
}

export interface MacroAction {
    keyName: string;         // 按键值，例如 "a", "Enter" 等
    type: KeyType;        // 按键类型，例如 "key" 表示按键事件，"delay" 表示延迟
    keyCode: number;         // 按键值，例如 "a", "Enter" 等
    action: KeyActionType;      // 按键动作，例如 "press" 或 "release"
    timeStamp: number;      // 下一个按键的延时（可选），单位为毫秒
    isDeleteDelay?: boolean;
}
// 保存 actions 列表到 localStorage
export const saveActionsToLocalStorage = (action: MacroAction[]) => {
    let actionsList = loadActionsListFromLocalStorage();
    actionsList.push(action);
    const actionsListJson = JSON.stringify(actionsList);
    localStorage.setItem('actionsList', actionsListJson);
};

// 保存 actions 列表到 localStorage
export const saveActionsListToLocalStorage = (action: [][]) => {
    const actionsListJson = JSON.stringify(action);
    localStorage.setItem('actionsList', actionsListJson);
};

// 从 localStorage 加载 actions 列表
export const loadActionsListFromLocalStorage = (): any[] => {
    const actionsListJson = localStorage.getItem('actionsList');
    if (actionsListJson) {
        return JSON.parse(actionsListJson);
    }
    return [];
};

