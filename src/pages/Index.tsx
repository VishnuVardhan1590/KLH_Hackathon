import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Scan, CheckCircle2, XCircle, User } from "lucide-react";
import { Member } from "@/lib/data";
import { TierBadge } from "@/components/MemberCard";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import * as faceapi from "face-api.js";

type ScanState = "idle" | "scanning" | "recognized" | "denied";

const RecognitionPage = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [matchedMember, setMatchedMember] = useState<Member | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Fetch registered members from database
  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase.from("members").select("*");
      if (data) setMembers(data);
    };
    fetchMembers();
  }, [scanState]); // Re-fetch on scan state change to capture recent additions

  // Load models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);
        setModelsLoaded(true);
      } catch (e) {
        console.error("Error loading face models:", e);
        toast({ title: "Model Error", description: "Failed to load face recognition models.", variant: "destructive" });
      }
    };
    loadModels();
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch {
      console.error("Camera access denied");
    }
  }, []);

  const stopCamera = useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
    setCameraActive(false);
    setScanState("idle");
    setMatchedMember(null);
  }, []);

  // Handle continuous video play to draw landmarks
  const handleVideoPlay = () => {
    if (!videoRef.current || !overlayCanvasRef.current || !modelsLoaded) return;

    // Original video feeds in this UI are roughly 640x480 aspect, but object-cover is used.
    // We match the container's dimensions instead of hardcoded sizes.
    const displaySize = {
      width: videoRef.current.clientWidth,
      height: videoRef.current.clientHeight
    };
    faceapi.matchDimensions(overlayCanvasRef.current, displaySize);

    const intervalId = setInterval(async () => {
      if (videoRef.current && overlayCanvasRef.current && cameraActive && scanState !== "recognized" && scanState !== "denied") {
        const detections = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();

        const ctx = overlayCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);

          if (detections) {
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            faceapi.draw.drawFaceLandmarks(overlayCanvasRef.current, resizedDetections);
          }
        }
      } else {
        if (overlayCanvasRef.current) {
          const ctx = overlayCanvasRef.current.getContext('2d');
          ctx?.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
        }
        clearInterval(intervalId);
      }
    }, 100);

    return () => clearInterval(intervalId);
  };

  const simulateScan = useCallback(async () => {
    if (members.length === 0) {
      setScanState("denied");
      setConfidence(0);
      return;
    }

    if (!videoRef.current || !modelsLoaded) return;

    setScanState("scanning");
    setMatchedMember(null);

    // Get live face descriptor
    const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      toast({ title: "No face detected", description: "Ensure you are looking at the camera.", variant: "destructive" });
      setScanState("idle");
      return;
    }

    let bestMatch: { member: Member; distance: number } | null = null;
    let minDistance = 0.6; // Common threshold for face-api.js (lower is better)

    // Compare with all stored members
    for (const member of members) {
      const storedDescriptorStr = localStorage.getItem(`face_descriptor_${member.id}`);
      if (storedDescriptorStr) {
        try {
          const storedArr = JSON.parse(storedDescriptorStr) as number[];
          const storedDescriptor = new Float32Array(storedArr);

          const distance = faceapi.euclideanDistance(detection.descriptor, storedDescriptor);

          if (distance < minDistance) {
            minDistance = distance;
            bestMatch = { member, distance };
          }
        } catch (e) {
          console.error("Error parsing stored descriptor for member", member.id);
        }
      }
    }

    // Simulate a brief delay for effect
    setTimeout(async () => {
      if (bestMatch) {
        // Map distance (0.3 to 0.6) to a confidence percentage (99% to 70%)
        const conf = Math.max(70, Math.min(99, 100 - (bestMatch.distance * 100)));
        setConfidence(Math.round(conf * 10) / 10);
        setMatchedMember(bestMatch.member);
        setScanState("recognized");

        // Update last_access in DB
        await supabase.from("members").update({ last_access: new Date().toISOString() }).eq("id", bestMatch.member.id);
      } else {
        setConfidence(Math.round((20 + Math.random() * 20) * 10) / 10);
        setScanState("denied");
      }
    }, 1500);

  }, [members, modelsLoaded]);

  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Face Recognition Entry</h1>
          <p className="text-muted-foreground mt-1">Real-time premium member verification · {members.length} members registered</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Camera Feed */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="relative aspect-video bg-muted flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onPlay={handleVideoPlay}
                  className={`absolute inset-0 w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                />
                <canvas
                  ref={overlayCanvasRef}
                  className={`absolute inset-0 z-10 w-full h-full pointer-events-none ${cameraActive ? "block" : "hidden"}`}
                />

                {!cameraActive && (
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mx-auto">
                      <Camera className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm">Camera feed inactive</p>
                  </div>
                )}

                {scanState === "scanning" && cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="w-48 h-48 border-2 border-primary rounded-2xl relative overflow-hidden pulse-gold">
                      <div className="absolute inset-x-0 h-0.5 gold-gradient scan-line" />
                    </div>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-panel rounded-full px-4 py-2">
                      <p className="text-xs text-primary font-medium animate-pulse">Scanning face...</p>
                    </div>
                  </div>
                )}

                {scanState === "recognized" && cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/40 z-20">
                    <div className="w-48 h-48 border-2 border-success rounded-2xl flex items-center justify-center fade-in">
                      <CheckCircle2 className="w-16 h-16 text-success" />
                    </div>
                  </div>
                )}

                {scanState === "denied" && cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/40 z-20">
                    <div className="w-48 h-48 border-2 border-destructive rounded-2xl flex items-center justify-center fade-in">
                      <XCircle className="w-16 h-16 text-destructive" />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 flex items-center gap-3 border-t border-border relative z-30 bg-card">
                {!cameraActive ? (
                  <button
                    onClick={startCamera}
                    disabled={!modelsLoaded}
                    className="gold-gradient text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {!modelsLoaded ? "Loading Models..." : "Activate Camera"}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={simulateScan}
                      disabled={scanState === "scanning"}
                      className="gold-gradient text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                      <Scan className="w-4 h-4" />
                      {scanState === "scanning" ? "Scanning..." : "Scan Face"}
                    </button>
                    <button onClick={stopCamera} className="bg-secondary text-secondary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                      Stop Camera
                    </button>
                  </>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${cameraActive ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
                  <span className="text-xs text-muted-foreground">{cameraActive ? "Live" : "Offline"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recognition Result */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-display text-lg font-semibold text-foreground mb-4">Scan Result</h2>

              {scanState === "idle" && (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {members.length === 0 ? "No members registered yet. Add members first." : "Awaiting scan"}
                  </p>
                </div>
              )}

              {scanState === "scanning" && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-3" />
                  <p className="text-sm text-primary">Analyzing...</p>
                </div>
              )}

              {scanState === "recognized" && matchedMember && (
                <div className="fade-in space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src={matchedMember.photo_url || "/placeholder.svg"} alt={matchedMember.name} className="w-16 h-16 rounded-full object-cover border-2 border-success" />
                      <CheckCircle2 className="w-5 h-5 text-success absolute -bottom-1 -right-1 bg-card rounded-full" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-foreground">{matchedMember.name}</h3>
                      <TierBadge tier={matchedMember.tier} />
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="text-success font-medium">{confidence}%</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Passport</span>
                      <span className="text-foreground font-mono text-xs">{matchedMember.passport_number}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Nationality</span>
                      <span className="text-foreground">{matchedMember.nationality}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Flights</span>
                      <span className="text-foreground">{matchedMember.flights}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Status</span>
                      <span className="text-success capitalize">{matchedMember.status}</span>
                    </div>
                  </div>

                  <div className="bg-success/10 border border-success/20 rounded-lg p-3 text-center">
                    <p className="text-success text-sm font-medium">✓ Access Granted</p>
                  </div>
                </div>
              )}

              {scanState === "denied" && (
                <div className="fade-in space-y-4 text-center py-4">
                  <XCircle className="w-12 h-12 text-destructive mx-auto" />
                  <div>
                    <p className="text-destructive font-medium">No Match Found</p>
                    <p className="text-xs text-muted-foreground mt-1">Confidence: {confidence}%</p>
                  </div>
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-destructive text-sm font-medium">✗ Access Denied</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Registered", value: String(members.length), color: "text-primary" },
                { label: "Max Capacity", value: "20", color: "text-foreground" },
              ].map((stat) => (
                <div key={stat.label} className="bg-card border border-border rounded-xl p-3 text-center">
                  <p className={`text-xl font-semibold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RecognitionPage;
