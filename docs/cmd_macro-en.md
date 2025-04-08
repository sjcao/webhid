# Macro Command List

The mouse stores macros in the Flash memory, which is described in detail in the "Flash Memory Management Mechanism" section of [Basic Information](./basic.md).

The macros stored by the mouse are independent of profiles and are stored globally, not belonging to a certain profile. Each macro has a 2 - byte ID and also has a description and content. The description is used by the Razer software to store information such as the UUID and name of the macro. When implementing it yourself, you don't need to set it. You only need to set the 2 - byte ID and the content.

## get_macro_count

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x0680       | -             | 0                     | 2                     |

Get the total number of macros. The 2 - byte data parameter is the quantity.

## get_macro_list

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x068b       | -             | 2                     | 2(count)+2\*32        |

Get the IDs of all macros. Each macro's ID takes up 2 bytes. This command can read 32 IDs at a time. The read parameter is the starting sequence number. Passing this parameter will start reading from the specified position. "count" is the total number, not the number returned this time.
If there are more than 32 macros, they need to be read many times, 32 at a time. Increase the read parameter by 32 and read again until all are read.

## get_macro_info

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x068c       | 0x060c        | 2(id)+2(start)        | 2(length)+64(data)    |

Get the description of the macro with the specified ID, which is used by the Razer software to store the UUID, name, etc. of the macro. This has no actual impact on the function. I haven't analyzed the format in detail.
The read and data parameters are similar to those of `get_macro_list`. At most 64 bytes are read each time, and then the "start" parameter is increased.

## delete_macro

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| -            | 0x0603        | 2(id)                 | 0                     |

Delete the macro with the specified ID. After deletion, the originally occupied space will become recycled.

## get_macro_size

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x0688       | 0x0608        | 2(id)                 | 4                     |

Get or set the size of the specified macro, with the unit of bytes. When creating a new macro, this function needs to be used first to allocate storage space before writing the content. It can also be used to get its size when reading the macro content.

## get_macro_function

| Read Command | Write Command | Read Parameter Length    | Data Parameter Length |
| ------------ | ------------- | ------------------------ | --------------------- |
| 0x0689       | 0x0609        | 2(id)+4(start)+1(length) | length(data)          |

Set or read the content of the macro. The content data of the macro is a byte string encoding all the operations of the macro. The encoding method is written below. Read parameters:

- id: The ID of the macro to be operated on. If it is for writing, this macro must be newly created and the space must be allocated using `set_macro_size`.
- start: The position to start writing.
- length: The length of the following data.

The data parameter length is "length" and can be set to 64, that is, 64 bytes are written (or read) each time. Then, after each reading or writing, increase the "start" parameter to continue reading or writing the following content.

## Content Data of Macros

This introduces the encoding method of macros on the Razer on - board memory, which can be written using `get_macro_function`.

Firstly, the content of a macro contains several operations. The number of bytes occupied by each operation's encoding is not fixed, but each operation can be divided one by one from the front to the back. Multiple operations connected together form a macro. The operations include keyboard, mouse, delay, etc. The specific definitions are as follows:

**Keyboard Keys (2 bytes long)**:

- 1 byte 0x01 indicates the keyboard is pressed; 0x03 indicates the keyboard is released.
- 1 byte HID key code, see the document on button function binding for details.

**System Power Control (2 bytes long)**:

- 1 byte 0x03 or 0x04, with the same function.
- 1 byte Button value, see the document on button function binding for details, with the same definition as button binding.

If you want to press and release, you must first add an operation, set the value to the button to be pressed (press), and then add another one with a value of 0 (release), otherwise it will keep being pressed.

**Consumer (3 bytes long)**:

- 1 byte 0x05 or 0x06, with the same function.
- 2 byte Button value, see the document on button function binding for details, with the same definition as button binding.

The precautions for pressing and releasing are the same as the previous one.

**Mouse Buttons (2 bytes long)**:

- 1 byte 0x08, indicating it is a mouse button.
- 1 byte Button value

The button value here is different from that in button function binding, as shown in the following table. Each bit represents a button and can be combined:

| Button value | Button         |
| ------------ | -------------- |
| 0x01         | Left button    |
| 0x02         | Right button   |
| 0x04         | Middle button  |
| 0x08         | Back button    |
| 0x10         | Forward button |

For the operation of mouse buttons, after pressing, there must be a release operation behind, otherwise after the macro is triggered, the button will remain pressed. For example:

Left button pressed and then immediately released

08 01 08 00

Left button pressed, right button pressed, left button released, right button released

08 01 08 03 08 02 08 00

**Mouse Wheel (2 bytes long)**:

- 1 byte 0x0a indicates it is a mouse wheel.
- 1 byte Displacement value

The displacement value is a signed number, indicating the number of grids the mouse wheel has scrolled. Upward is 01, downward is ff.

**Delay (2 bytes long)**:

- 1 byte 0x11, a 1 - byte long delay.
- 1 byte Delay length

The delay length has a unit of milliseconds. Short delays within 256ms can be used with this, saving 1 byte of space.

**Delay (3 bytes long)**:

- 1 byte 0x12, a 2 - byte long delay.
- 2 byte Delay length

The delay length has a unit of milliseconds. The maximum is 65535ms.
