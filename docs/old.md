
## 协议

雷蛇的巴蛇v3鼠标：
vid = 0x1532
pid = 0x0099
ifn = 3

四个interfaces：

- 0: endpoint 1 鼠标
  - 5个位，表示按键1-5
  - 11个位，空的
  - hid ac pan横向滚轮，8位
  - wheel，8位
  - X，Y各16位
- 1：endpoint 2 键盘
  - 键盘 id=1
    - E0~E7组合键，8位
    - 任意按键，14个8位
  - consumer control id=2
    - 16位 媒体键
    - 13个8位，空的
  - system control id=3
    - 3位，表示power down, sleep, wake up(0x81~0x83)
    - 5位，空的
    - 14个8位，空的
  - 01 00 id=4
    - 15个8位
  - 01 00 id=5
    - 15个8位
- 2: endpoint 3 键盘
  - E0~E7组合键，8位
  - 任意按键，6个8位
  - LED，output, 3位
  - output，5位空的
- 3: 0x01 0xff00 vendor endpoint4?
  - feature 90个8位 控制信息

鼠标主动发出的信息：
- endpoint 2 id 4:
  - 应该是驱动模式下切换什么东西发的
- endpoint 2 id 5: 应该只在驱动模式下运作
  - 第一个字节为 02 切换 dpi，之后跟四个字节
  - 第一个字节为 39 切换滚动模式，跟一个字节01为自由滚动，00为触觉滚动
  - 第一个字节为 0a 和校准鼠标垫有关系，下一个字节取值有 00 和 02

发控制的信息的时候必须向 interface 3 (endpoint 0)发

主控是 https://www.nxp.com/docs/en/data-sheet/LPC51U68.pdf

这个应该已经过时了： https://github.com/mbuesch/razer/blob/master/librazer/synapse.c#L54

https://gitlab.com/CalcProgrammer1/OpenRGB/-/blob/master/Controllers/RazerController/RazerController/RazerController.h

https://github.com/openrazer/openrazer/blob/master/driver/razermouse_driver.c#L1082

union transaction_id_union
{
    unsigned char id;
    struct transaction_parts
    {
        unsigned char device : 3;
        unsigned char id : 5;
    } parts;
};

union command_id_union
{
    unsigned char id;
    struct command_id_parts
    {
        unsigned char direction : 1;
        unsigned char id : 7;
    } parts;
};

PACK(struct razer_report
{
    unsigned char               report_id;
    unsigned char               status;
    union transaction_id_union  transaction_id;
    unsigned short              remaining_packets;
    unsigned char               protocol_type;
    unsigned char               data_size;
    unsigned char               command_class;
    union command_id_union      command_id;
    unsigned char               arguments[80];
    unsigned char               crc;
    unsigned char               reserved;
});

巴蛇v3有线的 TID 是固定的 0x1f


/* Status:
 * 0x00 New Command
 * 0x01 Command Busy
 * 0x02 Command Successful
 * 0x03 Command Failure
 * 0x04 Command No Response / Command Timeout
 * 0x05 Command Not Support
 *
 * Transaction ID used to group request-response, device useful when multiple devices are on one usb
 * Remaining Packets is the number of remaining packets in the sequence
 * Protocol Type is always 0x00
 * Data Size is the size of payload, cannot be greater than 80. 90 = header (8B) + data + CRC (1B) + Reserved (1B)
 * Command Class is the type of command being issued
 * Command ID is the type of command being send. Direction 0 is Host->Device, Direction 1 is Device->Host. AKA Get LED 0x80, Set LED 0x00
 *
 * */

按键绑定：

01020001010100000000 右键绑左键
0102000e0301008e0000

- 01 保存的位置
  - 02~05 分别为红绿蓝青
