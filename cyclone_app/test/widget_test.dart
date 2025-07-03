import 'dart:async';
import 'dart:convert';
import 'package:cyclone_app/pages/Loginpage.dart';
import 'package:cyclone_app/services/file_service.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:animations/animations.dart';

class Filespage extends StatefulWidget {
  const Filespage({Key? key}) : super(key: key);

  @override
  State<Filespage> createState() => _FilespageState();
}

class _FilespageState extends State<Filespage> {
  List<Map<String, dynamic>> fileData = [];
  bool _isLoading = true;
  late FileService _fileService;
  late String _baseUrl;
  final GlobalKey<RefreshIndicatorState> _refreshIndicatorKey =
      GlobalKey<RefreshIndicatorState>();

  // GlobalKey for AnimatedList to enable removal animation.
  final GlobalKey<AnimatedListState> _listKey = GlobalKey<AnimatedListState>();

  @override
  void initState() {
    super.initState();
    _tryAutoLogin();
  }

  @override
  void dispose() {
    _fileService.dispose();
    super.dispose();
  }

  (IconData, Color) _getFileIcon(String filename) {
    final ext = filename.split('.').last.toLowerCase();
    Color iconColor = Colors.grey;

    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'svg':
        return (Icons.image, Colors.blue[500]!);
      case 'pdf':
        return (Icons.picture_as_pdf, Colors.red[500]!);
      case 'doc':
      case 'docx':
      case 'odt':
        return (Icons.description, Colors.green[500]!);
      case 'xls':
      case 'xlsx':
      case 'csv':
        return (Icons.table_chart, Colors.green[700]!);
      case 'ppt':
      case 'pptx':
      case 'odp':
        return (Icons.slideshow, Colors.orange[500]!);
      case 'txt':
      case 'md':
        return (Icons.text_snippet, Colors.grey[500]!);
      case 'mp3':
      case 'wav':
      case 'ogg':
        return (Icons.audiotrack, Colors.purple[500]!);
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'mkv':
        return (Icons.movie, Colors.red[500]!);
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
        return (Icons.code, Colors.grey[600]!);
      case 'zip':
      case 'rar':
      case 'tar':
      case 'gz':
      case '7z':
        return (Icons.folder_zip, Colors.amber[500] ?? iconColor);
      case 'epub':
      case 'mobi':
        return (Icons.menu_book, Colors.orange[700] ?? iconColor);
      case 'apk':
        return (Icons.android, Colors.green[500] ?? iconColor);
      default:
        return (Icons.insert_drive_file, iconColor);
    }
  }

  Future<void> _tryAutoLogin() async {
    final prefs = await SharedPreferences.getInstance();
    final storageServer = await prefs.getString('storage_server');
    _baseUrl = '$storageServer/api';
    _fileService = FileService(_baseUrl, context);
    final cookies = prefs.getStringList('cookies');
    if (cookies != null && cookies.isNotEmpty) {
      await getData();
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
      final request = http.Request('POST', Uri.parse('$_baseUrl/files'));
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
        // Rebuild the AnimatedList items.
        fileData = data
            .map((item) => item as Map<String, dynamic>)
            .toList()
            .reversed
            .toList();
        // If the AnimatedList is already built, you might want to reinsert items.
        setState(() {});
      } else if (statusCode == 401) {
        _handleTokenExpiration();
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

  Future<void> refreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    final storageServer = prefs.getString('storage_server');
    final cookies = prefs.getStringList('cookies');
    final accessToken = prefs.getString('accessToken');

    if (storageServer == null || cookies == null || accessToken == null) {
      // Handle missing data (e.g., redirect to login)
      print("Missing data for token refresh");
      _redirectToLogin();
      return;
    }

    // Extract refreshToken from cookies
    String? refreshTokenCookie;
    for (final cookie in cookies) {
      if (cookie.startsWith('refreshToken=')) {
        refreshTokenCookie = cookie;
        break;
      }
    }

    if (refreshTokenCookie == null) {
      // Handle missing refresh token (e.g., redirect to login)
      print("Refresh token cookie not found");
      _redirectToLogin();
      return;
    }

    final refreshToken =
        refreshTokenCookie.split('refreshToken=')[1].split(';')[0];

    try {
      final response = await http.post(
        Uri.parse('$storageServer/api/refresh'),
        headers: <String, String>{
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $refreshToken',
        },
      );

      if (response.statusCode == 200) {
        final setCookieHeader = response.headers['set-cookie'];
        if (cookies != null) {
          for (int i = 0; i < cookies.length; i++) {
            if (cookies[i].startsWith('token=')) {
              cookies[i] = setCookieHeader!; // Replace the token cookie
              break;
            }
          }
        }
        // Update cookies with new accessToken
        final newCookies = response.headers['set-cookie']?.split(', ');
        if (newCookies != null) {
          await prefs.setStringList('cookies', newCookies);
        }
      } else {
        // Handle refresh token failure (e.g., redirect to login)
        print('Refresh token failed: ${response.statusCode}');
        print(response.body);
        _redirectToLogin();
      }
    } catch (e) {
      print('Error refreshing token: $e');
      _redirectToLogin();
    }
  }

  void _redirectToLogin() {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Session expired. Please login again.')),
      );
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const Login()),
      );
    }
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
    print("Server error. Status code: $statusCode");
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Server error. Status code: $statusCode')),
      );
    }
    _navigateToLogin();
  }

  void _handleNetworkError(Object e) {
    print("Network error: ${e.toString()}");
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Network error. Please try again.')),
      );
    }
  }

  // Modified sheet to call _animateDelete for delete action.
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
                      content: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          TextField(
                            autofocus: true,
                            controller:
                                TextEditingController(text: newFilename),
                            onChanged: (value) {
                              newFilename = value;
                            },
                          )
                        ],
                      ),
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
                                fileData, index, newFilename, _reloadFileList);
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
                Navigator.pop(context);
                _animateDelete(index);
              },
            ),
          ],
        ),
      ),
    );
  }

  // Animate removal of the file item and call the delete service.
  void _animateDelete(int index) {
    final removedItem = fileData[index];
    // Remove item from AnimatedList with a SizeTransition animation.
    _listKey.currentState?.removeItem(
      index,
      (context, animation) =>
          _buildFileItem(context, index, animation, removedItem),
      duration: const Duration(milliseconds: 300),
    );
    // Call your file deletion service with the file id.
    _fileService.handleDelete(fileData, index, _reloadFileList);
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

  void _reloadFileList() {
    if (mounted) {
      setState(() {});
    }
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
    final url = prefs.getString('storage_server');

    await prefs.clear();

    if (url != null) {
      await prefs.setString('storage_server', url);
    }

    if (!context.mounted) return;

    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (context) => const Login()),
      (route) => false,
    );
  }

  // Build individual file item with animation.
  Widget _buildFileItem(
      BuildContext context, int index, Animation<double> animation,
      [Map<String, dynamic>? itemOverride]) {
    final file = itemOverride ?? fileData[index];
    final (icon, color) = _getFileIcon(file['filename']);
    return SizeTransition(
      sizeFactor: animation,
      axis: Axis.vertical,
      child: OpenContainer(
        transitionDuration: const Duration(milliseconds: 500),
        openColor: Colors.white,
        closedColor: Colors.white,
        closedElevation: 2,
        openElevation: 4,
        transitionType: ContainerTransitionType.fade,
        openBuilder: (context, _) => FilePreview(file: file),
        closedBuilder: (context, openContainer) {
          return ListTile(
            leading: Icon(icon, color: color),
            title: Text(file['filename']),
            subtitle: Text("Created at: ${file['created_at']}"),
            trailing: IconButton(
              onPressed: () => sheet(index),
              icon: const Icon(Icons.more_vert),
            ),
            onLongPress: () => sheet(index),
            onTap: openContainer,
          );
        },
      ),
    );
  }

  // Build the AnimatedList of file items.
  Widget _buildFileList() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    return AnimatedList(
      key: _listKey,
      initialItemCount: fileData.length,
      itemBuilder: (context, index, animation) {
        return _buildFileItem(context, index, animation);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Files'),
        actions: [
          GestureDetector(
            onTap: _showAccountDialog,
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
                  return Text(snapshot.data ?? '?');
                },
              ),
            ),
          ),
          const SizedBox(width: 20),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _fileService.uploadFile(_handleRefresh, context),
        child: const Icon(Icons.add_rounded),
      ),
      body: RefreshIndicator(
        key: _refreshIndicatorKey,
        onRefresh: _handleRefresh,
        child: _buildFileList(),
      ),
    );
  }
}

