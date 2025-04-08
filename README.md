
# Razer Quick&Dirty HID

Changes configuration of Razer Basilisk V3 with analyzed reverse-engineered protocol. The project doesn't use proprietary code in Razer Synapse software. It uses python with [libusb/hidapi](https://github.com/libusb/hidapi) to communicate with the mouse, so it's cross-platform.

The implementation is easy, and its main functionality is to be able to bind mouse buttons with on board memory, and can read and alter macros, which other softwares haven't implemented.

The project borrows some definitions and command values from [CalcProgrammer1/OpenRGB](https://gitlab.com/CalcProgrammer1/OpenRGB) and [openrazer](https://github.com/openrazer/openrazer), but other than that, it doesn't use any code from those projects.

更改 Razer Basilisk V3 (雷蛇巴蛇V3) 鼠标配置，使用抓包分析到的协议，没有借助雷蛇任何软件的代码。使用 Python 调用 [libusb/hidapi](https://github.com/libusb/hidapi) 通信，可跨平台使用。实现比较简单，主要是可以更改按键功能，可以读取和修改宏（巨集），其他开源软件没有实现。

借鉴了 [CalcProgrammer1/OpenRGB](https://gitlab.com/CalcProgrammer1/OpenRGB) 和 [openrazer](https://github.com/openrazer/openrazer) 的函数名、命令数值等，但是完全没有使用那些代码。

## 使用方法 / Usage method

Front-end application:

Written with Vue.js. You can use Node.js to `npm install` and run `npm run dev` to launch development server. Or you can directly visit public site under GitHub descriptions.

Python backend:

It's located in [py directory](./public/py/), and it can be used independent of front-end part.

You should download [libusb/hidapi](https://github.com/libusb/hidapi), put it in a place python can detect, then use pip to install <https://pypi.org/project/hid/>.

前端应用：

使用 Vue 编写。使用 Node.js `npm install` 以后，使用 `npm run dev` 启动开发服务器，即可使用。或直接访问 GitHub 简介下方的网址。

Python 后端：位于 [py 目录](./public/py/)中，可以独立运行。

下载 [libusb/hidapi](https://github.com/libusb/hidapi)，放到 Python 可以加载的位置。使用 pip 安装 <https://pypi.org/project/hid/>。

## 协议逆向文档 / Reverse-engineer documentation

The protocol and command list analyzed is [this documentation](./docs/basic-en.md).

My native language is Chinese so it was [originally written in Chinese](./docs/basic.md) and translated to English with [豆包](https://www.doubao.com/). It may contain mistakes and bad formatting, it is advised that you can use a webpage translator and compare that version with this version, or just request me to clarify it directly in the issues section.

分析出的协议和命令列表见[协议逆向文档](./docs/basic.md)

### AI 总结 / AI Summary

协议逆向文档都说了个啥么，让 AI 总结一下：

这几篇文章围绕雷蛇Basilisk V3有线版鼠标的USB HID协议展开，详细介绍了相关命令及其参数，可用于对鼠标的各种功能进行编程修改。具体内容如下：
1. **《basic.md》**
    - **整体介绍**：介绍了对雷蛇Basilisk V3鼠标USB HID协议逆向工程的成果，涵盖与雷云软件通信的协议内容，包括如何获取及修改鼠标滚轮、DPI、回报率等多种设置。
    - **USB HID设备信息**
        - 鼠标的VID为0x1532，PID为0x0099，固件版本1.2.0，介绍了其4个接口的功能及输入输出报告格式。
        - 鼠标主动发送信息的input report在驱动模式下的相关情况，以及不同endpoint下的具体行为。
        - Feature report报文格式及相关结构体定义，说明电脑与鼠标间的命令发送接收方式及该鼠标的transaction_id。
    - **Flash存储器管理机制**：介绍鼠标的Flash存储器（360×256字节）的用途、读写擦除方式以及存储管理流程（available -写入-> used -擦除-> recycled -格式化-> available）。
2. **《cmd_basic.md》**
    - **基本命令列表**：介绍基本命令，包括基本信息获取、滚轮、回报率和DPI几个部分。每个命令用一个2字节数字表示，详细说明了每个命令的读/写命令字节、读取参数长度和数据参数长度，并给出相关示例。
    - **基本系统信息命令**
        - 如`get_serial`获取鼠标序列号，`get_firmware_version`获取固件版本，`get_device_mode`读取或设置鼠标状态等。
        - 还介绍了获取flash存储使用情况、判断鼠标是否准备好以及重置flash等命令。
    - **滚轮相关命令**：包括`get_scroll_mode`（读取或设置滚轮模式）、`get_scroll_acceleration`（读取或设置滚轮加速度）和`get_scroll_smart_reel`（读取或设置智能切换滚轮模式）。
    - **性能相关命令**：涵盖`get_polling_rate`（获取回报率）、`get_dpi_xy`（获取当前DPI）和`get_dpi_stages`（读取或设置可切换的DPI等级列表）。
3. **《cmd_button.md》**
    - **按键设置命令**：主要介绍`get_button_function`命令，用于读取或设置按键功能。
    - **命令参数说明**
        - 读取参数包括profile编号、鼠标按键编号和是否为hypershift下的功能。
        - 数据参数代表按下硬件按钮后触发的软件功能，详细介绍了功能类别（如禁用、鼠标类、键盘类、宏等）及其对应的数据格式。
    - **功能类别解释**：对每个功能类别（如鼠标双击、鼠标连击、键盘连击、系统电源控制等）的功能数据编码含义进行详细解释，并给出相关示例。
4. **《cmd_led.md》**
    - **LED命令介绍**：鼠标LED分为滚轮、LOGO和灯条三个区域，介绍了相关命令用于设置灯效和亮度。
    - **具体命令**
        - `get_led_effect`设置某个profile某个区域的灯效，介绍了不同灯效模式（熄灭、静态颜色、RGB循环、RGB波浪等）的数据参数格式。
        - `set_led_static`需配合`get_led_effect`的特定模式使用，可立即设置所有区域每颗灯的颜色。
        - `get_led_brightness`用于设置（读取）某个区域LED的亮度。
5. **《cmd_macro.md》**
    - **宏命令介绍**：介绍鼠标在Flash存储器中存储宏的相关命令，宏与profile独立，全局存储，有2字节ID及描述和内容。
    - **具体命令**
        - 如`get_macro_count`获取宏总数，`get_macro_list`获取宏ID，`get_macro_info`获取指定宏的描述等。
        - 还有删除宏、获取或设置宏大小以及设置或读取宏内容的命令，并介绍了宏内容数据的编码方式（包括键盘、鼠标、延时等操作的编码）。
6. **《cmd_profile.md》**
    - **Profile命令介绍**：巴蛇V3鼠标板载内存可存5个profile（编号1 - 5）及一个特殊的direct profile（编号0），介绍了相关操作命令。
    - **具体命令**
        - 如`get_profile_total_count`读取profile总数，`get_profile_available_count`读取当前启用的profile数量，`get_profile_list`读取当前启用的profile列表。
        - 还有新建、删除profile以及读取或写入profile描述信息的命令。
7. **《cmd_sensor.md》**
    - **传感器命令介绍**：介绍控制鼠标光学传感器抬升距离、校准设置等相关命令，包括雷蛇软件中的几种校准设置方式。
    - **具体命令**
        - 如`get_sensor_state`判断是否使用校准设置，`set_sensor_calibration`使鼠标进入或退出自行校准模式等。
        - 还介绍了设置鼠标使用固定抬升距离还是校准信息的`get_sensor_lift`命令，以及获取和写入校准结果及计算值的相关命令，并对校准算法及相关参数进行了说明。

What in tarnation does the author written in the documentations? Let AI summarize:

These articles focus on the USB HID protocol of the Razer Basilisk V3 wired mouse and introduce relevant commands and their parameters in detail, which can be used for programming to modify various functions of the mouse. The specific content is as follows:
1. **《basic.md》**
    - **Overall Introduction**: It introduces the results of the reverse engineering of the USB HID protocol of the Razer Basilisk V3 mouse, covering the protocol content for communication with the Razer Synapse software, including how to obtain and modify various settings such as the mouse wheel, DPI, polling rate, etc.
    - **USB HID Device Information**
        - The mouse has a VID of 0x1532, a PID of 0x0099, and a firmware version of 1.2.0. It also introduces the functions of its 4 interfaces and the input/output report formats.
        - The input report of information actively sent by the mouse in the driver mode and the specific behaviors at different endpoints.
        - The Feature report message format and the related structure definition, explaining the command sending and receiving methods between the computer and the mouse and the transaction_id of this mouse.
    - **Flash Memory Management Mechanism**: It introduces the use, read/write/erase methods, and storage management process (available - write -> used - erase -> recycled - format -> available) of the mouse's Flash memory (360 × 256 bytes).
2. **《cmd_basic.md》**
    - **Basic Command List**: It introduces basic commands, including several parts such as basic information acquisition, scroll wheel, polling rate, and DPI. Each command is represented by a 2 - byte number, and it details the read/write command bytes, read parameter length, and data parameter length for each command, along with relevant examples.
    - **Basic System Information Commands**
        - Such as `get_serial` to obtain the mouse serial number, `get_firmware_version` to obtain the firmware version, `get_device_mode` to read or set the mouse state, etc.
        - It also introduces commands to obtain the flash storage usage, determine whether the mouse is ready, and reset the flash.
    - **Scroll Wheel - related Commands**: Including `get_scroll_mode` (to read or set the scroll wheel mode), `get_scroll_acceleration` (to read or set the scroll wheel acceleration), and `get_scroll_smart_reel` (to read or set the intelligent scroll wheel mode switching).
    - **Performance - related Commands**: Covering `get_polling_rate` (to obtain the polling rate), `get_dpi_xy` (to obtain the current DPI), and `get_dpi_stages` (to read or set the list of switchable DPI levels).
3. **《cmd_button.md》**
    - **Button Setting Commands**: It mainly introduces the `get_button_function` command, which is used to read or set the button function.
    - **Command Parameter Explanation**
        - The read parameters include the profile number, the mouse button number, and whether it is a function under hypershift.
        - The data parameter represents the software function triggered after pressing the hardware button. It details the function categories (such as disable, mouse category, keyboard category, macro, etc.) and their corresponding data formats.
    - **Function Category Explanation**: It explains in detail the encoding meaning of the function data for each function category (such as double - click of mouse, multiple clicks of mouse, multiple clicks of keyboard, system power control, etc.) and gives relevant examples.
4. **《cmd_led.md》**
    - **LED Command Introduction**: The mouse LED is divided into three areas: the scroll wheel, the LOGO, and the light strip. It introduces relevant commands for setting the light effect and brightness.
    - **Specific Commands**
        - `get_led_effect` is used to set the light effect of a certain area in a certain profile. It introduces the data parameter formats for different light effect modes (off, static color, RGB cycle, RGB wave, etc.).
        - `set_led_static` needs to be used in combination with a specific mode of `get_led_effect` and can immediately set the color of each light in all areas.
        - `get_led_brightness` is used to set (read) the brightness of the LED in a certain area.
5. **《cmd_macro.md》**
    - **Macro Command Introduction**: It introduces the commands related to storing macros in the Flash memory of the mouse. The macros are independent of profiles and are stored globally, with a 2 - byte ID and a description and content.
    - **Specific Commands**
        - Such as `get_macro_count` to obtain the total number of macros, `get_macro_list` to obtain the macro IDs, `get_macro_info` to obtain the description of a specified macro, etc.
        - There are also commands to delete macros, obtain or set the size of macros, and set or read the content of macros. It also introduces the encoding method of the macro content data (including the encoding of operations such as keyboard, mouse, delay, etc.).
6. **《cmd_profile.md》**
    - **Profile Command Introduction**: The on - board memory of the Viper V3 mouse can store 5 profiles (numbered 1 - 5) and a special direct profile (numbered 0). It introduces the relevant operation commands.
    - **Specific Commands**
        - Such as `get_profile_total_count` to read the total number of profiles, `get_profile_available_count` to read the number of currently enabled profiles, `get_profile_list` to read the list of currently enabled profiles.
        - There are also commands to create, delete profiles, and read or write the description information of profiles.
7. **《cmd_sensor.md》**
    - **Sensor Command Introduction**: It introduces the commands related to controlling the lift - off distance of the mouse optical sensor, calibration settings, etc., including several calibration setting methods in the Razer software.
    - **Specific Commands**
        - Such as `get_sensor_state` to determine whether to use calibration settings, `set_sensor_calibration` to make the mouse enter or exit the self - calibration mode, etc.
        - It also introduces the `get_sensor_lift` command to set whether the mouse uses a fixed lift - off distance or calibration information, as well as commands related to obtaining and writing calibration results and calculation values, and explains the calibration algorithm and related parameters.