- 02 要修改的硬件按键，右键
  - 01 左键
  - 02 右键
  - 03 中键下按
  - 04 侧键后面键
  - 05 侧键前面键
  - 09 滚轮上滚
  - 0a 滚轮下滚
  - 0e 底下键
  - 0f 瞄准键
  - 34 滚轮左拨
  - 35 滚轮右拨
  - 60 滚轮下远键
  - 6a 滚轮下近键
- 00 是否为 hypershift
  - 01 是 hypershift
- 01 按键类型，鼠标，键盘
  - 00 禁用
  - 01 鼠标
  - 02 键盘
  - 03 巨集宏指定次数
  - 04 按下触发宏
  - 05 切换触发宏
  - 06 dpi切换
  - 07 profile切换
  - 09 (新发现) system control
  - 0a 媒体键
  - 0b 双击
  - 0c hypershift切换
  - 0d 键盘turbo
  - 0e 鼠标turbo
  - 0f 序列macro(新发现的)
  - 12 滚动模式切换
  - 此外没有其他按键
- 01 后续域的长度
  - 00 禁用均为 00
- 按键值
  - 鼠标 长度 01
    - 01~05 左键~侧键后面
    - 09,0a 上滚下滚
    - 68,69 滚轮左拨右拨
  - 键盘 长度 02
    - 第一个字节为组合键
      - 01 左 ctrl
      - 02 左 shift
      - 04 左 alt
      - 10 右 ctrl
      - 20 右 shift
      - 40 右 alt
    - 第二个字节为键值
      - 04 A 05 B .. 1D Z
      - 1e 1 .. 26 9 27 0
      - 3a f1 3b f2 .. 45 f12
      - 68 f13 .. 73 f24
      - 等等，应该和 HID Scan code 一致
  - 03 巨集 长度 03
    - 7c c2 可能是巨集地址
    - 第三个字节为次数
  - 04 按下触发 长度 02
    - 7c c2
  - 05 切换触发 长度 02
    - 7c c2
  - 06 dpi切换
    - 长度01: 01 提高等级 02 降低等级 06 向上循环 07 向下循环
    - 长度02: 03 切换到某个等级
    - 长度05：05 临时切换到dpi，瞄准键，接下来四个字节，分别为XY dpi
  - 07 profile 切换 长度 01
    - 长度01：01 下一个不循环 02 上一个不循环 04 下一个循环 05 上一个循环
    - 长度02: 03 指定 profile
  - 09 (新发现) id=3的 system control，一个字节
  - 0a 媒体键 长度 02
    - 2个字节和 HID consumer control 的 usage code 相同
  - 0b 双击 长度 01 应该和鼠标的一致
  - 0c hypershift 切换 长度 01 值 01
  - 0d 键盘turbo 长度04 两个字节是键盘值，两个字节是 turbo 信息，延时毫秒
  - 0e 鼠标turbo 长度03 一个字节是键盘，两个字节是 turbo 信息
    - turbo 信息 7cps -> 8e, 9cps->6f，两个相乘=1000
    - 即为每次延迟的毫秒数
  - 12 滚动模式切换 长度 01 值 01

固件不知道是怎么运作的，有从固件升级器里面提取出的，但是很难分析，就不分析了

ROG 不给固件升级程序，坏坏，奥创 Armory Crate 组成太复杂了，也不好分析，而且第一次升级的时候还忘记抓包了。所以 ROG Strix Scope II RX 没固件（过时了，现在已经拿到固件升级了）

命令 0680 068e，class 06 可能和宏有关系，因为 0608 和060c在写入宏的时候用了
0680 068e 都是读取命令，0680读取两个字节，068e读取14个字节，068e命令写入profile以后有的地方变小，难道和存储空间有关？

例如，读取结果：
0064 00 0168 0000 0167 0000 0004 00
猜测：0064: 100 存储空间可用百分比
猜测：0168：总页面数 0167 空闲页面数 0004 用过的页面数？

0502 是增加 profile
0503 是删除 profile

雷蛇发送命令的程序是 razer synapse service `C:\Program Files (x86)\Razer\Synapse3\Service\Razer Synapse Service.exe`

