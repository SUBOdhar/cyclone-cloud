import 'dart:async';
import 'dart:convert';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:cyclone_app/services/device_info.dart';
import 'package:dev_updater/dev_updater.dart';
import 'package:cyclone_app/pages/login_page.dart';
import 'package:cyclone_app/pages/server_set.dart';
import 'package:cyclone_app/services/file_preview.dart';
import 'package:cyclone_app/services/file_service.dart';
import 'package:cyclone_app/services/login_service.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:animations/animations.dart';
import 'package:flutter_slidable/flutter_slidable.dart';

const double _kGridItemImageSize = 100.0;
const double _kGridItemWidth = 120.0;

class Filespage extends StatefulWidget {
  const Filespage({super.key});

  @override
  State<Filespage> createState() => _FilespageState();
}

class _FilespageState extends State<Filespage> {
  List<Map<String, dynamic>> fileData = [];
  bool _isLoading = true;
  late FileService _fileService;
  final _foldernamecontroller = TextEditingController();
  late String _baseUrl;
  final GlobalKey<RefreshIndicatorState> _refreshIndicatorKey =
      GlobalKey<RefreshIndicatorState>();
  final GlobalKey<AnimatedListState> _listKey = GlobalKey<AnimatedListState>();

  @override
  void initState() {
    super.initState();
    DevUpdater().checkAndUpdate(context);
    _tryAutoLogin();
  }

  @override
  void dispose() {
    _fileService.dispose();
    _foldernamecontroller.dispose();
    super.dispose();
  }

  /// Returns an icon and color based on the file extension.
  (IconData, Color) _getFileIcon(
    String filename,
    String type,
  ) {
    final ext = filename.split('.').last.toLowerCase();
    Color iconColor = Colors.grey;
    if (type == "file") {
      switch (ext) {
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'bmp':
        case 'svg':
          return (Icons.image, Colors.blue.shade500);
        case 'pdf':
          return (Icons.picture_as_pdf, Colors.red.shade500);
        case 'doc':
        case 'docx':
        case 'odt':
          return (Icons.description, Colors.green.shade500);
        case 'xls':
        case 'xlsx':
        case 'csv':
          return (Icons.table_chart, Colors.green.shade700);
        case 'ppt':
        case 'pptx':
        case 'odp':
          return (Icons.slideshow, Colors.orange.shade500);
        case 'txt':
        case 'md':
          return (Icons.text_snippet, Colors.grey.shade500);
        case 'mp3':
        case 'wav':
        case 'ogg':
          return (Icons.audiotrack, Colors.purple.shade500);
        case 'mp4':
        case 'avi':
        case 'mov':
        case 'mkv':
          return (Icons.movie, Colors.red.shade500);
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
          return (Icons.code, Colors.grey.shade600);
        case 'zip':
        case 'rar':
        case 'tar':
        case 'gz':
        case '7z':
          return (Icons.folder_zip, Colors.amber.shade500);
        case 'epub':
        case 'mobi':
          return (Icons.menu_book, Colors.orange.shade700);
        case 'apk':
          return (Icons.android, Colors.green.shade500);
        default:
          return (Icons.insert_drive_file, iconColor);
      }
    } else {
      return (Icons.folder, iconColor);
    }
  }

  /// Attempts auto-login and initializes the file service.
  Future<void> _tryAutoLogin() async {
    final prefs = await SharedPreferences.getInstance();
    final storageServer = prefs.getString('storage_server');
    if (storageServer == null) {
      _navigateToServerSetup();
      return;
    }

    _baseUrl = '$storageServer/api';
    _fileService = FileService(_baseUrl, context);

    // Retrieve accessToken as a single string.
    final accessToken = prefs.getString('accessToken');
    if (accessToken != null && accessToken.isNotEmpty) {
      await getData();
    } else {
      _navigateToLogin();
    }
  }

