// lib/services/file_service.dart

import 'dart:async';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:mime/mime.dart';
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class FileService {
  final http.Client _httpClient = http.Client();
  String _baseUrl;
  final BuildContext context;

  FileService(this._baseUrl, this.context);

  Future<void> dispose() async {
    _httpClient.close();
  }

  Future<void> handleShare(String id) async {
    final prefs = await SharedPreferences.getInstance();
    final userId = prefs.getString('user_id') ?? '';
    final List<String>? cookies = prefs.getStringList('cookies');

    final storageServer = prefs.getString('storage_server');
    if (storageServer == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Storage server not configured')),
      );
      return;
    }
    _baseUrl = storageServer;

    try {
      final request = http.Request('POST', Uri.parse('$storageServer/gsl'));
      request.headers.addAll({
        'Content-Type': 'application/json; charset=UTF-8',
      });
      request.body = jsonEncode({
        'fileId': id,
        'owner_id': userId,
      });
      if (cookies != null && cookies.isNotEmpty) {
        request.headers['Cookie'] = cookies.join('; ');
      }
      final http.StreamedResponse response = await _httpClient.send(request);
      final int statusCode = response.statusCode;
      final String responseBody = await response.stream.bytesToString();

      if (statusCode == 200) {
        final Map<String, dynamic> responseData = jsonDecode(responseBody);
        await Clipboard.setData(
            ClipboardData(text: responseData["shareableLink"]));
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Sharable link copied to clipboard'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Error sharing file'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } catch (e) {
      print('Error in handleShare: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('An error occurred while sharing the file'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  Future<void> handleDownload(String filename) async {
    String url = "$_baseUrl/files/$filename/download";
    final dio = Dio();

    // Attempt to locate a Downloads directory.
    Directory? downloadsDir = Directory('/storage/emulated/0/Download');
    if (!downloadsDir.existsSync()) {
      downloadsDir = await getExternalStorageDirectory();
    }
    if (downloadsDir == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to access storage')),
      );
      return;
    }

    String folderPath = "${downloadsDir.path}/CycloneCloud";
    Directory(folderPath).createSync(recursive: true);
    String savePath = "$folderPath/$filename";

    // Use a ValueNotifier to update the progress dialog.
    final ValueNotifier<double> progressNotifier = ValueNotifier<double>(0.0);

    // Display a single progress dialog.
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          title: const Text("Downloading"),
          content: ValueListenableBuilder<double>(
            valueListenable: progressNotifier,
            builder: (context, progress, child) {
              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  LinearProgressIndicator(value: progress),
                  const SizedBox(height: 10),
                  Text("${(progress * 100).toStringAsFixed(0)}% completed"),
                ],
              );
            },
          ),
        );
      },
    );

    try {
      await dio.download(
        url,
        savePath,
        options: Options(responseType: ResponseType.bytes),
        onReceiveProgress: (received, total) {
          if (total != -1) {
            progressNotifier.value = received / total;
          }
        },
      );

      Navigator.of(context).pop(); // close the progress dialog

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Download completed: $savePath')),
      );

      OpenFile.open(savePath);
    } catch (e) {
      Navigator.of(context).pop(); // ensure the dialog is closed
      print('Error in handleDownload: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error downloading file')),
      );
    }
  }

  Future<void> handleRename(String filename, String newFilename,
      void Function() handleRefresh) async {
    final prefs = await SharedPreferences.getInstance();
    final userId = prefs.getString('user_id') ?? '';
    final List<String>? cookies = prefs.getStringList('cookies');

    try {
      final request =
          http.Request('PUT', Uri.parse('$_baseUrl/files/$filename/rename'));
      request.headers.addAll({
        'Content-Type': 'application/json; charset=UTF-8',
      });
      request.body = jsonEncode({
        'newName': newFilename,
        'owner_id': userId,
      });
      if (cookies != null && cookies.isNotEmpty) {
        request.headers['Cookie'] = cookies.join('; ');
      }
      final http.StreamedResponse response = await _httpClient.send(request);
      final int statusCode = response.statusCode;
      final String responseBody = await response.stream.bytesToString();

      if (statusCode == 200) {
        handleRefresh();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Successfully renamed file'),
            backgroundColor: Colors.green,
          ),
        );
        print('Rename response: $responseBody');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Error renaming file'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } catch (e) {
      print('Error in handleRename: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('An error occurred while renaming the file'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  Future<void> handleDelete(String id, void Function() handleRefresh) async {
    final prefs = await SharedPreferences.getInstance();
    final userId = prefs.getString('user_id') ?? '';
    final List<String>? cookies = prefs.getStringList('cookies');

    try {
      final request = http.Request('DELETE', Uri.parse('$_baseUrl/files/$id'));
      request.headers.addAll({
        'Content-Type': 'application/json; charset=UTF-8',
      });
      request.body = jsonEncode({
        'owner_id': userId,
      });
      if (cookies != null && cookies.isNotEmpty) {
        request.headers['Cookie'] = cookies.join('; ');
      }
      final http.StreamedResponse response = await _httpClient.send(request);
      final int statusCode = response.statusCode;
      final String responseBody = await response.stream.bytesToString();

      if (statusCode == 200) {
        handleRefresh();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('File deleted successfully'),
            backgroundColor: Colors.green,
          ),
        );

        print('Delete response: $responseBody');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Error deleting file'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } catch (e) {
      print('Error in handleDelete: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('An error occurred while deleting the file'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  Future<void> uploadFile(void Function() handleRefresh) async {
    FilePickerResult? result =
        await FilePicker.platform.pickFiles(allowMultiple: true);

    if (result != null && result.files.isNotEmpty) {
      List<PlatformFile> files = result.files;
      final prefs = await SharedPreferences.getInstance();
      final cookies = prefs.getStringList('cookies');

      try {
        var request = http.MultipartRequest(
          'POST',
          Uri.parse('$_baseUrl/upload'),
        );
        if (cookies != null && cookies.isNotEmpty) {
          request.headers['Cookie'] = cookies.join('; ');
        }

        for (PlatformFile file in files) {
          late Stream<List<int>> fileStream;
          if (file.readStream != null) {
            fileStream = file.readStream!;
          } else if (file.path != null) {
            fileStream = File(file.path!).openRead();
          } else if (file.bytes != null) {
            fileStream = Stream.fromIterable([file.bytes!]);
          } else {
            print("No valid file stream available for file: ${file.name}");
            continue;
          }

          final mimeType = lookupMimeType(file.name);
          final contentType = mimeType != null
              ? MediaType.parse(mimeType)
              : MediaType('application', 'octet-stream');

          request.files.add(http.MultipartFile(
            'files',
            fileStream,
            file.size,
            filename: file.name,
            contentType: contentType,
          ));
        }

        final http.StreamedResponse response = await request.send();
        final int statusCode = response.statusCode;

        if (statusCode == 200) {
          handleRefresh();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Files uploaded successfully!')),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Upload failed: $statusCode')),
          );
        }
      } catch (e) {
        _handleNetworkError(e);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Network error during upload.')),
        );
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('File upload canceled.')),
      );
    }
  }

  void _handleNetworkError(Object e) {
    print("Network error: ${e.toString()}");
  }
}