发送命令的 DLL 可能是 `C:\ProgramData\Razer\Synapse3\Service\Bin\Devices\Mw`，里面有和 PID 对应的 DLL，还有产生的日志，所以命令的含义可以理解了
日志里面有 Daria 文件夹和外层文件夹中 RSy3_ (可能是 Razer Synapse 3 之意) 开头的 dll 文件引用，估计是一起运作的。RSy3开头的是 .NET C++ 的，而 RzCtl 的是 MSVC C++ 的。

macro我测试存了39个，估计还可以存更多

借助日志输出的信息，命令：

- 068e: storageinfo，0x0168为页数，每页256字节，依次为总页数，可用页数，回收页数
  - 0064000168000000b10000006e00
  - ????--tttt----aaaa----rrrr--
- 0086  DeviceConfig_DeviceStatus，先用长度3，后面用长度2，并等待返回 OK 长度3的
- 0b03: surfacecal sensor_state: 参数为 0004(01/00)，01代表启用校准，00禁用
- 0b0b: surfacecal sensor_liftsetting
  - 参数为 0004 aa bb：
  - 1mm -> 0100 2mm -> 0101 3mm -> 0102
  - land1lift2 -> 0200 , l1l3-> 0201, l2l3 -> 0202
  - 0300 -> 使用 lift config 0400 -> 使用 lift to track 和 track to lift 02
  - 0500 -> 自己校准的
- 000e(2): set polling rate (profile)
- 0087(4): get firmware version (01020000)
- 058a(1): 可能是获取总的 profile 数量
- 0580(1): 获取当前有的 profile 数量
- 0581(3): 可能是profile有几个，然后哪个可用050102
- 0588(69): 读取profile信息，profile序号，2字节地址，2字节总大小00fa，64字节内容
- 0680(2): 获取 macro 数量
- 068b(6): 获取 macro 的序号 xxxx yyyy zzzz zzzz：x是偏移量，y是总数量，然后有 x 个 z 是每个宏的id，每个两字节
- 068c(70): 获取 macro 内容，前两个字节是 id，然后两个字节偏移量，返回两字节总大小00fa，64字节内容

- 0f82(12): 读取 extended_matrix_effect_base
- 0f80(50): 也是和 rgb 灯光有关
- 0b05/0b85(10): lift configuration，0004xxx他雷蛇里面自带的好几个都一样是20 30 15 08 15 05 0F 0A (00 00 70 0D 08 00 00 00)，还有的是 30 20 0D 08 0D 05 0F 0F
- 0b09(4): sensor state 校准的时候用的 0004 0000 开始 0004 0001 结束，产生 id=5 的 endpoint 2 的消息
  - 结束的时候，产生050a02表示错误了，050a01表示正确了
- 0b0c(7): lift to track
- 0b0d(10): track to lift
- 0603(2): 新建 macro,或修改 macro 参数为 macro id
- 0608(6) : 应该是 设置 macro 内容长度 macroid 2字节 长度 4字节
- 060a/068a(6) : reset_flash
  - 写入 0000 0002 0000 读出 0000 0202 0000
- 0609 set_macro_funciton: ID(2), start(4), length(1), data(length)

宏的格式
宏 info 信息可有可无，就是名字、序号等等。首先是16字节序号，然后4字节不知道是啥，然后是名称字符串，然后就不知道是啥了
宏的 function：
- 0104 按下A
- 0204 松开A
- 0105 0205 B
- 1203e8 延时1s (1000ms)
- 0106 0206 C
- 1178 延时 0.12s (120ms)

- 鼠标的是组合形式，每一位代表一个按键
- 08 01 左键按下
- 08 00 没有
- 08 10 鼠标5按下
- 应该是 左右中45
- 滚动 0a 01 上 0a ff 下，左右滚动应该不能存进去，因为左右滚动它存的是没有

