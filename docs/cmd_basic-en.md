# Basic Command List

It includes several parts such as basic information acquisition, scroll wheel, polling rate, and DPI.
Commands are represented by a 2-byte number, corresponding to the command_class and command_id in the openrazer structure definition.
The second byte is the command_id. If the highest bit is 1, it is a read command; if it is 0, it is a write command.
Among them, "read parameter length" means the parameters that need to be passed when reading, such as the Profile number.
"data parameter length" means the additional parameter length to be passed when writing data, or the length of the read data part, such as the scroll wheel state, dpi value, etc.
The relevant code is located in: [qdrazer/device.py](../public/py/qdrazer/device.py)

## Basic System Information

### get_serial

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x0082       | -             | 0                     | 16                    |

Get the serial number of the mouse. The returned data should be encoded in ASCII, and the remaining places are filled with null characters (with a value of 0), for example, `PM2405Hxxxxxxxx` (my mouse is in this format, where x represents a digit).

### get_firmware_version

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x0081       | -             | 0                     | 4?                    |

Get the version of the mouse firmware. I don't know how many bytes this version has, but each byte (an unsigned integer) represents a part of the version number.
I assume the version number is 3 or 4 bytes long, for example, 1.2.0.0 is `01 02 00 00`.

### get_device_mode

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x0084       | 0x0004        | 0                     | 2                     |

Read or set the state of the mouse. The parameter length is 2 bytes. The meaning of the first byte is as shown in the following table, and the meaning of the second byte is unknown. Setting it to 0 should have no effect.

| Value | Meaning |
| ---- | ---- |
| 0x00 | Normal mode. Without the Razer driver, it is in this mode. |
| 0x01 | Enter the bootloader. |
| 0x02 | Unknown. It is said to be a test mode in openrazer. |
| 0x03 | Driver mode. |

In driver mode, some information will be returned when the mouse switches settings. I'm not clear about other functions. When the Razer Synapse software is opened, the mouse will be switched to driver mode every time.

### get_flash_usage

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x068e       | -             | 0                     | 14                    |

Get the usage of the current flash storage. The data parameter is a 2-byte unsigned integer and 3 4-byte unsigned integers.

The meaning of the first data parameter is unknown. The value of my mouse is 0x0064. The following three integers are the total number of flash bytes, the number of free bytes (available), and the number of recycled bytes (recycled), respectively.

For an explanation, see the basic information documentation.

### wait_device_ready

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x0086       | -             | ?                     | 0                     |

The Razer software uses the status of this command to return OK or not, to determine whether the mouse is ready or not.

### reset_flash

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x068a       | 0x060a        | 0                     | 6                     |

Reset (format) the flash, clear all macros, and set each block of the flash to available. The process is as follows:

First, send 0x060a with parameters 0000 0002 0000.

Then, send 0x068a with parameters 0000 0002 0000, and then check the returned parameters. If it is 0000 0202 0000, it proves that the reset is completed. If not, read it again and check the returned parameters.

## Scroll Wheel

### get_scroll_mode

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x0214       | 0x0294        | 1(profile)            | 1                     |

Read or set the scroll wheel mode. The scroll wheel of the Viper V3 can be switched and has two modes, namely freespin (no resistance/free rotation/unlocked) and tactile (with resistance, scrolling in steps/locked).

The data parameter represents the mode. 0 is tactile, and 1 is freespin.

This command and some of the following commands have a 1-byte read parameter, that is, when reading (or writing), a 1-byte parameter needs to be passed in the front. The meaning of the parameter is the profile number, and this will not be elaborated hereafter.

There are 5 profiles that can be stored in the on-board memory of the Basilisk V3 mouse, namely white/red/green/blue/cyan, with numbers 1~5. When reading, the settings in the corresponding profile will be read.

In addition, there is a special profile number, which I call direct, with a number of 0. If the number is 0, the settings will take effect immediately, and the config value will be reset when powered off and will not be saved in the on-board memory.

### get_scroll_acceleration

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x0296       | 0x0216        | 1(profile)            | 1                     |

Read or set the scroll wheel acceleration. When enabled, the scrolling amount will increase when the scroll wheel rolls fast.

The 1-byte parameter 0 disables it, and 1 enables it.

### get_scroll_smart_reel

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x0296       | 0x0216        | 1(profile)            | 1                     |

Read or set the smart reel (intelligent scroll wheel mode switching). When enabled, the scroll wheel will automatically switch to the no-resistance (freespin) mode when it rolls fast, and will switch back when it stops.
The 1-byte parameter 0 disables it, and 1 enables it.

## Performance

Including polling rate and DPI

### get_polling_rate

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x008e       | 0x000e        | 1(profile)            | 1                     |

The polling rate is the number of times the mouse sends movement/button events per second.
The data parameter is a byte, an unsigned integer. This is the interval between two sending events, in milliseconds. For example, if the polling rate is 1000Hz, the value is 1; if it is 125Hz, the value is 8. I have tested that values from 1 to 255 are all valid. If it is too large, the mouse will be very laggy, but it can still work normally.

### get_dpi_xy

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x008e       | 0x000e        | 1(profile)            | 6                     |

The current DPI of the mouse. Besides this, there is also a command to set DPI stages. This directly sets the current DPI and has nothing to do with DPI stages.

The data parameter length is 6. The first 4 bytes are 2 16-bit unsigned numbers (both in big endian), and the last 2 bytes are not used and can be set to 0. The two unsigned numbers are the values of DPI in the X and Y directions, respectively. The unit is DPI. Its minimum range is 50. If it is smaller, the actual DPI will become a very large fixed value. I don't know the maximum range, probably 25000/25600.

### get_dpi_stages

| Read Command | Write Command | Read Parameter Length | Data Parameter Length        |
| ------------ | ------------- | --------------------- | ---------------------------- |
| 0x0486       | 0x0406        | 1(profile)            | 1(active) + 1(length) + 7\*5 |

Read or set the list of DPI levels that can be switched. After setting, a button can be bound to a DPI switching button, using this list.

The data parameter active indicates which level is currently being used, length indicates how many items there are in the following list, and the last 7\*5 is the values of 5 levels.

This mouse can store a maximum of 5 DPI levels. If length is less than 5, the remaining places can be filled with 0. Each item is 7 bytes:

- First, a 1-byte sequence number. I feel this information is redundant, but when using it, it can be numbered as 0, 1, 2, 3, 4 as such.
- Second, 6 bytes, with the same format as the get_dpi_xy above.
