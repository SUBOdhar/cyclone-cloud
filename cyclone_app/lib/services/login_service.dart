import 'dart:convert';
import 'package:cyclone_app/pages/login_page.dart'; // Assuming this is the correct path
import 'package:cyclone_app/services/device_info.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:device_info_plus/device_info_plus.dart';

class LoginService {
  final deviceInfoPlugin = DeviceInfoPlugin();

  Future<void> reLogin(dynamic context) async {
    final prefs = await SharedPreferences.getInstance();
    final refreshToken = prefs.getString('refreshToken');
    final accessToken = prefs.getString('accessToken');
    final url = prefs.getString("storage_server");
    try {
    

      if (refreshToken != null && accessToken != null && url != null) {
        try {
          final Uri uri = Uri.parse("$url/api/refresh");

          final http.Response response = await http.post(
            uri,
            headers: {
              'Content-Type': 'application/json; charset=UTF-8',
            },
            body: jsonEncode({
              'refreshToken': refreshToken,
              'device_name': await getDeviceName()
            }),
          );

          if (response.statusCode == 200) {
            // Parse response
            final Map<String, dynamic> data = jsonDecode(response.body);
            final newRefreshToken = data['refreshToken'];
            final newAccessToken = data['accessToken'];
            if (newAccessToken != null) {
              await prefs.setString('accessToken', newAccessToken);
            }
            // Update SharedPreferences
            if (newRefreshToken != null) {
              await prefs.setString('refreshToken', newRefreshToken);
            }
          } else {
            final prefs = await SharedPreferences.getInstance();
            await prefs.remove('accessToken');
            await prefs.remove('refreshToken');
            await prefs.remove('user_id');
            await prefs.remove('user_name');
            await prefs.remove('user_email');
            _navigateToLogin(context);
            print(
                "Failed to refresh token: ${response.statusCode}, body: ${response.body}"); // Include response body in print
          }
        } catch (e) {
          print("Error in reLogin: $e"); // Keep the existing error log
          // Show a user-friendly message
          if (context != null && context.mounted) {
            // use the mounted property
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                  content:
                      Text('Failed to refresh session. Please login again.')),
            );
          }
        }
      }
    } catch (e) {
      print("Error getting device info $e");
      if (context != null && context.mounted) {
        // use the mounted property
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error getting device information.')),
        );
      }
    }
  }

  void _navigateToLogin(dynamic context) {
    print("navigating to login");
    if (context == null || !context.mounted) return; // Add null check
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => const Login()),
    );
  }
}
