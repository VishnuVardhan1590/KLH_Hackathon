import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Scan, CheckCircle2, X, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MAX_MEMBERS } from "@/lib/data";
import { toast } from "@/hooks/use-toast";
import * as faceapi from "face-api.js";

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: () => void;
  memberCount: number;
}

type Step = "camera" | "scanning" | "captured" | "form";

const AddMemberModal = ({ open, onClose, onAdd, memberCount }: AddMemberModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState<Step>("camera");
  const [capturedPhoto, setCapturedPhoto] = useState<string>("");
  const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null);
  const [saving, setSaving] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", tier: "Silver" as "Platinum" | "Gold" | "Silver", passportNumber: "", nationality: "" });

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
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 480, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      console.error("Camera access denied");
    }
  }, []);

  const stopCamera = useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
  }, []);

  useEffect(() => {
    if (open && modelsLoaded) {
      setStep("camera");
      setCapturedPhoto("");
      setFaceDescriptor(null);
      setForm({ name: "", email: "", tier: "Silver", passportNumber: "", nationality: "" });
      setTimeout(() => startCamera(), 300);
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, modelsLoaded, startCamera, stopCamera]);

  // Handle continuous video play to draw landmarks
  const handleVideoPlay = () => {
    if (!videoRef.current || !overlayCanvasRef.current || !modelsLoaded) return;
    
    const displaySize = { width: 480, height: 480 };
    faceapi.matchDimensions(overlayCanvasRef.current, displaySize);

    const intervalId = setInterval(async () => {
      if (videoRef.current && overlayCanvasRef.current && step === "camera") {
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
        clearInterval(intervalId);
      }
    }, 100);

    return () => clearInterval(intervalId);
  };

  const handleScan = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;
    
    setStep("scanning");
    
    // Perform facial recognition extraction
    const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      toast({ title: "No face detected", description: "Please ensure your face is clearly visible.", variant: "destructive" });
      setStep("camera");
      return;
    }

    setFaceDescriptor(detection.descriptor);

    // Capture photo
    const canvas = canvasRef.current;
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 480, 480);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setCapturedPhoto(dataUrl);
    }
    
    stopCamera();
    setStep("captured");
    setTimeout(() => setStep("form"), 1200);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.passportNumber || !form.nationality) return;
    if (memberCount >= MAX_MEMBERS) {
      toast({ title: "Limit reached", description: `Maximum ${MAX_MEMBERS} members allowed.`, variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Upload photo to storage
      let photoUrl: string | null = null;
      if (capturedPhoto) {
        const blob = await (await fetch(capturedPhoto)).blob();
        const fileName = `${Date.now()}-${form.name.replace(/\s+/g, "-").toLowerCase()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("member-photos")
          .upload(fileName, blob, { contentType: "image/jpeg" });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("member-photos").getPublicUrl(uploadData.path);
        photoUrl = urlData.publicUrl;
      }

      const { data, error } = await supabase.from("members").insert({
        name: form.name,
        email: form.email,
        tier: form.tier,
        passport_number: form.passportNumber,
        nationality: form.nationality,
        photo_url: photoUrl,
      }).select("id").single();

      if (error) throw error;

      // Save face descriptor to local storage for frontend-only matching
      if (faceDescriptor && data) {
        localStorage.setItem(`face_descriptor_${data.id}`, JSON.stringify(Array.from(faceDescriptor)));
      }

      toast({ title: "Member registered", description: `${form.name} has been enrolled successfully.` });
      onAdd();
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm fade-in">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display text-lg font-semibold text-foreground">
            {step === "form" ? "Member Details" : "Face Enrollment"}
          </h2>
          <button onClick={() => { stopCamera(); onClose(); }} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!modelsLoaded && step === "camera" && (
            <div className="text-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading face recognition models...</p>
            </div>
          )}

          {modelsLoaded && (step === "camera" || step === "scanning") && (
            <div className="space-y-4">
              <div className="relative aspect-square max-w-xs mx-auto rounded-2xl overflow-hidden bg-muted">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  onPlay={handleVideoPlay}
                  className="w-full h-full object-cover" 
                />
                <canvas 
                  ref={overlayCanvasRef} 
                  className="absolute inset-0 z-10 w-full h-full object-cover pointer-events-none" 
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <div className={`w-48 h-48 rounded-full border-2 ${step === "scanning" ? "border-primary pulse-gold" : "border-muted-foreground/40"} transition-colors`}>
                    {step === "scanning" && (
                      <div className="absolute inset-x-0 h-0.5 gold-gradient scan-line rounded-full" />
                    )}
                  </div>
                </div>
                {step === "scanning" && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass-panel rounded-full px-4 py-2">
                    <p className="text-xs text-primary font-medium animate-pulse">Scanning face...</p>
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <p className="text-center text-sm text-muted-foreground">
                {step === "scanning" ? "Analyzing facial features..." : "Position your face within the circle"}
              </p>
              <button
                onClick={handleScan}
                disabled={step === "scanning"}
                className="w-full gold-gradient text-primary-foreground py-3 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Scan className="w-4 h-4" />
                {step === "scanning" ? "Scanning..." : "Scan & Capture Face"}
              </button>
            </div>
          )}

          {step === "captured" && (
            <div className="text-center space-y-4 fade-in py-4">
              <div className="relative w-32 h-32 mx-auto">
                <img src={capturedPhoto} alt="Captured" className="w-full h-full rounded-full object-cover border-2 border-success" />
                <CheckCircle2 className="w-8 h-8 text-success absolute -bottom-1 -right-1 bg-card rounded-full" />
              </div>
              <p className="text-success font-medium">Face captured successfully!</p>
              <p className="text-xs text-muted-foreground">Preparing enrollment form...</p>
            </div>
          )}

          {step === "form" && (
            <div className="space-y-4 fade-in">
              <div className="flex items-center gap-4 pb-4 border-b border-border">
                {capturedPhoto ? (
                  <img src={capturedPhoto} alt="Member" className="w-16 h-16 rounded-full object-cover border-2 border-success" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="text-sm text-success font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Face enrolled
                  </p>
                  <p className="text-xs text-muted-foreground">Complete the details below</p>
                </div>
              </div>

              {[
                { label: "Full Name", key: "name", placeholder: "e.g. Alexandra Chen", type: "text" },
                { label: "Email", key: "email", placeholder: "e.g. a.chen@email.com", type: "email" },
                { label: "Passport Number", key: "passportNumber", placeholder: "e.g. E8291034", type: "text" },
                { label: "Nationality", key: "nationality", placeholder: "e.g. Singapore", type: "text" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{field.label}</label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={form[field.key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              ))}

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Membership Tier</label>
                <div className="flex gap-2">
                  {(["Platinum", "Gold", "Silver"] as const).map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setForm((f) => ({ ...f, tier }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        form.tier === tier
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!form.name || !form.email || !form.passportNumber || !form.nationality || saving}
                className="w-full gold-gradient text-primary-foreground py-3 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
              >
                {saving ? "Registering..." : "Register Member"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;
