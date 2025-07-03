import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';
import 'package:cyclone_app/services/video_player.dart'; // Ensure this path is correct

class FilePreview extends StatelessWidget {
  final Map<String, dynamic> file;
  final List filepath;

  const FilePreview({super.key, required this.file, required this.filepath});

  Future<String> _getFileUrl() async {
    final filename = file['name'];
    final prefs = await SharedPreferences.getInstance();
    final userId = prefs.getString('user_id') ?? '';
    final storageServer = prefs.getString('storage_server') ?? '';
    if (filepath.isNotEmpty) {
      return '$storageServer/file/$userId/${filepath.join('/')}/$filename';
    }

    return '$storageServer/file/$userId/$filename';
  }

  Widget _buildPreviewContent(String ext, String fileUrl) {
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'svg':
        return InteractiveViewer(
          // Enables zoom and pan
          child: Center(
            child: FadeInImage.assetNetwork(
              placeholder: 'assets/placeholder.png',
              image: fileUrl,
              fit: BoxFit.contain,
              imageErrorBuilder: (context, error, stackTrace) {
                return const Center(child: Text('Image could not be loaded'));
              },
            ),
          ),
        );
      case 'pdf':
        return Padding(
          padding: const EdgeInsets.all(8.0),
          child: SfPdfViewer.network(
            fileUrl,
            canShowPageLoadingIndicator: true,
            enableDoubleTapZooming: true,
            enableTextSelection: true,
            enableDocumentLinkAnnotation: true,
            pageLayoutMode: PdfPageLayoutMode.continuous, // Improved scrolling
          ),
        );
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'mkv':
        return Center(
          // Center the video player
          child: CustomVideoPlayer(
            videoUrl: fileUrl,
            ambientMode: true,
            placeholder: Image.asset('assets/placeholder.png'),
          ),
        );
      default:
        return const Center(child: Text('Preview not available'));
    }
  }

  @override
  Widget build(BuildContext context) {
    final filename = file['name'];
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
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 60, color: Colors.red),
                  const SizedBox(height: 16),
                  const Text(
                    'Error loading file.',
                    style: TextStyle(fontSize: 18),
                  ),
                ],
              ),
            );
          }
          final fileUrl = snapshot.data!;
          return _buildPreviewContent(ext, fileUrl);
        },
      ),
    );
  }
}
