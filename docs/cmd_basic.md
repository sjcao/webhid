# 基本命令列表

包含基本信息获取、滚轮、回报率和 DPI 几个部分。

命令以一个2字节数字表示，对应 openrazer 结构体定义里面的 command_class 和 command_id 两个部分。

第二个字节为 command_id，其最高位是1为读命令，是0为写命令。

其中「读取参数长度」意思是读取的时候，需要传的参数，例如 Profile 编号。

「数据参数长度」意思是写入数据时要额外传的参数长度，或者是读取出来的数据部分有多长。例如滚轮状态、dpi 数值等

相关代码位于： [qdrazer/device.py](../public/py/qdrazer/device.py) 

## 基本系统信息

### get_serial

| 读命令 | 写命令 | 读取参数长度 | 数据参数长度 |
| ------ | ------ | ------------ | ------------ |
| 0x0082 | -      | 0            | 16           |

获取鼠标的序列号，返回的数据编码应该是 ASCII，剩余的地方用空字符(数值为0)填充，例如 `PM2405Hxxxxxxxx` (我的鼠标是这个格式，x代表一位数字)

### get_firmware_version

| 读命令 | 写命令 | 读取参数长度 | 数据参数长度 |
| ------ | ------ | ------------ | ------------ |
| 0x0081 | -      | 0            | 4?           |

获取鼠标固件的版本，我不知道这个版本有几个字节，但是它是每个字节（无符号整数）表示版本号里面的一个部分。

推测版本号是3或4个字节长，例如 1.2.0.0 就是 `01 02 00 00`。

### get_device_mode

| 读命令 | 写命令 | 读取参数长度 | 数据参数长度 |
| ------ | ------ | ------------ | ------------ |
| 0x0084 | 0x0004 | 0            | 2            |

读取或设置鼠标的状态，参数长度2个字节，第一个字节含义如下表，第二个字节含义不明，设置为0应该没有关系。

| 数值 | 含义 |
| ---- | ---- |
| 0x00 | 正常模式，没有雷蛇驱动的话，就是这个模式 |
| 0x01 | 进入 bootloader |
| 0x02 | 不知道，openrazer 里面说是测试模式 |
| 0x03 | 驱动模式 |

驱动模式下，鼠标切换设置时会返回一些信息，其他功能我不清楚。雷云软件开启的时候会每次都把鼠标切换成驱动模式

### get_flash_usage

| 读命令 | 写命令 | 读取参数长度 | 数据参数长度 |
| ------ | ------ | ------------ | ------------ |
| 0x068e | -      | 0            | 14           |

获取当前 flash 存储的使用情况。数据参数是一个2字节无符号整数和3个4字节无符号整数。

第一个数据参数含义不明，我的鼠标值为 0x0064。之后三个整数分别为 flash 总字节数，空闲字节数(available)和回收的字节数(recycled)。

解释详见基本信息的文档。

### wait_device_ready

| 读命令 | 写命令 | 读取参数长度 | 数据参数长度 |
| ------ | ------ | ------------ | ------------ |
| 0x0086 | -      | ?            | 0            |

雷蛇的软件使用这个命令状态返回 OK 与否，判断鼠标是已经准备好了还是没有。

### reset_flash

| 读命令 | 写命令 | 读取参数长度 | 数据参数长度 |
| ------ | ------ | ------------ | ------------ |
| 0x068a | 0x060a | 0            | 6            |

重置（格式化）flash，清除所有的 macro，把 flash 每一块都设置成 available。过程是：

先发送 0x060a，参数 0000 0002 0000

再发送 0x068a，参数 0000 0002 0000，然后查看返回的参数，如果是 0000 0202 0000，证明重置完成了。如果没有完成，那就重新读一遍，检测返回参数。

## 滚轮

### get_scroll_mode

| 读命令 | 写命令 | 读取参数长度 | 数据参数长度 |
| ------ | ------ | ------------ | ------------ |
| 0x0214 | 0x0294 | 1(profile)   | 1            |

