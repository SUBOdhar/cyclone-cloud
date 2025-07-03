import 'dart:io';

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import 'package:chewie/chewie.dart';

class CustomVideoPlayer extends StatefulWidget {
  final String videoUrl;
  final File? videoFile;
  final bool autoPlay;
  final bool looping;
  final Widget? placeholder;
  final Widget? overlay;
  final Function(VideoPlayerController controller)? onControllerInitialized;
  final bool ambientMode;
  final Duration ambientFadeDuration; // Added fade duration

  const CustomVideoPlayer({
    super.key,
    this.videoUrl = '',
    this.videoFile,
    this.autoPlay = false,
    this.looping = false,
    this.placeholder,
    this.overlay,
    this.onControllerInitialized,
    this.ambientMode = false,
    this.ambientFadeDuration =
        const Duration(milliseconds: 300), // Default fade duration
  });

  @override
  _CustomVideoPlayerState createState() => _CustomVideoPlayerState();
}

class _CustomVideoPlayerState extends State<CustomVideoPlayer> {
  late VideoPlayerController _videoPlayerController;
  ChewieController? _chewieController;
  double? _videoAspectRatio;
  bool _isAmbientMode = false;
  bool _controlsVisible = false; // Track control visibility

  @override
  void initState() {
    super.initState();
    _isAmbientMode = widget.ambientMode;
    _controlsVisible =
        !_isAmbientMode; // Initialize visibility based on ambient mode
    _initializeVideoPlayer();
  }

  @override
  void dispose() {
    _videoPlayerController.dispose();
    _chewieController?.dispose();
    super.dispose();
  }

  Future<void> _initializeVideoPlayer() async {
    try {
      if (widget.videoFile != null) {
        _videoPlayerController = VideoPlayerController.file(widget.videoFile!);
      } else if (widget.videoUrl.isNotEmpty) {
        _videoPlayerController =
            VideoPlayerController.networkUrl(Uri.parse(widget.videoUrl));
      } else {
        throw Exception('Either videoUrl or videoFile must be provided.');
      }

      await _videoPlayerController.initialize();
      if (widget.onControllerInitialized != null) {
        widget.onControllerInitialized!(_videoPlayerController);
      }

      _videoAspectRatio = _videoPlayerController.value.aspectRatio;

      _chewieController = ChewieController(

        videoPlayerController: _videoPlayerController,
        autoPlay: widget.autoPlay,
        looping: widget.looping,
        aspectRatio: _videoAspectRatio,
        placeholder: widget.placeholder ??
            const Center(child: CircularProgressIndicator()),
        overlay: widget.overlay,
        materialProgressColors: ChewieProgressColors(
          playedColor: Colors.red,
          handleColor: Colors.redAccent,
          backgroundColor: Colors.grey,
          bufferedColor: Colors.lightGreen,
        ),
        showControls: _controlsVisible,
      );

      setState(() {});
    } catch (e) {
      print('Error initializing video player: $e');
    }
  }

  void _toggleControls() {
    setState(() {
      _controlsVisible = !_controlsVisible;
      _chewieController =
          _chewieController?.copyWith(showControls: _controlsVisible);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_chewieController != null &&
        _chewieController!.videoPlayerController.value.isInitialized) {
      return GestureDetector(
        onTap: () {
          if (widget.ambientMode) {
            _toggleControls();
          }
        },
        child: AnimatedOpacity(
          // Added AnimatedOpacity
          opacity: _controlsVisible ? 1.0 : 0.0,
          duration: widget.ambientFadeDuration,
          child: Chewie(controller: _chewieController!),
        ),
      );
    } else {
      return AspectRatio(
        aspectRatio: _videoAspectRatio ?? 16 / 9,
        child: widget.placeholder ??
            const Center(child: CircularProgressIndicator()),
      );
    }
  }
}
