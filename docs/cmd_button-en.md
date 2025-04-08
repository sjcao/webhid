# Button Setting Command List

This part of the commands involves button function binding (mapping mouse buttons to different functions).

There is only one command, but the main point is how the parameters of this command represent a button function.

## get_button_function

| Read Command | Write Command | Read Parameter Length              | Data Parameter Length |
| ------------ | ------------- | ---------------------------------- | --------------------- |
| 0x028c       | 0x020c        | 1(profile)+1(button)+1(hypershift) | 7                     |

Read or set the function of a button.
There are 3 read parameters, all 1 byte each:

- `profile`: Profile number
- `button`: Mouse button number, see the table below for details
- `hypershift`: Whether to set or read the function under hypershift, 0 for normal, 1 for hypershift enabled

| Mouse Button Number | Corresponding Button                       |
| ------------------- | ------------------------------------------ |
| 0x01                | Left button                                |
| 0x02                | Right button                               |
| 0x03                | Middle button                              |
| 0x04                | Rear side button                           |
| 0x05                | Front side button                          |
| 0x09                | Scroll wheel up                            |
| 0x0a                | Scroll wheel down                          |
| 0x0e                | Bottom oval button                         |
| 0x0f                | Side aiming button                         |
| 0x34                | Scroll wheel left                          |
| 0x35                | Scroll wheel right                         |
| 0x60                | Button below the scroll wheel (lower one)  |
| 0x6a                | Button below the scroll wheel (upper one)  |

The data parameter represents the software function triggered after pressing the hardware button, with the specific encoding as follows:

- 1 byte Function category
- 1 byte Length of function data
- Up to 5 bytes Function data

The function categories include:

| Function Category Number | Name                               |
| ------------------------ | ---------------------------------- |
| 0x00                     | Disable (no function when pressed) |
| 0x01                     | Mouse category                     |
| 0x0b                     | Double-click of mouse              |
| 0x0e                     | Multiple clicks of mouse           |
| 0x02                     | Keyboard category                  |
| 0x0d                     | Multiple clicks of keyboard        |
| 0x09                     | System power control               |
| 0x0a                     | Consumer (including media buttons) |
| 0x03                     | Macro (fixed number of times)      |
| 0x04                     | Macro (triggered when pressed)     |
| 0x05                     | Macro (switched)                   |
| 0x0f                     | Macro (sequence)                   |
| 0x06                     | DPI switching                      |
| 0x07                     | Profile switching                  |
| 0x0c                     | Hypershift switching               |
| 0x12                     | Scroll wheel mode switching        |

The following explains each function category and the encoding meaning of its function data respectively.

### Disable

This category has no function data, and the length can be directly set to 0.

### Mouse Category, Double-click of Mouse

The mouse category means sending mouse events after pressing the button, such as left button, right button, etc. For double-click, two press events will be sent at once when pressed.
The data formats of the mouse category and double-click of mouse are the same, both having only one byte:

- 1 byte Button value

The correspondence between the button value and the software button is as follows:

| Button Value | Corresponding Mouse Button |
| ------------ | -------------------------- |
| 0x01         | Mouse left button          |
| 0x02         | Mouse right button         |
| 0x03         | Mouse middle button        |
| 0x04         | Side button (backward)     |
| 0x05         | Side button (forward)      |
| 0x09         | Scroll wheel up            |
| 0x0a         | Scroll wheel down          |
| 0x68         | Scroll wheel left          |
| 0x69         | Scroll wheel right         |

### Multiple Clicks of Mouse

The multiple clicks of mouse (turbo) category means that when the button is pressed, mouse button press events will be continuously sent at a set frequency. The data format is:

- 1 byte Button value, see the table above
- 2 bytes Interval time

The interval time occupies 2 bytes, is an unsigned integer in big endian format, and the unit is milliseconds, meaning that when the hardware button is pressed, a button press event is sent every x milliseconds. The smaller the value, the faster the sending.

### Keyboard Category

The keyboard category will send keyboard events after the button is pressed, such as a / b / F12 / Ctrl+C, which is equivalent to binding a mouse button to a keyboard button (it can also be set as a combination key).
The data format is:

- 1 byte Combination key value
- 1 byte Button value

The combination key value includes left (Ctrl, Shift, Alt, GUI(Windows key)), and can be freely combined with a certain button. Each bit of the 8 bits of the combination key value represents a button, and multiple bits can be set to 1. Setting to 1 means pressing the button, and setting to 0 means not pressing.

| Combination Key Value | Corresponding Button |
| --------------------- | -------------------- |
| 0x01                  | Left Ctrl            |
| 0x02                  | Left Shift           |
| 0x04                  | Left Alt             |
| 0x08                  | Left GUI             |
| 0x10                  | Right Ctrl           |
| 0x20                  | Right Shift          |
| 0x40                  | Right Alt            |
| 0x80                  | Right GUI            |

Button value is 1 byte, representing the HID code of the keyboard button. For example, A is 0x04, which can be referred to the Keyboard/Keypad Page in this table:
<https://usb.org/sites/default/files/hut1_5.pdf>

### Multiple Clicks of Keyboard

This is similar to the multiple clicks of mouse in principle, but it is replaced with sending keyboard buttons. The data format is:

