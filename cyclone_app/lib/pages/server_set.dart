import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:cyclone_app/pages/login_page.dart';
import 'package:dev_updater/dev_updater.dart';

class ServerSetupScreen extends StatefulWidget {
  const ServerSetupScreen({super.key});

  @override
  State<ServerSetupScreen> createState() => _ServerSetupScreenState();
}

class _ServerSetupScreenState extends State<ServerSetupScreen> {
  final TextEditingController _serverController = TextEditingController();
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final FocusNode _focusNode = FocusNode();
  bool _isChecking = false;

  /// Normalize and validate the URL.
  Uri? _normalizeUrl(String input) {
    try {
      Uri uri = Uri.parse(input.trim());

      if (uri.scheme.isEmpty) {
        uri = Uri.parse("http://$input");
      }
      return uri;
    } catch (_) {
      return null;
    }
  }

  /// Try to reach the server (Flutter Web-friendly version).
  Future<bool> _pingServer(String inputUrl) async {
    final uri = _normalizeUrl(inputUrl);
    if (uri == null) return false;

    try {
      final response = await http.get(Uri.parse('$uri/hp'));
      return response.statusCode == 200;
    } catch (e) {
      print("Ping failed (http): $e");
      return false;
    }
  }

  Future<void> _checkAndStoreServer() async {
    final urlInput = _serverController.text.trim();

    if (urlInput.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please enter the server URL")),
      );
      _focusNode.requestFocus();
      return;
    }

    setState(() => _isChecking = true);
    bool isReachable = await _pingServer(urlInput);
    setState(() => _isChecking = false);

    if (isReachable) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('storage_server', urlInput);

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const Login()),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Server not reachable. Check the URL.")),
      );
    }
  }

  @override
  void initState() {
    super.initState();
    DevUpdater().checkAndUpdate(context);
  }

  @override
  void dispose() {
    _serverController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screen = MediaQuery.of(context).size;
    final isDarkMode =
        MediaQuery.of(context).platformBrightness == Brightness.dark;
    final baseColor = isDarkMode ? Colors.black : Colors.blue.shade200;
    final textColor = isDarkMode ? Colors.white : Colors.blue.shade900;
    final containerColor = isDarkMode
        ? Colors.white.withOpacity(0.08)
        : Colors.white.withOpacity(0.15);
    final borderColor = isDarkMode
        ? Colors.white.withOpacity(0.1)
        : Colors.white.withOpacity(0.3);
    final shadowColor = isDarkMode
        ? Colors.black.withOpacity(0.2)
        : Colors.black.withOpacity(0.05);
    final inputFillColor =
        isDarkMode ? Colors.grey.shade800 : Colors.grey.shade200;

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              baseColor,
              isDarkMode ? Colors.black : Colors.blue.shade700
            ],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: Center(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final formWidth =
                  constraints.maxWidth < 500 ? constraints.maxWidth * 0.9 : 400;
              return Container(
                width: formWidth.toDouble(),
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: containerColor,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: borderColor),
                  boxShadow: [
                    BoxShadow(
                      color: shadowColor,
                      blurRadius: 10,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        "Setup Storage Server",
                        style: TextStyle(
                          fontSize: formWidth * 0.065,
                          fontWeight: FontWeight.bold,
                          color: textColor,
                        ),
                      ),
                      const SizedBox(height: 24),
                      TextFormField(
                        controller: _serverController,
                        focusNode: _focusNode,
                        keyboardType: TextInputType.url,
                        decoration: InputDecoration(
                          labelText: "Cyclone Cloud URL",
                          hintText: "e.g. http://192.168.1.5:3001",
                          prefixIcon: Icon(
                            Icons.cloud_outlined,
                            color: isDarkMode ? Colors.white : Colors.blue,
                          ),
                          filled: true,
                          fillColor: inputFillColor,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                        ),
                        style: TextStyle(
                            color: isDarkMode ? Colors.white : Colors.black),
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
                                  padding: EdgeInsets.symmetric(
                                    vertical: screen.height * 0.025,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  textStyle: TextStyle(
                                    fontSize: formWidth * 0.045,
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
              );
            },
          ),
        ),
      ),
    );
  }
}