  /// Fetches file data from the server.
  Future<void> getData([String folder = '']) async {
    final prefs = await SharedPreferences.getInstance();
    final userId = prefs.getString('user_id');
    final refreshToken = prefs.getString('refreshToken');
    final accessToken = prefs.getString('accessToken');

    setState(() {
      _isLoading = true;
    });

    final client = http.Client();
    try {
      final uri = Uri.parse('$_baseUrl/files');
      final request = http.Request('POST', uri);
      request.headers.addAll({
        'Content-Type': 'application/json; charset=UTF-8',
      });

      request.body = jsonEncode({
        'user_id': '$userId',
        'folder': folder,
        'device_name': await getDeviceName(),
        'refreshToken': '$refreshToken',
        'accessToken': '$accessToken',
      });

      final streamedResponse = await client.send(request);
      final statusCode = streamedResponse.statusCode;
      final responseBody = await streamedResponse.stream.bytesToString();
      if (statusCode == 200) {
        // Expecting a JSON array response.
        final Map<String, dynamic> responseMap = jsonDecode(responseBody);
        final List<dynamic> data = responseMap['items'] ??
            []; // Assuming the list is under the 'files' key
        fileData = data
            .map((item) => item as Map<String, dynamic>)
            .toList()
            .reversed
            .toList();
        if (mounted) setState(() {});
        print("File data: $fileData");
      } else if (statusCode == 401) {
        LoginService().reLogin(context);
      } else {
        await _handleOtherErrors(statusCode);
      }
    } catch (e) {
      _handleNetworkError(e);
    } finally {
      client.close();
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  /// Navigates to the login page.
  void _navigateToLogin() {
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => const Login()),
    );
  }

