# Basilisk V3 USB HID 协议逆向基本信息

这是一篇比较详尽的逆向工程成果文档，涵盖了雷蛇的雷云软件和雷蛇 Basilisk V3 有线版鼠标通信的 HID 协议。使用这些知识可以编程修改该鼠标滚轮、DPI、回报率、按键绑定、配置方案(profile)、宏(macro)、灯光、校准信息等。

协议大部分是我使用 Wireshark 抓包和观察雷蛇软件日志分析出来的。小部分信息（如报文格式）借鉴了 openrazer 和 OpenRGB 项目。

雷蛇巴蛇V3有线版

<https://cn.razerzone.com/gaming-mice/razer-basilisk-v3>

命令列表：

- [基本命令](./cmd_basic.md)
- [Profile 命令](./cmd_profile.md)
- [按键设置命令](./cmd_button.md)
- [LED 命令](./cmd_led.md)
- [Macro 命令](./cmd_macro.md)
- [传感器命令](./cmd_sensor.md)

## USB HID 设备

该鼠标的 VID = 0x1532，和雷蛇的很多设备是一样的。 PID = 0x0099

固件版本是 1.2.0

HID 的各种按键码可以在这里查：<https://usb.org/document-library/hid-usage-tables-15>

鼠标的 USB HID 设备有4个 interface，分别是：

- interface 0: 对应 endpoint 1，是鼠标设备
  - 发送 input report，格式是：
    - 5个位，表示按键1-5 （左右中、两个侧键）
    - 11个位，空的，为了补全2字节
    - hid ac pan，就是横向滚轮，8位有符号数表示滚轮滚了几格
    - wheel，纵向滚轮，8位
    - 鼠标指针位移 X，Y各16位
- interface 1：endpoint 2 可以发送5种 report，分别为 id=1~5，以下：（长度均为15字节）
  - 键盘 id=1
    - HID 按键码为 E0~E7 的组合键(Ctrl, Shift等)，8位
    - 任意按键，每个字节为一个按键码，共14个8位
  - consumer control id=2
    - 16位 媒体键（USB HID 有文档可以看每个键对应什么）
    - 13个8位，空的
  - system control id=3
    - 3位，表示power down, sleep, wake up(0x81~0x83)
    - 5位，空的
    - 14个8位，空的
  - 01 00 id=4
    - 15个8位，用途见下方说明
  - 01 00 id=5
    - 15个8位，用途见下方说明
- interface 2: endpoint 3 键盘，应该符合一个 boot 键盘
  - input report
    - E0~E7组合键，8位
    - 任意按键，6个8位
  - output report
    - LED，output, 3位（对这个鼠标没有用）
    - output，5位空的
- interface 3: endpoint4?
  - usage page=0xff00, usage id=0x01 在表格上为 vendor-defined
  - feature report 90个8位 控制信息
  - 这个 interface 是传输大部分雷蛇驱动发出的信息的，包括其他文档中涉及的命令等

鼠标主动发出的信息 input report（只在驱动模式下发出，普通模式下没有）：
- endpoint 2 id 4:
  - 应该是驱动模式下切换什么东西发的
- endpoint 2 id 5: 应该只在驱动模式下运作
  - 第一个字节为 02 切换 dpi，之后跟四个字节，分别为2字节当前 dpi X，2字节当前 dpi Y
  - 第一个字节为 39 切换滚动模式，跟一个字节01为自由滚动，00为触觉滚动
  - 第一个字节为 0a 和校准鼠标垫有关系，下一个字节取值有 00, 01 和 02
    - 00 表示校准开始，01表示校准成功，02表示校准失败

其他文档中涉及的命令，都是向 interface 3 发送的 feature report。

## Feature report 报文格式

之前一些项目，如 openrazer 的分析中有雷蛇的报文格式：<https://github.com/openrazer/openrazer/blob/master/driver/razercommon.h>

具体定义如：

```
struct razer_report {
    unsigned char status;
    union transaction_id_union transaction_id; /* */
    unsigned short remaining_packets; /* Big Endian */
    unsigned char protocol_type; /*0x0*/
    unsigned char data_size;
    unsigned char command_class;
    union command_id_union command_id;
    unsigned char arguments[80];
    unsigned char crc;/*xor'ed bytes of report*/
    unsigned char reserved; /*0x0*/
};
```

对于该鼠标来说，具体实践中，每次都是电脑主动发送 set_report，鼠标被动接收；或是电脑主动发送 get_report，鼠标返回上一个命令执行的状态。

发送接收过程不赘述，因为其他人已经分析过了。

巴蛇v3有线的 transaction_id 是固定的 0x1f。

发送，接收报文的代码在 [basilisk_v3/device.py](../public/py/basilisk_v3/device.py) 中。

这里只列出我分析的所有命令列表、参数、功能：

## Flash 存储器管理机制

该鼠标有 360 * 256 字节 (90KiB) 的 Flash 存储器，应该是 每 256 字节为一页，共有 360 页。

Flash 存储器用处是存储 macro，还有好像 profile 也会占用 flash 存储器。

Flash 是按页写入的、随机读取的。擦除的时候是按页擦除的。但是鼠标的实现是：擦除后的页面不能再次利用(进入 recycled 池)，必须要执行全部格式化的操作以后才能重新写入。

以上过程，即：available -写入-> used -擦除-> recycled -格式化-> available

新建 macro 时，只会使用 available 类型的页面，如果没空间了，则会写入失败。此时如果还有 recycled 的页面，雷蛇软件会格式化 flash，并且重新写入一遍之前已经存的所有数据（就是垃圾回收或碎片整理）。