///
/// FilePreview Widget – displays the preview using a container transform transition
///
class FilePreview extends StatelessWidget {
  final Map<String, dynamic> file;

  const FilePreview({Key? key, required this.file}) : super(key: key);

  Future<String> _getFileUrl() async {
    final filename = file['filename'];
    final prefs = await SharedPreferences.getInstance();
    final userId = prefs.getString('user_id') ?? '';
    final storageServer = prefs.getString('storage_server') ?? '';
    return '$storageServer/images/$userId/$filename';
  }

  Widget _buildPreviewContent(String ext, String fileUrl) {
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'svg':
        return Image.network(
          fileUrl,
          fit: BoxFit.contain,
          loadingBuilder: (BuildContext context, Widget child,
              ImageChunkEvent? loadingProgress) {
            if (loadingProgress == null) return child;
            return Center(
              child: CircularProgressIndicator(
                value: loadingProgress.expectedTotalBytes != null
                    ? loadingProgress.cumulativeBytesLoaded /
                        loadingProgress.expectedTotalBytes!
                    : null,
              ),
            );
          },
          errorBuilder:
              (BuildContext context, Object exception, StackTrace? stackTrace) {
            return const Text('Image could not be loaded');
          },
        );
      case 'pdf':
        return const Center(child: Text('PDF preview not implemented'));
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'mkv':
        return const Center(child: Text('Video preview not implemented'));
      default:
        return const Center(child: Text('Preview not available'));
    }
  }

  @override
  Widget build(BuildContext context) {
    final filename = file['filename'];
    final ext = filename.split('.').last.toLowerCase();

    return Scaffold(
      appBar: AppBar(
        title: Text('Preview: $filename'),
      ),
      body: FutureBuilder<String>(
        future: _getFileUrl(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return const Center(child: Text('Error loading file'));
          }
          final fileUrl = snapshot.data!;
          return Center(
            child: _buildPreviewContent(ext, fileUrl),
          );
        },
      ),
    );
  }
}
