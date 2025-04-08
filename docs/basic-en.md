# Basic Information on the Reverse Engineering of Basilisk V3 USB HID Protocol

This is a rather detailed document on the results of reverse engineering, covering the HID protocol for communication between Razer's Synapse software and the wired version of the Razer Basilisk V3 mouse. Using this knowledge, one can programatically modify the mouse's scroll wheel, DPI, polling rate, button bindings, profiles, macros, lighting, calibration information, etc.
Most of the protocol was analyzed by me using Wireshark packet capture and observing Razer software logs. A small part of the information (such as message format) was borrowed from the openrazer and OpenRGB projects.
Razer Basilisk V3 Wired Version
<https://cn.razerzone.com/gaming-mice/razer-basilisk-v3>
Command List:

- [Basic Commands](./cmd_basic-en.md)
- [Profile Commands](./cmd_profile-en.md)
- [Button Setting Commands](./cmd_button-en.md)
- [LED Commands](./cmd_led-en.md)
- [Macro Commands](./cmd_macro-en.md)
- [Sensor Commands](./cmd_sensor-en.md)

## USB HID Device

The mouse has a VID = 0x1532, which is the same as many of Razer's devices. The PID = 0x0099
The firmware version is 1.2.0
Various HID key codes can be found here: <https://usb.org/document-library/hid-usage-tables-15>
The mouse's USB HID device has 4 interfaces, namely:

- Interface 0: Corresponding to endpoint 1, it is a mouse device
  - Sends an input report, with the format:
    - 5 bits, representing buttons 1 - 5 (left, right, middle, two side buttons)
    - 11 bits, empty, to complete 2 bytes
    - hid ac pan, which is the horizontal scroll wheel, represented by an 8 - bit signed number indicating how many grids the wheel has scrolled
    - wheel, the vertical scroll wheel, 8 bits
    - Mouse pointer displacement X and Y, each 16 bits
- Interface 1: Endpoint 2 can send 5 types of reports, with ids = 1 ~ 5, as follows: (all with a length of 15 bytes)
  - Keyboard id = 1
    - HID key codes for combination keys (Ctrl, Shift, etc.) of E0 ~ E7, 8 bits
    - Any key, each byte is a key code, a total of 14 8 - bit
  - Consumer control id = 2
    - 16 - bit media keys (there is a document for USB HID to see what each key corresponds to)
    - 13 8 - bit, empty
  - System control id = 3
    - 3 bits, representing power down, sleep, wake up (0x81 ~ 0x83)
    - 5 bits, empty
    - 14 8 - bit, empty
  - 01 00 id = 4
    - 15 8 - bit, see the description below for the use
  - 01 00 id = 5
    - 15 8 - bit, see the description below for the use
- Interface 2: Endpoint 3 keyboard, should conform to a boot keyboard
  - Input report
    - E0 ~ E7 combination keys, 8 bits
    - Any key, 6 8 - bit
  - Output report
    - LED, output, 3 bits (not useful for this mouse)
    - Output, 5 bits empty
- Interface 3: Endpoint4?
  - Usage page = 0xff00, usage id = 0x01, which is vendor - defined in the table
  - Feature report, 90 8 - bit control information
  - This interface is used to transmit most of the information sent by the Razer driver, including the commands involved in other documents, etc.
    The input report of information actively sent by the mouse (only sent in driver mode, not in normal mode):
- Endpoint 2 id 4:
  - It should be sent when something is switched in driver mode
- Endpoint 2 id 5: It should only operate in driver mode
  - The first byte is 02 for switching DPI, followed by four bytes, which are 2 bytes for the current DPI X and 2 bytes for the current DPI Y
  - The first byte is 39 for switching the scroll mode, followed by a byte, 01 for free scroll and 00 for tactile scroll
  - The first byte is 0a and is related to calibrating the mouse pad, and the next byte can take values of 00, 01, and 02 - 00 indicates the start of calibration, 01 indicates successful calibration, and 02 indicates calibration failure
    The commands involved in other documents are all feature reports sent to interface 3.

## Feature Report Message Format

In some previous projects, such as the analysis of openrazer, there is the message format of Razer: <https://github.com/openrazer/openrazer/blob/master/driver/razercommon.h>
The specific definition is as follows:

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

For this mouse, in practice, the computer always actively sends set_report and the mouse passively receives it; or the computer actively sends get_report and the mouse returns the status of the execution of the previous command.
The sending and receiving process will not be elaborated because it has been analyzed by others.
The transaction_id of the Basilisk v3 wired is fixed at 0x1f.
The code for sending and receiving messages is in [basilisk_v3/device.py](../public/py/basilisk_v3/device.py).
Here, only list all the commands, parameters, and functions that I have analyzed:

## Flash Memory Management Mechanism

The mouse has 360 \* 256 bytes (90KiB) of Flash memory, which should be 256 bytes per page, with a total of 360 pages.
The Flash memory is used to store macros, and it seems that profiles also occupy the Flash memory.
Flash is written page by page and randomly read. When erased, it is erased page by page. However, the implementation of the mouse is that the erased page cannot be reused (enters the recycled pool) and must be fully formatted before it can be rewritten.
The above process is: available - write -> used - erase -> recycled - format -> available
When creating a new macro, only available - type pages will be used. If there is no space, the write will fail. At this time, if there are recycled pages, the Razer software will format the Flash and rewrite all the previously stored data (that is, garbage collection or defragmentation).
