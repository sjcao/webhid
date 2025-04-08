import sys
import hid

def list_devices():
    devices = hid.enumerate()
    if not devices:
        print("No HID devices found.")
        sys.exit(1)

    print("Available HID Devices:")
    for index, device in enumerate(devices):
        print(f"{index}: {device['product_string']} (VID: {device['vendor_id']}, PID: {device['product_id']}) {device['path']}")

    return devices

def select_device(devices):
    try:
        choice = int(input("Select a device by index: "))
        if choice < 0 or choice >= len(devices):
            print("Invalid choice.")
            sys.exit(1)
        return devices[choice]
    except ValueError:
        print("Invalid input. Please enter a number.")
        sys.exit(1)

def capture_input(device_info):
    try:
        with hid.Device(vid=device_info['vendor_id'], pid=device_info['product_id'], path=device_info['path']) as device:
            print(f"Capturing input from {device_info['product_string']}...")
            while True:
                data = device.read(84)  # Adjust size as necessary
                if data:
                    print(f"Data: {data}")
    except hid.HIDException as e:
        print(f"Error: {e}")
    except KeyboardInterrupt:
        print("\nCapture stopped.")

def main():
    devices = list_devices()
    device_info = select_device(devices)
    capture_input(device_info)

if __name__ == "__main__":
    main()