序列 macro，按键绑定的类是 0x0f，每次执行两个操作，一个按下一个松开。

其他宏的 function 可用的码：

- 0301 电脑电源按钮(system control)，03开头的是 hid endpoint 02 的 id=03 的 report
- 0401 和 0301 一样
- 050101或060101 发送 020101，就是 consumer control

- 01: 键盘按下
- 02: 键盘松开
- 03/04: system
- 05/06: consumer
- 07: -
- 08: 鼠标
- 09: -
- 0a: 滚轮
- 11: 延时1
- 12: 延时2


鼠标垫校准

所有的鼠标垫传输的信息是一样的

自带鼠标垫的信息总结：
https://github.com/openrazer/openrazer/issues/783
在 mmdatav4.ini 中

对称信息：
3和5一样
   -  +  +  0  +  -  -  -
1: 30 20 0D 08 0D 05 0F 0F
2: 2C 20 0F 08 0F 05 0F 0D
3: 28 20 11 08 11 05 0F 0A
4: 24 20 13 08 13 05 0F 0A
5: 20 30 15 08 15 05 0F 0A
6: 1C 30 17 08 17 05 0F 08
7: 18 38 19 08 19 00 0E 08
8: 14 38 1B 08 1B 00 0E 08
9: 10 38 1D 08 1D 00 0E 08
10:0C 38 20 08 20 00 0E 08

非对称信息：
着陆短的
前三字节和上下一样
三、四字节一样
最后字节和上下最后字节一样
1: 30 20 0D 0D 0F
2: 2C 20 0F 0F 0D
3: 28 20 11 11 0A
4: 24 20 13 13 0A
5: 20 30 15 15 0A
6: 1C 30 17 17 08
7: 18 38 19 19 08
8: 14 38 1B 1B 08
9: 10 38 1D 1D 08
10:0C 38 20 20 08

抬升长的
1: 30 20 0D 88 0D 05 0F 0F
2: 2C 20 0F 88 0F 0F 0F 0D
3: 28 20 11 88 11 0F 0F 0A
4: 24 20 13 88 13 0F 0F 0A
5: 20 30 15 88 15 0F 0F 0A
6: 1C 30 17 88 17 0F 0F 08
7: 18 38 19 88 19 00 0E 08
8: 14 38 1B 88 1B 00 0E 08
9: 10 38 1D 88 1D 00 0E 08
10:0C 38 20 88 20 00 0E 08

校准返回值：

荷叶鼠标垫
21 03 30 03( 00 00 00 00 00 00 00 00 09 00 00 00)
28: 1F 30 06 0A 0D, 10 38 18 88 18 00 0E 08
27: 12 38 15 88 15 00 0E 08

光面桌子
23 03 30 03( 00 00 00 00 00 00 00 00 09 00 00 00)
28: 20 30 06 0A 0D, 10 38 18 88 18 00 0E 08
27: 20 30 06 0A 0D, 13 38 15 88 15 00 0E 08

第二次
26 03 30 03
38: 20 30 09 0A 0A, 11 38 18 88 18 00 0E 08

荷叶第二次
1e 03 30 03
38: 1A 30 09 0A 0A, 0F 38 18 88 18 00 0E 08

第三次
20 03 30 03
38: 1B 30 09 0A 0A, 0F 38 18 88 18 00 0E 08

抬得很高
10 03 30 03

猜的算法：

mag 是 1 代表非对称，0是对称
1. ttl0:
   =calculatemouse0thing(lift, mouse0)
   =round(m0 - (m0-8.0)/10.0*(lift-1))
2. ttl1:
   lift < 5: ttl1 = mouse2
   else: `[0,0,0,0,30,30,38,38,38,38][lift-1]`
3. ttl2:，用 calc2计算
   - calc2 是
     ```
     i2 = (lift-1)*m3+m1
     d3 = i2 + 2**32 if i2 < 0 else 0
     round(d3)
     ```
