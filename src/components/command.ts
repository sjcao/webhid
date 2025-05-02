// 类型定义层
export enum CommandType {
    READ = 0x80,
    WRITE = 0x81
}

export enum ParamType {
    DPI = 0x90,
    BUTTON = 0x91,
    PROFILE = 0x92,
    VERSION = 0xF0,
    WORK_MODE = 0xF1,
    NONE = 0x00
}

export enum ButtonID {
    LEFT = 0,
    RIGHT = 1,
    MIDDLE = 2,
    FORWARD = 3,
    BACKWARD = 4,
    DPI_BUTTON = 5
}

export enum KeyFunctionType {
    MOUSE = 0,
    PROFILE_CHANGE = 1,
    DPI_ACTION = 2,
    WHEEL = 3,
    MULTIMEDIA = 4,
    ALPHANUMERIC = 5,
    FUNCTION_KEY = 6,
    NUMPAD = 7,
    CONTROL_KEY = 8,
    BURST_FIRE = 9,
    COMBO_KEY = 10,
    MACRO = 12
}

// const MouseKeyValue = ['关闭', '左键', '右键', '中键', '后退', '前进']
const MouseKeyValue = {
    
}
const ProfileKeyValue = ['切换板载配置1', '切换板载配置2', '切换板载配置3', '切换板载配置4']
const DPIKeyValue = ['DPI循环', 'DPI+', 'DPI-']
const ScrollKeyValue = ['左滚', '右滚', '上滚', '下滚']
const ConsumerKeyValue= ['亮度+', '亮度-', '播放器', '停止播放', '播放/暂停', '上一首', '下一首', '静音', '音量+', '音量-', '邮件', '主页', '搜索', '刷新', '收藏夹', '网页停止', '网页前进', '网页后退', '计算器', '我的电脑']
const KeyBoardKeyValue = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '!1', '@2', '#3', '$4', '%5', '^6', '&7', '*8', '(9', ')0', 'K', 'L', 'Z']
const FKeyBoardKeyValue= ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']
const NumPadKeyBoardKeyValue = ['/', '*', '-', '+', 'enter', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.']
const ControlKeyBoardKeyValue = ['~`', '_-', '+=', '{[', ']}', ':;', '”’', '<,', '>.', '?/'
    , 'Esc', 'Tab', 'Back Space', 'Enter', 'Space', 'Left Win', 'Right Win'
    , 'Left Ctrl', 'Right Ctrl', 'Left Alt', 'Right Alt', 'Left Shift', 'Right Shift', 'Up'
    , 'Left', 'Down', 'Right', 'Print Screen', 'Scroll Lock', 'Pause', 'Insert'
    , 'Home', 'Delete', 'End', 'Page Up', 'Page Down', 'Caps Lock', 'Num Lock']

enum WorkMode {
    WIRED = 0,
    WIRELESS = 1,
    BLUETOOTH = 2
}

// 工具函数层
const computeCRC = (bytes: number[]): number => {
    const sum = bytes.reduce((acc, val) => acc + val, 0);
    return (0x00 - (sum & 0xff)) & 0xff;
};

const computeDataCRC = (data: number[]): number =>
    data.length ? data.reduce((acc, val) => acc ^ val, 0) : 0;

// 命令生成层
export class MouseCommandBuilder {
    static buildCommand(
        commandType: CommandType,
        paramType: ParamType,
        data: number[] = []
    ): number[] {
        const packet = new Array(17).fill(0);
        packet[0] = 0x09; // Report ID

        // 命令头
        packet[1] = commandType;
        packet[2] = paramType;
        packet[3] = data.length;

        // 填充数据
        data.forEach((val, idx) => packet[4 + idx] = val);

        // 计算数据CRC
        packet[4 + data.length] = computeDataCRC(data);

        // 计算整体CRC
        packet[16] = computeCRC(packet.slice(0, 15));

        return packet.slice(1);
    }

    // DPI设置 (400/800/1600/3200)
    static setDPI(dpi: number): number[] {
        const dpiMap: { [key: number]: number[] } = {
            400: [0x01, 0x90],
            800: [0x03, 0x20],
            1600: [0x06, 0x40],
            3200: [0x0C, 0x80]
        };
        return this.buildCommand(CommandType.WRITE, ParamType.DPI, dpiMap[dpi]);
    }

    //读取dpi
    static readDPI(): number[] {
        return this.buildCommand(CommandType.READ, ParamType.DPI);
    }

    // 按键功能设置
    static setButtonMapping(
        buttonId: ButtonID,
        funcType: KeyFunctionType,
        index: number,
        ...values: number[]
    ): number[] {
        const data = [buttonId, funcType, index, ...values];
        return this.buildCommand(CommandType.WRITE, ParamType.BUTTON, data);
    }

    static readButtonConfig(buttonId: ButtonID): number[] {
        return this.buildCommand(CommandType.READ, ParamType.BUTTON, [buttonId]);
    }

    // 板载配置
    static switchProfile(profileId: number): number[] {
        return this.buildCommand(CommandType.WRITE, ParamType.PROFILE, [profileId]);
    }

    static readProfile(): number[] {
        return this.buildCommand(CommandType.READ, ParamType.PROFILE);
    }

    // 版本信息
    static readVersion(deviceType: 0 | 1): number[] {
        return this.buildCommand(CommandType.READ, ParamType.VERSION, [deviceType]);
    }

    // 工作模式
    static readWorkMode(): number[] {
        return this.buildCommand(CommandType.READ, ParamType.WORK_MODE);
    }
}

// 响应解析层
export class ResponseParser {
    static parse(packet: number[]): [ParamType, any] {
        // 校验数据包完整性
        if (packet.length !== 17 || packet[0] !== 0x09) {
            throw new Error("Invalid packet format");
        }

        // 验证CRC
        const crc = computeCRC(packet.slice(0, 16));
        if (crc !== packet[16]) {
            throw new Error("CRC check failed");
        }

        const commandType = packet[1];
// 根据索引生成对应的HID键值映射
        const generateHIDKeyMapping = (index: number): number[] => {
            const hidKeyMap: { [key: number]: number[] } = {
                0: [0x00, 0x00], // 示例: 索引0对应无操作
                1: [0x01, 0x00], // 示例: 索引1对应HID键值1
                2: [0x02, 0x00], // 示例: 索引2对应HID键值2
                3: [0x03, 0x00], // 示例: 索引3对应HID键值3
                // 可根据实际需求扩展映射
            };

            return hidKeyMap[index] || [0x00, 0x00]; // 默认返回无操作键值
        };

        const paramType = packet[2];
        const dataLength = packet[3];
        const data = packet.slice(4, 4 + dataLength);
        const dataCRC = packet[4 + dataLength];

        // 验证数据CRC
        if (computeDataCRC(data) !== dataCRC) {
            throw new Error("Data CRC mismatch");
        }

        // 分类型解析
        switch (paramType) {
            case ParamType.DPI:
                return [ParamType.DPI, this.parseDPI(data)];
            case ParamType.BUTTON:
                return [ParamType.BUTTON, this.parseButton(data)];
            case ParamType.PROFILE:
                return [ParamType.PROFILE, {profile: data[0]}];
            case ParamType.VERSION:
                return [ParamType.VERSION, this.parseVersion(data)];
            case ParamType.WORK_MODE:
                return [ParamType.WORK_MODE, {mode: WorkMode[data[0]]}];
            default:
                return [ParamType.NONE, {rawData: data}];
        }
    }

    private static parseDPI(data: number[]): { dpi: number } {
        const [high, low] = data;
        const dpiValue = (high << 8) | low;
        return {
            dpi: dpiValue
        };
    }

    private static parseButton(data: number[]): object {
        const [buttonId, funcType, index, ...values] = data;
        return {
            button: ButtonID[buttonId],
            functionType: KeyFunctionType[funcType],
            index,
            values
        };
    }

    private static parseVersion(data: number[]): { type: string; version: string } {
        const type = data[0] === 0 ? 'Mouse' : 'Receiver';
        const versionBytes = data.slice(1);
        return {
            type,
            version: String.fromCharCode(...versionBytes)
                .replace(/\x00/g, '') // 去除填充空字符
        };
    }
}

// 使用示例
// 生成设置DPI 1600的命令
const setDPICommand = MouseCommandBuilder.setDPI(1600);
// console.log('Set DPI Command:', setDPICommand.map(b => b.toString(16).padStart(2, '0')));

// 解析响应数据
const sampleResponse = [0x09, 0x81, 0x90, 0x02, 0x06, 0x40, 0x46, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x58];
// console.log('Parsed DPI Response:', ResponseParser.parse(sampleResponse));

// 生成多媒体按键设置
const mediaCommand = MouseCommandBuilder.setButtonMapping(
    ButtonID.FORWARD,
    KeyFunctionType.MULTIMEDIA,
    2, // 播放器
    0x83, 0x01
);
// console.log('Media Command:', mediaCommand.map(b => b.toString(16).padStart(2, '0')));