  /// Navigates to the server setup page.
  void _navigateToServerSetup() {
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => const ServerSetupScreen()),
    );
  }

  /// Handles non-200 server responses.
  Future<void> _handleOtherErrors(int statusCode) async {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Server error. Status code: $statusCode')),
    );
    _navigateToLogin();
  }

  /// Displays network error messages.
  void _handleNetworkError(Object e) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Network error. Please try again.')),
    );
    debugPrint("Network error: ${e.toString()}");
  }

  /// Opens a bottom sheet with actions for a file.
  void uploadsheet() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(10.0),
        child: SafeArea(
          child: Wrap(
            children: [
              ListTile(
                leading: const Icon(Icons.upload_file_rounded),
                title: const Text("Upload File"),
                onTap: () {
                  _fileService.uploadFile(
                      _handleRefresh, context, folderpath.join('/'));
                  Navigator.pop(context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.download),
                title: const Text("Create New Folder"),
                onTap: () {
                  Navigator.pop(context);
                  createFolder();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void createFolder() {
    showDialog(
        context: context,
        builder: (context) => AlertDialog(
              title: Text("Create new Folder"),
              content: TextField(
                controller: _foldernamecontroller,
                decoration: InputDecoration(label: Text('New Folder name:')),
              ),
              actions: [
                TextButton(
                    onPressed: () {
                      Navigator.pop(context);
                    },
                    child: Text('Cancel')),
                TextButton(
                    onPressed: () {
                      _fileService.handelFolderCreate(
                          folderpath, _foldernamecontroller.text);
                      _handleRefresh();
                      Navigator.pop(context);
                    },
                    child: Text("Create folder"))
              ],
            ));
  }

  /// Opens a bottom sheet with actions for a file.
  void sheet(int index) {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Padding(
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
                  _fileService.handleDownload(fileData[index]['name'], context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.edit),
                title: const Text("Rename"),
                onTap: () {
                  Navigator.pop(context);
                  _showRenameDialog(index);
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
      ),
    );
  }

  /// Displays a dialog for renaming a file.
  void _showRenameDialog(int index) {
    String newFilename = fileData[index]['name'];
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text("Rename $newFilename"),
          content: TextField(
            autofocus: true,
            controller: TextEditingController(text: newFilename),
            onChanged: (value) => newFilename = value,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Cancel"),
            ),
            TextButton(
              onPressed: () {
                _fileService.handleRename(
                  fileData,
                  index,
                  newFilename,
                  _reloadFileList,
                );
                Navigator.pop(context);
              },
              child: const Text("Rename"),
            ),
          ],
        );
      },
    );
  }

  /// Animates deletion of a file and calls the delete service.
  void _animateDelete(int index) {
    final removedItem = fileData[index];
    _listKey.currentState?.removeItem(
      index,
      (context, animation) =>
          _buildFileItem(context, index, animation, removedItem),
      duration: const Duration(milliseconds: 300),
    );
    _fileService.handleDelete(fileData, index, _reloadFileList);
  }

  /// Handles pull-to-refresh action.
  Future<void> _handleRefresh() async {
    await getData();
    _refreshIndicatorKey.currentState?.deactivate();
  }

  /// Retrieves the first letter of the username for the account avatar.
  Future<String> getUserInitial() async {
    final prefs = await SharedPreferences.getInstance();
    final username = prefs.getString('user_name');
    return (username != null && username.isNotEmpty)
        ? username.substring(0, 1).toUpperCase()
        : '?';
  }

  /// Refreshes the file list UI.
  void _reloadFileList() {
    if (mounted) setState(() {});
  }

  /// Displays an account information dialog.
  void _showAccountDialog() async {
    final prefs = await SharedPreferences.getInstance();
    final username = prefs.getString('user_name') ?? 'Unknown User';
    final email = prefs.getString('user_email') ?? 'No Email';

    if (!mounted) return;
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
            onPressed: _handleUnset,
            child: const Text("Unset"),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Close"),
          ),
        ],
      ),
    );
  }

  /// Handles user logout.
  Future<void> _handleLogout() async {
    final prefs = await SharedPreferences.getInstance();
    final serverUrl = prefs.getString('storage_server');
    await prefs.clear();
    if (serverUrl != null) {
      await prefs.setString('storage_server', serverUrl);
    }
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (context) => const Login()),
      (route) => false,
    );
  }

  /// Unsets user settings and navigates to the server setup page.
  Future<void> _handleUnset() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (context) => const ServerSetupScreen()),
      (route) => false,
    );
  }

  Widget buildFileGridView(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;

    // Calculate crossAxisCount based on screen width
    int crossAxisCount = 2; // Default
    if (screenWidth > 1200) {
      crossAxisCount = 7;
    } else if (screenWidth > 992) {
      crossAxisCount = 5;
    } else if (screenWidth > 600) {
      crossAxisCount = 4;
    } else {
      crossAxisCount = 2;
    }

    return GridView.builder(
      padding: const EdgeInsets.all(8.0),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount:
            crossAxisCount, // You can adjust the number of columns here
        crossAxisSpacing: 8.0,
        mainAxisSpacing: 8.0,
      ),
      itemCount: fileData.length,
      itemBuilder: (context, index) {
        return _buildGridItem(context, index);
      },
    );
  }

  var folderpath = <String>[];

  Future<void> openfolder(String foldername) async {
    folderpath.add(foldername);
    String newpath = '';

    if (folderpath.isNotEmpty) {
      newpath = folderpath.join('/');
    }

    getData(newpath);
  }

  Future<void> goback() async {
    folderpath.removeLast();
    String newpath = '';

    if (folderpath.isNotEmpty) {
      newpath = folderpath.join('/');
    }

    getData(newpath);
  }

  bool _isImage(String filename) {
    final String? extension = filename.split('.').lastOrNull?.toLowerCase();
    return [
      'jpg',
      'jpeg',
      'png',
    ].contains(extension);
  }

  Widget _buildGridItem(BuildContext context, int index) {
    final file = fileData[index];
    final (icon, color) = _getFileIcon(file['name'], file['type']);

    return InkWell(
      onTap: () {
        if (file['type'] == 'folder') {
          openfolder(file['name']);
        } else {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => FilePreview(
                file: file,
                filepath: folderpath,
              ),
            ),
          );
        }
      },
      onLongPress: () => sheet(index),
      child: GestureDetector(
        onSecondaryTap: () => sheet(index),
        child: SizedBox(
          width: _kGridItemWidth, // Use the defined width for consistency
          child: Card(
            elevation: 1,
            shape: RoundedRectangleBorder(
                borderRadius:
                    BorderRadius.circular(12)), // Added rounded corners to card
            child: Padding(
              padding: const EdgeInsets.all(8.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  // Image or Icon display area
                  _isImage(file['name'])
                      ? FutureBuilder<Widget>(
                          future: _image(folderpath, file['name'],
                              _kGridItemImageSize), // Pass desired size
                          builder: (context, snapshot) {
                            if (snapshot.connectionState ==
                                ConnectionState.waiting) {
                              return SizedBox(
                                width:
                                    _kGridItemImageSize, // Ensure consistent size for loading indicator
                                height: _kGridItemImageSize,
                                child: const Center(
                                    child: CircularProgressIndicator()),
                              );
                            } else if (snapshot.hasError) {
                              return SizedBox(
                                width:
                                    _kGridItemImageSize, // Ensure consistent size for error icon
                                height: _kGridItemImageSize,
                                child: const Icon(Icons.error,
                                    size: _kGridItemImageSize * 0.8,
                                    color: Colors
                                        .red), // Adjusted size for error icon
                              );
                            } else {
                              return snapshot.data ??
                                  SizedBox(
                                    // Fallback if snapshot.data is null, ensure size
                                    width: _kGridItemImageSize,
                                    height: _kGridItemImageSize,
                                    child: const Icon(Icons.image,
                                        size: _kGridItemImageSize * 0.8,
                                        color: Colors.grey),
                                  );
                            }
                          },
                        )
                      : Icon(icon,
                          color: color,
                          size:
                              _kGridItemImageSize), // Use consistent size for icons
                  const SizedBox(
                      height: 8), // Increased spacing for better readability
                  Text(
                    file['name'],
                    textAlign: TextAlign.center,
                    overflow: TextOverflow.ellipsis,
                    maxLines: 2, // Allow up to 2 lines for file names
                    style: const TextStyle(
                        fontSize: 12), // Smaller font for file names
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<Widget> _image(
      List<String> filepath, String filename, double desiredSize) async {
    final prefs = await SharedPreferences.getInstance();
    final userId = prefs.getString('user_id') ?? '';
    final storageServer = prefs.getString('storage_server') ?? '';

    String imageUrl;

    if (filepath.isNotEmpty) {
      imageUrl = '$storageServer/file/$userId/${filepath.join('/')}/$filename';
    } else {
      imageUrl = '$storageServer/file/$userId/$filename';
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: CachedNetworkImage(
        // Replaced FadeInImage.assetNetwork with CachedNetworkImage
        imageUrl: imageUrl,
        fit: BoxFit.cover,
        width: desiredSize,
        height: desiredSize,
        placeholder: (context, url) => Image.asset(
          'assets/placeholder.png', // Your asset placeholder
          width: desiredSize,
          height: desiredSize,
          fit: BoxFit.cover,
        ),
        errorWidget: (context, url, error) {
          // This errorWidget is for CachedNetworkImage itself.
          // The FutureBuilder's error handling might still be needed for broader errors.
          return Container(
            width: desiredSize,
            height: desiredSize,
            color: Colors.grey[200],
            child: Icon(Icons.broken_image,
                size: desiredSize * 0.8, color: Colors.grey),
          );
        },
      ),
    );
  }

  Widget _buildFileItem(
    BuildContext context,
    int index,
    Animation<double> animation, [
    Map<String, dynamic>? itemOverride,
  ]) {
    final file = itemOverride ?? fileData[index];
    if (file['type'] == 'file') {}
    final (icon, color) = _getFileIcon(file['name'], file['type']);
    final isDarkMode =
        MediaQuery.of(context).platformBrightness == Brightness.dark;
    final tileColor = isDarkMode
        ? Colors.black
        : Colors.white; // Background color for the ListTile
    final textColor = isDarkMode ? Colors.white : Colors.black;

    if (file['type'] == 'folder') {
      return SizeTransition(
        sizeFactor: animation,
        axis: Axis.vertical,
        child: Slidable(
          // Add Slidable
          key: Key(file['name']), // Unique key for each item
          startActionPane: ActionPane(
            // Define the actions that appear from the left
            motion: const ScrollMotion(),
            children: [
              SlidableAction(
                // A SlidableAction for deleting
                onPressed: (context) {
                  // Implement your delete logic here
                  print('Delete ${file['name']}');
                  // You'll need to remove the item from fileData and update the AnimatedList
                },
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
                icon: Icons.delete,
                label: 'Delete',
              ),
            ],
          ),
          endActionPane: ActionPane(
            motion: const ScrollMotion(),
            children: [
              SlidableAction(
                onPressed: (context) {
                  //impelement share
                  print('Share ${file['name']}');
                },
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
                icon: Icons.share,
                label: 'Share',
              ),
            ],
          ),
          child: Container(
            color: tileColor, // Apply background color
            child: Padding(
              padding: EdgeInsets.all(10),
              child: ListTile(
                leading: Icon(icon, color: color),
                title: Text(file['name'],
                    style: TextStyle(color: textColor)), // Set text color
                trailing: IconButton(
                  onPressed: () => sheet(index),
                  icon: Icon(Icons.more_vert,
                      color: isDarkMode
                          ? Colors.white
                          : Colors.black), // Set icon color
                ),
                onLongPress: () => sheet(index),
                onTap: () {
                  openfolder(file['name']);
                },
              ),
            ),
          ),
        ),
      );
    } else {
      return SizeTransition(
        sizeFactor: animation,
        axis: Axis.vertical,
        child: Slidable(
          key: Key(file['name']),
          startActionPane: ActionPane(
            motion: const ScrollMotion(),
            children: [
              SlidableAction(
                onPressed: (context) {
                  // Implement your delete logic here
                  print('Delete ${file['name']}');
                },
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
                icon: Icons.delete,
                label: 'Delete',
              ),
            ],
          ),
          endActionPane: ActionPane(
            motion: const ScrollMotion(),
            children: [
              SlidableAction(
                onPressed: (context) {
                  // Implement share
                  print('Share ${file['name']}');
                },
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
                icon: Icons.share,
                label: 'Share',
              ),
            ],
          ),
          child: OpenContainer(
            transitionDuration: const Duration(milliseconds: 500),
            openColor:
                isDarkMode ? Colors.black : Colors.white, // Match background
            closedColor: tileColor, // Apply background color
            closedElevation: 2,
            openElevation: 4,
            transitionType: ContainerTransitionType.fade,
            openBuilder: (context, _) => FilePreview(
              file: file,
              filepath: folderpath,
            ),
            closedBuilder: (context, openContainer) {
              return Container(
                color: tileColor,
                child: Padding(
                  padding: EdgeInsets.all(10),
                  child: ListTile(
                    leading: Icon(icon, color: color),
                    title: Text(file['name'],
                        style: TextStyle(color: textColor)), // Set text color

                    trailing: IconButton(
                      onPressed: () => sheet(index),
                      icon: Icon(Icons.more_vert,
                          color: isDarkMode
                              ? Colors.white
                              : Colors.black), // Set icon color
                    ),
                    onLongPress: () => sheet(index),
                    onTap: openContainer,
                  ),
                ),
              );
            },
          ),
        ),
      );
    }
  }

  /// Builds the animated list of files.
  Widget _buildFileList() {
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    return AnimatedList(
      key: _listKey,
      initialItemCount: fileData.length,
      itemBuilder: (context, index, animation) =>
          _buildFileItem(context, index, animation),
    );
  }

  bool isList = false;
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: folderpath.isNotEmpty
            ? IconButton(
                onPressed: () {
                  goback();
                },
                icon: Icon(Icons.arrow_back))
            : null,
        title: const Text('Files'),
        actions: [
          IconButton(
              onPressed: () {
                setState(() {
                  if (isList) {
                    isList = false;
                  } else {
                    isList = true;
                  }
                });
              },
              icon: Icon(isList ? Icons.grid_view_rounded : Icons.list)),
          SizedBox(
            width: 20,
          ),
          MouseRegion(
            cursor: SystemMouseCursors.click,
            child: GestureDetector(
              onTap: _showAccountDialog,
              child: Padding(
                padding: const EdgeInsets.only(right: 16.0),
                child: CircleAvatar(
                  radius: 18,
                  child: FutureBuilder<String>(
                    future: getUserInitial(),
                    builder: (context, snapshot) {
                      if (snapshot.connectionState == ConnectionState.waiting) {
                        return const CircularProgressIndicator(strokeWidth: 2);
                      }
                      return Text(snapshot.data ?? '?');
                    },
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => uploadsheet(),
        child: const Icon(Icons.add_rounded),
      ),
      body: RefreshIndicator(
        key: _refreshIndicatorKey,
        onRefresh: _handleRefresh,
        child: SafeArea(
          child: Stack(
            children: [
              if (isList) ...[
                _buildFileList()
              ] else ...[
                buildFileGridView(context)
              ]
            ],
          ),
        ),
      ),
    );
  }
}