4. ttl3: mag是1， 0x88 else 8
5. ttl4: 等于ttl2,但 小于10(0x0a)则设置为10
6. ttl5: 如果
   - magic 是1 `[5, f, f, f, f, f, 0, 0, 0, 0] [lift-1]`
   - magic 非1 `[5, 5, 5, 5, 5, 5, 0, 0, 0, 0] [lift-1]`
7. ttl6:`[10, f, f, f, f, f, f, e, e, e, e] [lift]`
8. ttl7: `[f, d, a, a, a, 8, 8, 8, 8, 8][lift-1]`

9. ltt0: =calcmouse0(land, mouse0)
10. ltt1: =calc3land(land,mouse2)
   - land < 5 then mouse2
   - else`[0,0,0,0,30,30,38,38,38,38][land-1]`
11. ltt2: calc2val
   - calc2(land, mouse1, mouse3)
12. ltt3:
   - calclimit:
   - if ltt2>9 then ltt2 else 10
13. ltt4: 
   - (2, m1, land)
   - `[f, d, a, a, a, 8, 8, 8, 8, 8][land-1]`

鼠标返回的数据含义

一二字节
ff ff: 非常近，近到里面
80 ff: 非常近
a0 a0: 一般
ff 00: 挺远的
00 ff: 挺远的
ff 80: 挺远的
80 80: 挺远的
00 00: 挺远的

剩下几个就是 03 30 03，不知道啥意思

计算的数据含义：
- ttl0: 触发阈值，值越大，触发范围越短
  - lift = 1 时,ttl0 = m0
  - lift = 2 时,ttl0 = 0.9m0 + 0.8
  - lift = 3 时,ttl0 = 0.8m0 + 1.6
  - lift = 11 时, ttl0 = 8
  - m0 固定，则 m0 越大（近），斜率越大，lift越低时值越高
  - m0 = 0x10 时，为 16.8 - 0.8 lift
  - m0 = 0x20 时，为 34.4 - 2.4 lift
  - 必过 (11, 8)
- ttl1: 也是触发阈值，越大触发范围越短
- ttl2: 越大越远，越小越近
- 后面的也不知道是啥

自带鼠标垫的校准信息相当于:
30 0d 20 02

相关性：
|  x | m0 | m1 | m2 | m3 | lift | land |
|  - | -- | -- | -- | -- | ---- | ---- |
| t0 |  + |    |    |    |    - |      |
| t1 |    |    | ?+ |    |    + |      |
| t2 |    |  + |    |  + |    + |      |
| t3 |    |    |    |    |      |      |
| t4 |    |  + |    |  + |    + |      |
| t5 |    |    |    |    |    x |      |
| t6 |    |    |    |    |    - |      |
| t7 |    |    |    |    |    - |      |
| l0 |  + |    |    |    |      |    - |
| l1 |    |    | ?+ |    |      |    + |
| l2 |    |  + |    |  + |      |    + |
| l3 |    |  + |    |  + |      |    + |
| l4 |    |    |    |    |    - |      |

RGB 的协议：

涉及的命令为：

0f02 extended_matrix_effect_base
0f03 inity_effect_static
0f04 extended_matrix_brightness

只有 0f02 (应该也有0f04) 操控板载 rgb

命令类型：

00 设备模式、序列号、回报率等基础的
02 绑定按键、滚轮模式
04 dpi
05 profile
06 macro, flash
0b sensor calibration
0f 灯光

010003012800 rgb循环

雷蛇的软件不设置，我不知道。我按 openrazer 总结出的命令实现：

profile, region id, effect_id, 模式（方向），速度，颜色数n, 3*n 的颜色

effect id:
- 0: 熄灭
- 1: 静态
  - 颜色: 静态
- 3: spectrum
- 4: wave
  - 模式：0静止 1 俯视顺时针 红绿蓝 2 逆时针蓝绿红
  - 速度：0快一秒好几次 0x30 大概1.2s ff慢大概6s
