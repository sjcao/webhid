# Sensor Command List

Sensor commands are used to control the lift-off distance of the mouse optical sensor, calibration settings, etc. The function of calibrating the mouse pad in the Razer Synapse program is also included.
There are generally several settings in Razer's software:

- Firstly, disable calibration and use a fixed lift-off distance.
- Secondly, use the official Razer mouse pad calibration information.
- Finally, perform mouse pad calibration by oneself.

The commands responsible for these settings are as follows:

## get_sensor_state

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x0b83       | 0x0b03        | 2(0x0004)             | 1                     |

Whether to use calibration settings. If the data parameter is 0, a fixed lift-off distance is used; if it is 1, mouse pad calibration is used.
The read parameter length is fixed at 0x0004 (the same below), and I don't know its meaning. Just set it like this.

## set_sensor_calibration

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| -            | 0x0b09        | 2(0x0004)             | 2                     |

Make the mouse enter or exit the self-calibration mode.
The way to enter the self-calibration mode:

- Use `set_device_mode` to adjust the mouse to the driver mode.
- Use `set_sensor_state` to enable mouse pad calibration.
- Set `set_sensor_lift` to `calib1`.
- Send this command with a data parameter of 0.

The mouse's endpoint 2 id 5 should send 050a00, indicating that the calibration has started.
After entering, the mouse pointer will stop moving. Move a relatively long distance on the mouse pad, basically covering the entire mouse pad, and then use the following method to exit the self-calibration mode:

- Send this command with a data parameter of 1.

The mouse's endpoint 2 id 5 should send 050a01, indicating that the calibration is successful, or 050a02, indicating that the calibration has failed (the moving distance is too short or not on the mouse pad).

After calibration, the original calibration data obtained is retrieved using `get_sensor_lift_config`. There are 4 useful bytes of content, similar to 26 03 30 03.

After calibration, the mouse is not configured yet. It is still necessary to calculate the calibration calculation value to be written using the obtained original calibration data and then write it back to the mouse. The meaning of this data and how to calculate it will be described later.

## get_sensor_lift

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x0b8b       | 0x0b0b        | 2(0x0004)             | 2                     |

This is used to set whether the mouse uses a fixed lift-off distance or calibration information, and which one to use specifically. The data parameter has the following values:

| Value  | Meaning                                                 | Corresponding sensor_state |
| ------ | ------------------------------------------------------- | -------------------------- |
| 0x0000 | Do not use any settings (the meaning is not very clear) | 0                          |
| 0x0100 | Symmetric 1mm                                           | 0                          |
| 0x0101 | Symmetric 2mm                                           | 0                          |
| 0x0102 | Symmetric 3mm                                           | 0                          |
| 0x0200 | Asymmetric 1 - 2mm                                      | 0                          |
| 0x0201 | Asymmetric 1 - 3mm                                      | 0                          |
| 0x0202 | Asymmetric 2 - 3mm                                      | 0                          |
| 0x0300 | Symmetric Razer calibration                             | 1                          |
| 0x0400 | Asymmetric Razer calibration                            | 1                          |
| 0x0500 | Symmetric self-calibration                              | 1                          |
| 0x0600 | Asymmetric self-calibration                             | 1                          |

## get_sensor_lift_config

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------ | ------ | ------------ | ------------ |
| 0x0b85 | 0x0b05 | 2(0x0004) | 8 |

The read and write operations of this command have different functions. The read operation is to obtain the calibration result, as described in the calibration process above.
The write operation is used together with the two symmetric calibration schemes of 0x0300 and 0x0500 in `get_sensor_lift`. It is to write the calibration calculation values used in those two symmetric calibration schemes.
To use a symmetric calibration scheme, first calculate the calibration calculation value using an algorithm with the calibration data and the lift value, write it using this command, and then also need to set the corresponding values using `set_sensor_lift` and `set_sensor_state`.

## get_sensor_lift_config_a

| Read Command | Write Command | Read Parameter | Data Parameter Length |
| ------ | ------ | ------------ | ------------ |
| 0x0b8d | 0x0b0d | 2(0x0004) | 8 |

This command is used to write or read the asymmetric calibration calculation value A and needs to be used with the two asymmetric calibration settings of 0x0400 and 0x0600 in `get_sensor_lift`. What exactly is the "asymmetric calibration calculation value A" is described below.

## get_sensor_lift_config_b

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------ | ------ | ------------ | ------------ |
| 0x0b8c | 0x0b0c | 2(0x0004) | 5 |

