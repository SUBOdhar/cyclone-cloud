import 'package:cyclone_app/pages/file_page.dart';
import 'package:cyclone_app/pages/server_set.dart';
import 'package:cyclone_app/services/file_service.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart';

void main() {
  if (!kIsWeb) {
    clearFilePickerCache();
  }
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  Future<Widget> _getInitialRoute() async {
    final prefs = await SharedPreferences.getInstance();
    final cookies = prefs.getString('accessToken');

    if (cookies != null && cookies.isNotEmpty) {
      // User is likely logged in (has tokens), go to FilesPage
      return const Filespage();
    } else {
      // User is not logged in, go to LoginPage
      return ServerSetupScreen();
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Cyclone Cloud',
      theme: ThemeData(
        // Define the light theme
        brightness: Brightness.light,
        primaryColor: Colors.blueAccent,
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.blueAccent,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        // Add other light theme properties as needed
      ),
      darkTheme: ThemeData(
        // Define the dark theme
        brightness: Brightness.dark,
        primaryColor: Colors.blueAccent, // You can change this for dark theme
        colorScheme: ColorScheme.fromSeed(
          seedColor:
              Colors.blueAccent, //  change this for dark theme if desired
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
        // Add other dark theme properties as needed
      ),
      themeMode: ThemeMode.system, // Use the system's theme setting
      home: FutureBuilder<Widget>(
        future: _getInitialRoute(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Scaffold(
                body: Center(child: CircularProgressIndicator()));
          } else if (snapshot.hasError) {
            return Scaffold(
                body: Center(child: Text('Error: ${snapshot.error}')));
          } else {
            return snapshot.data!;
          }
        },
      ),
    );
  }
}
