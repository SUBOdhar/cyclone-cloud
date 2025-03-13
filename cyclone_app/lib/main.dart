import 'package:cyclone_app/pages/FilesPage.dart';
import 'package:cyclone_app/pages/LoginPage.dart';
import 'package:cyclone_app/pages/serverSet.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  Future<Widget> _getInitialRoute() async {
    final prefs = await SharedPreferences.getInstance();
    final cookies = prefs.getStringList('cookies');

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
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blueAccent),
        useMaterial3: true,
      ),
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
