import 'dart:io';
import 'package:cyclone_app/pages/LoginPage.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ServerSetupScreen extends StatefulWidget {
  const ServerSetupScreen({super.key});

  @override
  _ServerSetupScreenState createState() => _ServerSetupScreenState();
}

class _ServerSetupScreenState extends State<ServerSetupScreen> {
  final TextEditingController _serverController = TextEditingController();
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  bool _isChecking = false;

  /// Pings the given server URL by attempting a TCP connection.
  /// If the URL doesn't have a scheme, it assumes "http://".
  /// Returns true if a connection can be established.
  Future<bool> _pingServer(String url) async {
    try {
      Uri uri;
      try {
        uri = Uri.parse(url);
        if (uri.scheme.isEmpty) {
          uri = Uri.parse("http://$url");
        }
      } catch (e) {
        return false;
      }
      String host = uri.host;
      int port = uri.port != 0 ? uri.port : 80;

      // Attempt a connection with a short timeout.
      Socket socket =
          await Socket.connect(host, port, timeout: Duration(seconds: 1));
      socket.destroy();
      return true;
    } catch (e) {
      print("Ping failed: $e");
      return false;
    }
  }

  /// Checks if the entered server is reachable.
  /// If so, it stores the URL and navigates to the login screen.
  Future<void> _checkAndStoreServer() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    String serverUrl = _serverController.text.trim();

    setState(() {
      _isChecking = true;
    });

    bool isReachable = await _pingServer(serverUrl);

    setState(() {
      _isChecking = false;
    });

    if (isReachable) {
      // Store the URL using shared_preferences.
      SharedPreferences prefs = await SharedPreferences.getInstance();
      await prefs.setString('storage_server', serverUrl);

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const Login()),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Server is not reachable. Please check the URL."),
        ),
      );
    }
  }

  @override
  void dispose() {
    _serverController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Use Material Colors for a consistent theme.
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [Colors.blue.shade200, Colors.blue.shade700],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Card(
              elevation: 8,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                    vertical: 32.0, horizontal: 24.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        "Setup Storage Server",
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.blue.shade900,
                        ),
                      ),
                      const SizedBox(height: 24),
                      TextFormField(
                        controller: _serverController,
                        autofocus: true,
                        keyboardType: TextInputType.url,
                        decoration: InputDecoration(
                          labelText: "Storage Server URL",
                          hintText: "e.g. http://192.168.1.5:3001",
                          prefixIcon: Icon(Icons.cloud, color: Colors.blue),
                          filled: true,
                          fillColor: Colors.grey.shade200,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return "Please enter a server URL";
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 24),
                      _isChecking
                          ? const CircularProgressIndicator(
                              valueColor:
                                  AlwaysStoppedAnimation<Color>(Colors.blue),
                            )
                          : SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.blue,
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  textStyle: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                onPressed: _checkAndStoreServer,
                                child: const Text("Connect"),
                              ),
                            ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
