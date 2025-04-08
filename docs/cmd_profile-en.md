# Profile Command List

There are 5 profiles that can be stored in the on-board memory of the Viper V3 mouse, namely white/red/green/blue/cyan, with numbers 1 - 5 respectively. When reading, the settings in the corresponding profile will be read.
In addition, there is a special profile number, which I call "direct", with a number of 0. If the number is 0, the settings will take effect immediately, and the mouse will reset when powered off and will not be saved in the on-board memory.

## get_profile_total_count

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x058a       | -             | 0                     | 1                     |

Read the total number of profiles. The Basilisk V3 mouse should return 5.

## get_profile_available_count

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x0580       | -             | 0                     | 1                     |

Read the number of currently enabled profiles.

## get_profile_list

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| 0x0581       | -             | 0                     | 1 + count             |

Read the list of currently enabled profiles. The first byte of the data parameter is a fixed value as the total number of profiles (5). Then the next "count" bytes are the numbers of the enabled profiles. "count" is same as the value obtained using `get_profile_available_count`.

## new_profile

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| -            | 0x0502        | 0                     | 1                     |

Create (enable) a new profile. The parameter is the number of the profile to be created.
It's not sure what the settings are for newly-created profile. To ensure that the newly created profile has the default settings, you can rewrite each setting for this profile number again after creation.

## delete_profile

| Read Command | Write Command | Read Parameter Length | Data Parameter Length |
| ------------ | ------------- | --------------------- | --------------------- |
| -            | 0x0502        | 0                     | 1                     |

Delete (disable) a certain profile. The parameter is the profile number. It is similar to the previous one.

## get_profile_info

| Read Command | Write Command | Read Parameter Length | Data Parameter Length  |
| ------------ | ------------- | --------------------- | ---------------------- |
| 0x0588       | 0x0508        | 1(profile)+2(start)   | 2(length)+length(data) |

Read or write the description information of a profile. This description information is used by the Razer software and includes the name, ID, computer name, etc. of the profile in some encoding way. If you implement on-board memory reading and writing yourself and don't need to be compatible with the Razer software, you don't need to set this, and it has little impact on the mouse function.

Because the data is relatively long, this reading and writing is done in blocks. The "start" in the read parameters is the number of bytes of the starting position, and the returned data parameter includes the length and data of the block. There is an algorithm for block splicing in [qdrazer/device.py](../public/py/qdrazer/device.py), which can be referred to.

When writing, it should only be possible to write when a profile has just been newly created, and it cannot be written afterwards.
