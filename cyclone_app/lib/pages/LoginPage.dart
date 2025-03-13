import 'package:cyclone_app/pages/FilesPage.dart';
import 'package:cyclone_app/pages/serverSet.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class Login extends StatefulWidget {
  const Login({super.key});

  @override
  State<Login> createState() => _LoginState();
}

class _LoginState extends State<Login> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  // New http client to use cookies
  final http.Client _httpClient = http.Client();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _httpClient.close(); // Dispose of the http client
    super.dispose();
  }

  Future<void> login() async {
    setState(() {
      _isLoading = true;
    });
    SharedPreferences prefs = await SharedPreferences.getInstance();
    final storageServer = await prefs.getString('storage_server');
    if (storageServer == null) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => ServerSetupScreen()),
      );
    }
    final email = _emailController.text;
    final password = _passwordController.text;

    try {
      // Create a request
      final request = http.Request(
        'POST',
        Uri.parse('$storageServer/api/login'),
      );
      //add the headers
      request.headers.addAll(<String, String>{
        'Content-Type': 'application/json; charset=UTF-8',
      });
      //add the body
      request.body = jsonEncode(<String, String>{
        'user_email': email,
        'user_password': password,
      });

      // Send the request
      final http.StreamedResponse response = await _httpClient.send(request);
      //get the response
      final int statusCode = response.statusCode;
      final String responseBody = await response.stream.bytesToString();

      if (statusCode == 200) {
        //extract the cookies
        final cookies = response.headers['set-cookie'];
        final data = jsonDecode(responseBody);
        print(data);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setStringList(
            'cookies', cookies?.split(',') ?? []); // Save the cookies
        await prefs.setString('user_id', data['user']['user_id'].toString());
        await prefs.setString('user_name', data['user']['user_name']);
        await prefs.setString('user_email', data['user']['user_email']);

        // Navigate to the next page
        if (!context.mounted) return;
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const Filespage()),
        );
      } else if (statusCode == 401) {
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Invalid credentials.')),
        );
      } else {
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Login Failed.')),
        );
        print('Request failed with status: $statusCode.');
        print(responseBody);
      }
    } catch (e) {
      print('Error: $e');
      if (!context.mounted) return;
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
    return Scaffold(
      body: Stack(children: [
        Container(
          color: Colors.lightBlue.shade100,
        ),
        Center(
          child: AutofillGroup(
            child: SafeArea(
              child: Container(
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
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          const Text(
                            "Login",
                            style: TextStyle(fontSize: 40, color: Colors.black),
                          ),
                          const SizedBox(height: 20),
                          TextField(
                            autofocus: true,
                            style: const TextStyle(color: Colors.black),
                            controller: _emailController,
                            autofillHints: const <String>[AutofillHints.email],
                            keyboardType: TextInputType.emailAddress,
                            textInputAction: TextInputAction.next,
                            decoration: InputDecoration(
                              prefixIcon: const Icon(Icons.email_rounded,
                                  color: Colors.black),
                              labelText: 'Email',
                              labelStyle: const TextStyle(color: Colors.black),
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
                            controller: _passwordController,
                            style: const TextStyle(color: Colors.black),
                            textInputAction: TextInputAction.done,
                            autofillHints: const [AutofillHints.password],
                            obscureText: true,
                            decoration: InputDecoration(
                              prefixIcon: const Icon(Icons.lock_rounded,
                                  color: Colors.black),
                              labelText: 'Password',
                              labelStyle: const TextStyle(color: Colors.black),
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
      ]),
    );
  }
}
