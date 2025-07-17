export enum LooperType {
    MACRO_RECORD_TYPE_PRESS = 0xF0,
    MACRO_RECORD_TYPE_PRESS_DOWN = 0xF1,
    MACRO_RECORD_TYPE_PRESS_DOWN_EVERY = 0xF2,
    MACRO_RECORD_LOOP = 0xF4
}


export enum KeyType {
    KEYBOARD = 2, MOUSE = 1
}

export enum KeyActionType {
    DOWN, UP
}

export interface MacroAction {
    keyName: string;         // 按键值，例如 "a", "Enter" 等
    type: KeyType;        // 按键类型，例如 "key" 表示按键事件，"delay" 表示延迟
    keyCode: number[];         // 按键值，例如 "a", "Enter" 等
    action: KeyActionType;      // 按键动作，例如 "press" 或 "release"
    timeStamp: number;      // 下一个按键的延时（可选），单位为毫秒
    isDeleteDelay?: boolean;
}

export interface SaveMacroAction {
    looperType: LooperType;
    looperTimes: number;
    actions: MacroAction[];
}

// 保存 actions 列表到 localStorage
export const saveActionsToLocalStorage = (action: SaveMacroAction) => {
    let actionsList = loadActionsListFromLocalStorage();
    actionsList.push(action);
    const actionsListJson = JSON.stringify(actionsList);
    localStorage.setItem('actionsList', actionsListJson);
};

// 保存 actions 列表到 localStorage
export const saveActionsListToLocalStorage = (action: SaveMacroAction[]) => {
    const actionsListJson = JSON.stringify(action);
    localStorage.setItem('actionsList', actionsListJson);
};

// 从 localStorage 加载 actions 列表
export const loadActionsListFromLocalStorage = (): SaveMacroAction[] => {
    const actionsListJson = localStorage.getItem('actionsList');
    if (actionsListJson) {
        return JSON.parse(actionsListJson);
    }
    return [];
};


export const calculateTime = (index: number, actions: MacroAction[]): number => {
    if (index === actions.length - 1 || actions.length < 2) return 0;
    const current = actions[index];
    const previous = actions[index + 1];
    let delay = previous.timeStamp - current.timeStamp;
    if (delay > 65535) delay = 65535
    return delay;
};