- 1 byte Combination key value
- 1 byte Button value
- 2 bytes Interval time

### System Power Control

This type includes three functions: Power Down, Sleep, Wake Up. These three functions are Usage ID 0x81 - 0x83 in the HID's Generic Desktop Page and are sent by the mouse's interface 1, id 3. Generally, this function is not useful. After pressing, it is equivalent to pressing the power button in my Windows system.
The data format is:

- 1 byte Button value

| Button Value | Corresponding Function |
| ------------ | ---------------------- |
| 0x01         | Power Down             |
| 0x02         | Sleep                  |
| 0x04         | Wake Up                |

### Consumer (including media buttons)

Send an event of any Usage ID in the Consumer Page (USB Usage page 0x0C). For example, media keys on a general keyboard are included, such as increasing volume and decreasing volume are 0x00e9 and 0x00ea respectively.
The data format is:

- 2 bytes Button value

This button value is the Usage ID of the Consumer Page and can be referred to the Consumer Page in this table:

<https://usb.org/sites/default/files/hut1_5.pdf>

### Macro (fixed times)

After pressing the button, trigger a certain macro stored inside the mouse a fixed number of times.
The data format is:

- 2 bytes Macro ID
- 1 byte Repeat times

Multiple macros can be saved on the Razer mouse's on-board memory, and each macro has a 2-byte ID. Here, only the button function is pointed to the macro with that ID. What the content of the macro is is not the concern of this command. If there is no macro with that ID, the button should not be triggered, which is equivalent to being disabled.

### Macro (triggered when pressed)

When the button is pressed, the macro corresponding to the ID is continuously triggered until the button is released.
The data format is:

- 2 bytes Macro ID

### Macro (switched)

When the button is pressed once, the macro corresponding to the ID is continuously triggered. When pressed again, it stops being triggered.
The data format is:

- 2 bytes Macro ID

### Macro (sequence)

Each time the button is pressed, the macro corresponding to the ID triggers two operations. When pressed again, it triggers the next two operations. At the end, it loops back to the beginning. The mouse stores which operation is currently being executed.

This is the "sequence" type that macros can be set to in the Razer software. A sequence has many operations, and each time the button is pressed, the next operation is executed in turn. Its internal implementation is actually that each key has a press and release operation, and when macros are stored, the press and release operations of each key are continuously stored, and then when binding buttons, it is bound to the "macro (sequence)" function category.

The data format is:

- 2 bytes Macro ID

### DPI Switching

This category is used to switch DPI. By default, Razer binds the button relatively lower below the scroll wheel to the DPI switching key. Besides cycling through DPI, there are several other functions.

The first data format is:

- 1 byte Operation

Operation can be:

| Button Value | Corresponding Function                                                        |
| ------------ | ----------------------------------------------------------------------------- |
| 0x01         | Switch to the next item in the DPI level list                                 |
| 0x02         | Switch to the previous item in the DPI level list                             |
| 0x06         | Switch to the next item, but loop back to the start when reaching the end     |
| 0x07         | Switch to the previous item, but loop back to the end when reaching the front |

The default cycling through DPI operation of Razer is 0x06.
The second data format is:

- 1 byte 0x03
- 1 byte Sequence number

The function of this format is to switch to a certain fixed DPI level, starting from 1. For example, 0x03 0x01 is to switch to the first level.

The third data format is:

- 1 byte 0x03
- 4 bytes DPI values

This format is equivalent to Razer's aiming key. After pressing the button, it temporarily switches to a certain DPI and returns to the original state when released. The DPI values are 2 bytes for X and 2 bytes for Y, which are the same as the DPI values in the basic commands.

### Profile Switching

This category is used to switch the on-board Profile. By default, the button below Razer is for this function.

The first data format is:

- 1 byte Operation

Operation can be:

| Button Value | Corresponding Function                                                       |
| ------------ | ---------------------------------------------------------------------------- |
| 0x01         | Switch to the next Profile                                                   |
| 0x02         | Switch to the previous Profile                                               |
| 0x04         | Switch to the next Profile, but loop back to the start after reaching the end |
| 0x05         | Switch to the previous Profile, but loop back to the end after reaching the front            |

The second data format is:

- 1 byte 0x03
- 1 byte Profile number

The function is to switch to a certain fixed Profile.

Profile numbers are white/red/green/blue/cyan, numbered 1 - 5 respectively.

### Hypershift Switching

The Hypershift switching button. When held, it enters the Hypershift mode. The data has only one fixed byte, which is 0x01, and its meaning is unknown.

### Scroll Wheel Mode Switching

The Scroll Wheel Mode Switching button. When pressed, the scroll wheel switches between tactile and freespin modes. The data has only one fixed byte, which is 0x01, and its meaning is unknown.

## Examples

Because this command is rather complex, several examples are given here.
Bind the left scroll wheel (not hypershift) in the white profile to copy, and the right scroll wheel to paste:

01 34 00 02 02 01 06 00 00 00

01 35 00 02 02 01 19 00 00 00

Bind the left button in hypershift to the right button:

01 01 01 01 01 02 00 00 00 00

Temporary binding (direct profile), the left scroll wheel continuously triggers the scroll wheel up when pressed, 10 times per second:

00 34 00 0e 03 09 00 64 00 00

