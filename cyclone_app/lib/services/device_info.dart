import 'package:device_info_plus/device_info_plus.dart';
import 'dart:io'; // Required for Platform checks

Future<String> getDeviceName() async {
  final DeviceInfoPlugin deviceInfoPlugin = DeviceInfoPlugin();

  try {
    if (Platform.isAndroid) {
      AndroidDeviceInfo androidInfo = await deviceInfoPlugin.androidInfo;
      return androidInfo.model; // e.g., "Pixel 5", "SM-G998B"
    } else if (Platform.isIOS) {
      IosDeviceInfo iosInfo = await deviceInfoPlugin.iosInfo;
      return iosInfo.name; // e.g., "My iPhone 13"
    } else if (Platform.isWindows) {
      WindowsDeviceInfo windowsInfo = await deviceInfoPlugin.windowsInfo;
      return windowsInfo.computerName; // e.g., "DESKTOP-ABCDEFG"
    } else if (Platform.isMacOS) {
      MacOsDeviceInfo macOsInfo = await deviceInfoPlugin.macOsInfo;
      return macOsInfo.computerName; // e.g., "Johns-MacBook-Pro"
    } else if (Platform.isLinux) {
      LinuxDeviceInfo linuxInfo = await deviceInfoPlugin.linuxInfo;
      return linuxInfo.prettyName; // e.g., "Ubuntu 22.04 LTS"
    } else {
      // Fallback for any other platforms or if running on web (though web
      // typically doesn't have a single "device name" concept in the same way).
      // For web, you might get user agent or browser info, not a device name.
      WebBrowserInfo webBrowserInfo = await deviceInfoPlugin.webBrowserInfo;
      if (webBrowserInfo.appName != null &&
          webBrowserInfo.appName!.isNotEmpty) {
        return '${webBrowserInfo.appName} (${webBrowserInfo.userAgent?.split('(').first.trim() ?? 'Web'})';
      }
      return 'Unknown Platform Device';
    }
  } catch (e) {
    print('Error getting device name: $e');
    return 'Error: Could not retrieve device name';
  }
}

// --- How to use this function ---
