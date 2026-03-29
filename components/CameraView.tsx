import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AppState } from '../types';

interface CameraViewProps {
  onCapture: (base64Image: string) => void;
  isLoading: boolean;
  appState: AppState;
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture, isLoading, appState }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorType, setErrorType] = useState<'permission' | 'notfound' | 'other' | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  
  const hasAutoCaptured = useRef<boolean>(false);

  // Reset auto-capture when starting fresh
  useEffect(() => {
    if (appState === AppState.IDLE) {
      hasAutoCaptured.current = false;
    }
  }, [appState]);

  // Initialize camera
  const initCamera = async () => {
    setErrorType(null);
    setHasPermission(null);

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Camera stream obtained:", mediaStream.id);
      
      setStream(mediaStream);
      setHasPermission(true);
      setCameraActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.error("Video play failed:", e));
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorType('notfound');
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorType('permission');
      } else {
        setErrorType('other');
      }
      setHasPermission(false);
      setCameraActive(false);
    }
  };

  // Ensure stream is attached when video element appears
  useEffect(() => {
    if (cameraActive && stream && videoRef.current) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => {
            if (e.name !== 'AbortError') console.error("Video play failed in effect:", e);
        });
      }
    }
  }, [cameraActive, stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleCapture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        // Wait for video to be ready
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            console.warn("Video dimensions not ready for capture");
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        console.log(`Capturing at ${canvas.width}x${canvas.height}`);
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(dataUrl.split(',')[1]);
      }
    }
  }, [onCapture]);


  // Auto-capture logic
  useEffect(() => {
    if (cameraActive && stream && videoRef.current && !hasAutoCaptured.current) {
      const timer = setTimeout(() => {
        if (cameraActive && stream && !isLoading) {
          console.log("Auto-capturing...");
          handleCapture();
          hasAutoCaptured.current = true;
        }
      }, 2000); // 2 second delay for focus

      return () => clearTimeout(timer);
    }
  }, [cameraActive, stream, handleCapture, isLoading]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          onCapture(result.split(',')[1]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (hasPermission === false) {
    const isNotFound = errorType === 'notfound';
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-800/50 rounded-3xl border border-slate-700 h-[400px] text-center">
        <div className="text-red-400 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isNotFound ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            )}
          </svg>
          <p className="text-lg font-bold text-slate-200">
            {isNotFound ? 'No Camera Detected' : 'Camera Access Required'}
          </p>
        </div>
        <p className="text-slate-400 text-sm max-w-xs mb-6">
          {isNotFound
            ? "We couldn't find a camera on this device. You can still use the app by uploading a photo."
            : "Camera access is needed to detect your mood. If you prefer, you can upload a photo instead."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-sm font-semibold transition-all"
          >
            Upload Photo
          </button>
          {!isNotFound && (
            <button
              onClick={initCamera}
              className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-full text-sm font-semibold transition-all"
            >
              Retry Camera
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!cameraActive) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-800/50 rounded-3xl border border-slate-700 h-[400px] text-center shadow-inner group">
        <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Camera Ready</h3>
        <p className="text-slate-400 text-sm max-w-sm mb-8 leading-relaxed">
          Open your camera to scan your mood, or upload a photo directly from your device.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-xs mx-auto">
          <button
            onClick={initCamera}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.103-1.103A1 1 0 0011.172 3H8.828a1 1 0 00-.707.293L7.017 4.414A1 1 0 016.31 4.707H4zm6 9a3 3 0 110-6 3 3 0 010 6z" clipRule="evenodd" />
            </svg>
            Open Camera
          </button>

          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-sm font-semibold transition-all border border-slate-600 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Upload Photo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group overflow-hidden rounded-3xl bg-black shadow-2xl ring-1 ring-slate-700/50">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-auto aspect-video object-contain scale-x-[-1] bg-slate-900 min-h-[300px]"
      />
      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col items-center justify-end pb-6 gap-3">
        <button
          onClick={handleCapture}
          disabled={isLoading || !hasPermission}
          className={`
            px-8 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2
            ${isLoading
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] hover:scale-105 active:scale-95'
            }
          `}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 mr-1" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.103-1.103A1 1 0 0011.172 3H8.828a1 1 0 00-.707.293L7.017 4.414A1 1 0 016.31 4.707H4zm3 10a3 3 0 116 0 3 3 0 01-6 0z" clipRule="evenodd" />
              </svg>
              Detect Mood
            </>
          )}
        </button>

        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4 transition-colors disabled:opacity-50"
        >
          or upload a photo
        </button>
      </div>
    </div>
  );
};

export default CameraView;
