import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:cyclone_app/pages/file_page.dart';
import 'package:cyclone_app/pages/server_set.dart';
import 'package:cyclone_app/services/device_info.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class Login extends StatefulWidget {
  const Login({super.key});

  @override
  State<Login> createState() => _LoginState();
}

class _LoginState extends State<Login> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _obscureText = true;

  // A persistent HTTP client for this page.
  final http.Client _httpClient = http.Client();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _httpClient.close();
    super.dispose();
  }

  Future<void> login() async {
    // Remove any whitespace from input.
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Please fill in both email and password.')),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    SharedPreferences prefs = await SharedPreferences.getInstance();
    final storageServer = prefs.getString('storage_server');
    if (storageServer == null) {
      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const ServerSetupScreen()),
      );
      return;
    }

    try {
      final url = '$storageServer/api/login';
      final request = http.Request('POST', Uri.parse(url));
      request.headers.addAll({
        'Content-Type': 'application/json; charset=UTF-8',
      });
      request.body = jsonEncode({
        'user_email': email,
        'device_name': await getDeviceName(),
        'user_password': password,
      });

      final streamedResponse = await _httpClient.send(request);
      final statusCode = streamedResponse.statusCode;
      final responseBody = await streamedResponse.stream.bytesToString();

      if (statusCode == 200) {
        final data = jsonDecode(responseBody);

        await prefs.setString('accessToken', data['accessToken']);
        await prefs.setString('user_id', data['user']['user_id'].toString());
        await prefs.setString('user_name', data['user']['user_name']);
        await prefs.setString('user_email', data['user']['user_email']);
        await prefs.setString('refreshToken', data['refreshToken']);

        if (!mounted) return;
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const Filespage()),
        );
      } else if (statusCode == 401) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Invalid credentials.')),
        );
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Login failed. Please try again.')),
        );
        print('Request failed with status: $statusCode\n$responseBody');
      }
    } catch (e) {
      print('Error: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Network error.')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(body: LayoutBuilder(builder: (context, constraints) {
      double width =
          constraints.maxWidth < 500 ? constraints.maxWidth * 0.9 : 400;

      return Stack(
        children: [
          Container(color: Colors.black),
          Center(
            child: AutofillGroup(
              child: SafeArea(
                child: Container(
                  width: width,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: MediaQuery.of(context).size.width * 0.8,
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(20),
                          border:
                              Border.all(color: Colors.white.withOpacity(0.3)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            const Text(
                              "Login",
                              style:
                                  TextStyle(fontSize: 40, color: Colors.white),
                            ),
                            const SizedBox(height: 20),
                            TextField(
                              autofocus: true,
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.next,
                              autofillHints: const [AutofillHints.email],
                              style: const TextStyle(color: Colors.white),
                              decoration: InputDecoration(
                                prefixIcon: const Icon(Icons.email_rounded,
                                    color: Colors.white),
                                labelText: 'Email',
                                labelStyle:
                                    const TextStyle(color: Colors.white),
                                filled: true,
                                fillColor: Colors.white.withOpacity(0.2),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide.none,
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            TextField(
                              obscureText: _obscureText,
                              controller: _passwordController,
                              textInputAction: TextInputAction.done,
                              autofillHints: const [AutofillHints.password],
                              style: const TextStyle(color: Colors.white),
                              decoration: InputDecoration(
                                prefixIcon: const Icon(Icons.lock_rounded,
                                    color: Colors.white),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscureText
                                        ? Icons.visibility
                                        : Icons.visibility_off,
                                    color: Colors.white,
                                  ),
                                  onPressed: () {
                                    setState(() {
                                      _obscureText = !_obscureText;
                                    });
                                  },
                                ),
                                labelText: 'Password',
                                labelStyle:
                                    const TextStyle(color: Colors.white),
                                filled: true,
                                fillColor: Colors.white.withOpacity(0.2),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide.none,
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            _isLoading
                                ? const CircularProgressIndicator()
                                : ElevatedButton(
                                    onPressed: login,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.deepPurpleAccent,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      minimumSize:
                                          const Size(double.infinity, 48),
                                    ),
                                    child: const Text(
                                      'Login',
                                      style: TextStyle(
                                          fontSize: 18, color: Colors.white),
                                    ),
                                  ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      );
    }));
  }

  bool isWeb() {
    if (!Platform.isAndroid &&
        !Platform.isIOS &&
        !Platform.isLinux &&
        !Platform.isMacOS &&
        !Platform.isWindows) {
      return true;
    } else {
      return false;
    }
  }
}