This command is used to write or read the asymmetric calibration calculation value B and needs to be used with the two asymmetric calibration settings of 0x0400 and 0x0600 in `get_sensor_lift`. What exactly is the "asymmetric calibration calculation value B" is described below.

## If a fixed lift-off distance is to be used

Refer to the table in `get_sensor_lift` and set the required values using `set_sensor_lift` and `set_sensor_state`.

## If the official Razer mouse pad calibration information is to be used

According to my experiment, all the mouse pad calibrations provided by Razer transmit exactly the same information to the mouse. That is to say, although there seem to be many carefully calibrated mouse pads in Razer Synapse, in fact, they all have the same effect after application.
Firstly, whether it is Razer calibration or self-calibration, an algorithm is involved:

- Use the obtained original calibration data.
- Then use the two values of lift and land.
  - Lift represents the lift-off distance, and land represents the landing distance. Both have a value range of 1 - 10 and are relative values.
  - Asymmetric means two values; if it is symmetric, there is only one value.
  - These two values are the sliders from 1 to 10 in the Synapse software.
- Calculate the calibration calculation value to be written.
  - If it is asymmetric, there are two values, an 8-byte A and a 5-byte B; if it is symmetric, it is a single 8-byte value.
    The method of obtaining the original calibration data is described in `set_sensor_calibration` above. This algorithm, after my analysis and reverse engineering, is represented in Python code as follows:
- The input `mouse_data` is 4 bytes of original calibration data obtained from the mouse.
- `land = None` represents symmetry; setting `land` to a number represents asymmetry.

```python

def calculate_lift_config(mouse_data, lift, land=None):
    if not (1 <= lift <= 10) or not (land is None or 1 <= land <= 10):
        raise ValueError('lift and land must be within 1 and 10')
    asym = land is not None
    def calc0(l, m0):
        return round(m0 - (m0 - 8) / 10 * (l-1))
    def calc2(l, m1, m3):
        return (l-1) * m3 + m1
    m0, m1, m2, m3 = mouse_data
    
    a0 = calc0(lift, m0)
    if lift < 5: a1 = m2
    else:        a1 = [0,0,0,0,0x30,0x30,0x38,0x38,0x38,0x38][lift-1]
    a2 = calc2(lift, m1, m3)
    a3 = 0x88 if asym else 0x08
    a4 = max(10, a2)
    if asym: a5 = [0x5,0xf,0xf,0xf,0xf,0xf,0x0,0x0,0x0,0x0][lift-1]
    else:    a5 = [0x5,0x5,0x5,0x5,0x5,0x5,0x0,0x0,0x0,0x0][lift-1]
    a6 = [0x10,0xf,0xf,0xf,0xf,0xf,0xf,0xe,0xe,0xe,0xe][lift]
    a7 = [0xf,0xd,0xa,0xa,0xa,0x8,0x8,0x8,0x8,0x8][lift-1]
    a = bytes([a0, a1, a2, a3, a4, a5, a6, a7])
    if not asym:
        return a
    
    b0 = calc0(land, m0)
    if lift < 5: b1 = m2
    else:        b1 = [0,0,0,0,0x30,0x30,0x38,0x38,0x38,0x38][land-1]
    b2 = calc2(land, m1, m3)
    b3 = max(10, b2)
    b4 = [0xf,0xd,0xa,0xa,0xa,0x8,0x8,0x8,0x8,0x8][land-1]
    b = bytes([b0, b1, b2, b3, b4])
    return a, b

```

The meaning of this 8-byte parameter or A and B parameters is currently unclear. However, this is how the Synapse software calculates.

Then, the original calibration information of the official Razer mouse pad is equivalent to `30 0d 20 02`. Using this value and the algorithm, adding the lift and land values, the calculated data can be used for the `set_sensor_lift_config` or `_a`, `_b` versions. At the same time, also need to set `sensor_light` and the corresponding `sensor_state`.

## If self-calibration information is to be used

Firstly, use the above commands to calibrate the mouse pad and obtain the original calibration data.

Then, run the above algorithm to calculate and set the calibration calculation value in the same way.

At the same time, also need to set `sensor_lift` and the corresponding `sensor_state`.

When calibrating, if the mouse is far from the mouse pad, the first byte of the original calibration data will be smaller. The other 3 bytes have always been 03 30 03 in my tests. The current meaning is unclear, but this is how the Synapse software calculates, and I don't know the principle, and there is no data manual for this sensor PAW3399 on the Internet.