- 8:  custom

region id:
- 0: 所有
- 1: 滚轮
- 4：logo
- a: 底带的所有灯

0f04: profile, region id, 00关闭 ff最亮

0f03 的前两个字节我测试没有用，不知道是做什么用的，也不能保存，不是 profile。

## UI 设计

- 鼠标信息侧边栏，切换 profile
- 日志和手动发送消息下边栏
- 基本设置：滚轮、dpi和polling rate
- 按键设置：
  - 选择按键列表
  - 选择功能类型、功能等
- 巨集设置：
  - 选择巨集列表，添加删除，设置id，重命名
  - 按键序列列表，添加删除
- 校准设置：
  - 开始校准并获取数据
  - 获取的数据
  - asym lift land 设置
  - 计算的校准信息
- 灯光设置

flash 假满的时候, available 满，recycled可能还有，雷蛇软件会执行碎片整理，就是先把宏、profile信息什么的都读到电脑里，然后format storage，之后重新设置。

## 雷蛇默认设置

```yaml
{
  basic:
    {
      scrollMode: tactile,
      scrollAcceleration: false,
      scrollSmartReel: false,
      pollingRate: 1,
      dpiXy: [ 1600, 1600 ],
      dpiStages:
        [
          [
              [ 400, 400 ],
              [ 800, 800 ],
              [ 1600, 1600 ],
              [ 3200, 3200 ],
              [ 6400, 6400 ]
            ],
          3
        ]
    },
  button:
    {
      aim_hypershift: [ dpi_switch, { fn: aim, dpi: [ 400, 400 ] } ],
      left_hypershift: [ mouse, { fn: left, double_click: false } ],
      middle_hypershift: [ mouse, { fn: middle, double_click: false } ],
      right_hypershift: [ mouse, { fn: right, double_click: false } ],
      forward_hypershift: [ mouse, { fn: forward, double_click: false } ],
      wheel_up_hypershift: [ mouse, { fn: wheel_up, double_click: false } ],
      middle_forward_hypershift: [ scroll_mode_toggle, { fn: 1 } ],
      wheel_left_hypershift: [ mouse, { fn: wheel_left, turbo: 20 } ],
      backward_hypershift: [ mouse, { fn: backward, double_click: false } ],
      wheel_down_hypershift: [ mouse, { fn: wheel_down, double_click: false } ],
      middle_backward_hypershift: [ dpi_switch, { fn: next_loop } ],
      wheel_right_hypershift: [ mouse, { fn: wheel_right, turbo: 20 } ],
      bottom_hypershift: [ profile_switch, { fn: next_loop } ],
      aim: [ dpi_switch, { fn: aim, dpi: [ 400, 400 ] } ],
      left: [ mouse, { fn: left, double_click: false } ],
      middle: [ mouse, { fn: middle, double_click: false } ],
      right: [ mouse, { fn: right, double_click: false } ],
      forward: [ mouse, { fn: forward, double_click: false } ],
      wheel_up: [ mouse, { fn: wheel_up, double_click: false } ],
      middle_forward: [ scroll_mode_toggle, { fn: 1 } ],
      wheel_left: [ mouse, { fn: wheel_left, turbo: 20 } ],
      backward: [ mouse, { fn: backward, double_click: false } ],
      wheel_down: [ mouse, { fn: wheel_down, double_click: false } ],
      middle_backward: [ dpi_switch, { fn: next_loop } ],
      wheel_right: [ mouse, { fn: wheel_right, turbo: 20 } ],
      bottom: [ profile_switch, { fn: next_loop } ]
    },
  led:
    {
      effect_wheel: [ spectrum, 0, 0, [] ],
      brightness_wheel: 178,
      effect_logo: [ spectrum, 0, 0, [] ],
      brightness_logo: 178,
      effect_strip: [ spectrum, 0, 0, [] ],
      brightness_strip: 178
    }
}
```
