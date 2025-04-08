# LED Command List

The LED of this mouse is divided into 3 areas: the scroll wheel, the LOGO, and the light strip below. There is 1 light for the scroll wheel and the LOGO each, and 9 lights for the light strip below.

Each profile can independently save the light effect and brightness of each area. There are 3 kinds of light effects that can be saved in total: fixed, RGB cycle, and wave. In addition, there are commands that can directly set the LED color without using light effects, and the lighting effects can be achieved by software.

Related commands:

## get_led_effect

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x0f82       | 0x0f02        | 1(profile)+1(region)  | 10                    |

Set the light effect of a certain area in a certain profile. The light effect and brightness are independent and can be set separately. This only sets the light effect. The light effect will be saved in the profile and can be retained after power off, and it can change automatically when switching profiles.

If the light effect doesn't work, it may be that the current profile is not the set profile, or the brightness is set relatively low. You need to use the following command to increase the brightness.

The "region" item in the read parameters can take the following values:

- 0x00, which represents writing to all areas when writing
- 0x01, the scroll wheel
- 0x04, the LOGO
- 0x0a, the light strip

The format of the data parameter is:

- 1 byte effect
- 1 byte mode
- 1 byte speed
- 1 byte number of colors n
- 3 \* n bytes r, g, b values of the colors

Although the format is as above and seems to have a lot of information, in fact, Razer may currently focus more on software-implemented light effects, and very few on-board light effects are implemented. I have only tested 3 kinds so far, as follows:

- effect = 0: off, adjusting the brightness has no effect

Static color:

- 1 byte effect = 1: static color
- 1 byte mode any
- 1 byte speed any
- 1 byte number of colors n = 1
- 3 bytes r, g, b values of the fixed color

RGB cycle spectrum

- 1 byte effect = 3: spectrum
- 1 byte mode = 1
- 1 byte speed any, has no effect on the cycle speed
- 1 byte number of colors n = 0

RGB wave

- 1 byte effect = 4: wave
- 1 byte mode:
  - mode = 0: stationary
  - mode = 1: clockwise from above, changing from red to green to blue
  - mode = 2: counterclockwise from above, changing from blue to green to red
- 1 byte speed speed
  - speed = 0 is the fastest, changing many times per second
  - speed = 0x30 about 1.2s for one cycle
  - speed = 0xff about 6s for one cycle
- 1 byte number of colors n = 0

In addition, there is a mode with effect = 8. Other parameters can be set to 0. This mode is used in combination with set_led_static, but has no practical effect.

## set_led_static

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| -            | 0x0f03        | 0                     | 5 + 11 \* 3           |

This command needs to be used in combination with effect = 8 of `set_led_effect`. First, set effect = 8, and then send this command. It can immediately set the color of each light in all areas and will not be written to the flash. It is used to implement animations (software effects) and it doesn't matter if it is written at a very high frequency.
The command parameters are:

- 5 bytes fixed content 00 00 00 00 0a
- 11 \* 3 bytes, 11 color values, in the order of logo, scroll wheel, light strip in counterclockwise direction

## get_led_brightness

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x0f84       | 0x0f04        | 1(profile)+1(region)  | 1                     |

Set (read) the brightness of the LED in a certain area for a certain profile. The read parameters are the same as those of `get_led_effect`, and the data parameter is a value from 0 to 255, representing the brightness.
