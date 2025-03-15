// lib/pages/FilesPage.dart

import 'dart:async';
import 'package:cyclone_app/pages/Loginpage.dart';
import 'package:cyclone_app/services/file_service.dart'; // Import the FileService
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class Filespage extends StatefulWidget {
  const Filespage({Key? key}) : super(key: key);

  @override
  State<Filespage> createState() => _FilespageState();
}

class _FilespageState extends State<Filespage> {
  List<Map<String, dynamic>> fileData = [];
  bool _isLoading = true;
  late FileService _fileService; // Declare FileService instance
  late String _baseUrl;
  final GlobalKey<RefreshIndicatorState> _refreshIndicatorKey =
      GlobalKey<RefreshIndicatorState>();

  @override
  void initState() {
    super.initState();
    _tryAutoLogin();
  }

  @override
  void dispose() {
    _fileService.dispose(); // Dispose of the FileService
    super.dispose();
  }

  IconData _getFileIcon(String filename) {
    final ext = filename.split('.').last.toLowerCase();

    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'svg':
        return Icons.image;
      case 'pdf':
        return Icons.picture_as_pdf;
      case 'doc':
      case 'docx':
      case 'odt':
        return Icons.description;
      case 'xls':
      case 'xlsx':
      case 'csv':
        return Icons.table_chart;
      case 'ppt':
      case 'pptx':
      case 'odp':
        return Icons.slideshow;
      case 'txt':
      case 'md':
        return Icons.text_snippet;
      case 'mp3':
      case 'wav':
      case 'ogg':
        return Icons.audiotrack;
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'mkv':
        return Icons.movie;
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
      case 'html':
      case 'css':
      case 'json':
      case 'xml':
      case 'py':
      case 'java':
      case 'rb':
        return Icons.code;
      case 'zip':
      case 'rar':
      case 'tar':
      case 'gz':
      case '7z':
        return Icons.folder_zip;
      case 'epub':
      case 'mobi':
        return Icons.menu_book;
      case 'apk':
        return Icons.android;
      default:
        return Icons.insert_drive_file;
    }
  }

  Future<void> _tryAutoLogin() async {
    final prefs = await SharedPreferences.getInstance();

    final storageServer = await prefs.getString('storage_server');

    _baseUrl = '$storageServer/api'; // Replace with your default URL

    // Initialize FileService here after _baseUrl is set
    _fileService = FileService(_baseUrl, context);

    final cookies = prefs.getStringList('cookies');
    if (cookies != null && cookies.isNotEmpty) {
      await getData(); // Directly get data on auto-login
    } else {
      _navigateToLogin();
    }
  }

  Future<void> getData() async {
    final prefs = await SharedPreferences.getInstance();
    final userId = prefs.getString('user_id');
    final List<String>? cookies = prefs.getStringList('cookies');

    setState(() {
      _isLoading = true;
    });

    try {
      final request = http.Request(
        'POST',
        Uri.parse('$_baseUrl/files'),
      );
      request.headers.addAll(<String, String>{
        'Content-Type': 'application/json; charset=UTF-8',
      });
      if (cookies != null && cookies.isNotEmpty) {
        request.headers['Cookie'] = cookies.join('; ');
      }
      request.body = jsonEncode(<String, String>{'user_id': '$userId'});
      final http.StreamedResponse response = await http.Client().send(request);
      final int statusCode = response.statusCode;
      final String responseBody = await response.stream.bytesToString();
      if (statusCode == 200) {
        final List<dynamic> data = jsonDecode(responseBody);
        setState(() {
          fileData = data
              .map((item) => item as Map<String, dynamic>)
              .toList()
              .reversed
              .toList();
        });
      } else if (statusCode == 401) {
        _handleTokenExpiration(); // Directly handle token expiration
      } else {
        _handleOtherErrors(statusCode);
      }
    } catch (e) {
      _handleNetworkError(e);
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _navigateToLogin() {
    if (!context.mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => const Login()),
    );
  }

  Future<void> _handleTokenExpiration() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('cookies');
    await prefs.remove('user_id');
    await prefs.remove('user_name');
    await prefs.remove('user_email');
    _navigateToLogin();
  }

  Future<void> _handleOtherErrors(int statusCode) async {
    final prefs = await SharedPreferences.getInstance();
    if (!context.mounted) return;
    await prefs.remove('cookies');
    await prefs.remove('user_id');
    await prefs.remove('user_name');
    await prefs.remove('user_email');
    _navigateToLogin();
  }

  void _handleNetworkError(Object e) {
    print("Network error: ${e.toString()}");
  }

  void sheet(int index) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(10.0),
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.share),
              title: const Text("Share"),
              onTap: () {
                _fileService.handleShare(fileData[index]['file_id']);
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.download),
              title: const Text("Download"),
              onTap: () {
                Navigator.pop(context);

                _fileService.handleDownload(
                    fileData[index]['filename'], context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.edit),
              title: const Text("Rename"),
              onTap: () {
                Navigator.pop(context);
                showDialog(
                  context: context,
                  builder: (context) {
                    String newFilename = fileData[index]['filename'];
                    return AlertDialog(
                      title: Text("Rename $newFilename"),
                      content:
                          Column(mainAxisSize: MainAxisSize.min, children: [
                        TextField(
                          autofocus: true,
                          controller: TextEditingController(text: newFilename),
                          onChanged: (value) {
                            newFilename = value;
                          },
                        )
                      ]),
                      actions: [
                        TextButton(
                          onPressed: () {
                            Navigator.pop(context);
                          },
                          child: const Text("Cancel"),
                        ),
                        TextButton(
                          onPressed: () {
                            _fileService.handleRename(
                                fileData[index]['filename'],
                                newFilename,
                                _handleRefresh);
                            Navigator.pop(context);
                          },
                          child: const Text("Rename"),
                        ),
                      ],
                    );
                  },
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete),
              title: const Text("Delete"),
              onTap: () {
                _fileService.handleDelete(
                    fileData[index]['file_id'], _handleRefresh);
                Navigator.pop(context);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleRefresh() async {
    await getData();
    _refreshIndicatorKey.currentState?.deactivate();
  }

  Future<String> getUserInitial() async {
    final prefs = await SharedPreferences.getInstance();
    final username = prefs.getString('user_name');
    if (username != null && username.isNotEmpty) {
      return username.substring(0, 1).toUpperCase();
    }
    return '?';
  }

  void _showAccountDialog() async {
    final prefs = await SharedPreferences.getInstance();
    final username = prefs.getString('user_name') ?? 'Unknown User';
    final email = prefs.getString('user_email') ?? 'No Email';

    if (!context.mounted) return;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Account Info"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("👤 Username: $username"),
            const SizedBox(height: 5),
            Text("📧 Email: $email"),
          ],
        ),
        actions: [
          TextButton(
            onPressed: _handleLogout,
            child: const Text("Log Out", style: TextStyle(color: Colors.red)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Close"),
          ),
        ],
      ),
    );
  }

  Future<void> _handleLogout() async {
    final prefs = await SharedPreferences.getInstance();
    final url = prefs.getString('storage_server'); // Preserve the URL

    await prefs.clear(); // Clear all stored data

    if (url != null) {
      await prefs.setString(
          'storage_server', url); // Restore the URL after clearing
    }

    if (!context.mounted) return;

    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(
          builder: (context) => const Login()), // Navigate to login page
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Files'),
        actions: [
          GestureDetector(
            onTap: _showAccountDialog, // Open account info dialog

            child: CircleAvatar(
              radius: 18,
              child: FutureBuilder<String>(
                future: getUserInitial(),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const CircularProgressIndicator(strokeWidth: 2);
                  }
                  if (snapshot.hasError) {
                    return const Text('?');
                  }
                  return // Open account info dialog
                      Text(snapshot.data ?? '?');
                },
              ),
            ),
          ),
          SizedBox(
            width: 20,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _fileService.uploadFile(_handleRefresh, context),
        child: const Icon(Icons.add_rounded),
      ),
      body: RefreshIndicator(
        key: _refreshIndicatorKey,
        onRefresh: _handleRefresh,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : ListView.builder(
                itemCount: fileData.length,
                itemBuilder: (context, index) {
                  return ListTile(
                    leading: Icon(_getFileIcon(fileData[index]['filename'])),
                    title: Text(fileData[index]['filename']),
                    subtitle:
                        Text("Created at: ${fileData[index]['created_at']}"),
                    trailing: IconButton(
                      onPressed: () => sheet(index),
                      icon: const Icon(Icons.more_vert),
                    ),
                    onLongPress: () => sheet(index),
                  );
                },
              ),
      ),
    );
  }
}