读取或设置滚轮模式，巴蛇V3的滚轮是可以切换的，有两种模式，分别为 freespin (无阻力/自由转动/解锁)，tactile（有阻力，是一格一格的滚动/锁定）。

数据参数代表模式，0是 tactile，1是 freespin

这个命令和下面的一些命令，都有一个字节的读取参数，也就是说读取的时候（或写入的时候）最前面要传入一个字节的参数，参数含义是 profile 编号，之后不再赘述。

巴蛇V3鼠标板载内存中可以存5个 profile，分别是白/红/绿/蓝/青，编号分别为 1~5。读取的时候，会读取对应 profile 里的设置。

此外还有一个特殊的 profile 编号，我叫作 direct，编号为0。编号为0的话，设置立即生效，鼠标断电就会重置，不会保存到板载内存中。

### get_scroll_acceleration

| 读命令 | 写命令 | 读取参数长度 | 数据参数长度 |
| ------ | ------ | ------------ | ------------ |
| 0x0296 | 0x0216 | 1(profile)   | 1            |

读取或设置滚轮加速度，开启以后，滚轮滚得快的时候，会增加滚动的量。

1字节参数 0 为禁用，1 为启用。

### get_scroll_smart_reel

| 读命令 | 写命令 | 读取参数长度 | 数据参数长度 |
| ------ | ------ | ------------ | ------------ |
| 0x0296 | 0x0216 | 1(profile)   | 1            |

读取或设置 smart reel（智能切换滚轮模式），开启以后，滚轮滚得快的时候，会自动切换成无阻力模式，停止的时候又会切换回来。

1字节参数 0 为禁用，1 为启用。

## 性能

包括回报率和DPI

### get_polling_rate

| 读命令 | 写命令 | 读取参数长度 | 数据参数长度 |
| ------ | ------ | ------------ | ------------ |
| 0x008e | 0x000e | 1(profile)   | 1            |

回报率，就是鼠标一秒发送多少次移动/按键事件。

数据参数是一个字节，是一个无符号整数。这个是两次发送事件之间的间隔，单位是毫秒。例如，回报率是1000Hz，则该值是1；125Hz，则该值是8。这个值经我测试，1~255都有效，如果特别大，鼠标就会特别卡顿，但是仍然可以正常工作。

### get_dpi_xy

| 读命令 | 写命令 | 读取参数长度 | 数据参数长度 |
| ------ | ------ | ------------ | ------------ |
| 0x008e | 0x000e | 1(profile)   | 6            |

当前鼠标的 DPI，除了这个以外，还有一个设置 dpi stages 的命令。这个是直接设置当前的 DPI，和 dpi stages 没关系。

数据参数长度为6，前4个字节分别为2个16位无符号数（都是大端 big endian），而后2个字节没有用，可以设置为0。两个无符号数分别为 dpi X 和 Y 方向的值。单位就是 DPI。它的范围最小是50，再小的话实际 dpi 就会变成一个很大的固定值。最大范围我不知道，大概是25000/25600吧。

### get_dpi_stages

| 读命令 | 写命令 | 读取参数长度 | 数据参数长度 |
| ------ | ------ | ------------ | ------------ |
| 0x0486 | 0x0406 | 1(profile)   | 1(active) + 1(length) + 7*5 |

读取或者设置可以切换的 DPI 等级列表。设置了以后可以把按键绑定成切换 DPI 按键，使用的就是这个列表。

数据参数 active 表示当前正在使用的是哪个等级，length 表示后面的列表一共有几项，最后的7*5是5个等级的数值。

这个鼠标最多可以存5个 DPI 等级，如果 length 少于5个，后面多余的地方可以填0。每一项是7个字节：

- 首先是1字节的序号，这个信息我感觉是多余的，但是使用的时候就按照0, 1, 2, 3, 4 这样编号就可以了
- 其次6个字节，格式和上面的 get_dpi_xy 是相同的

