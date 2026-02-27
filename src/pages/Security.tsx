import { Shield, Lock, Eye, AlertTriangle } from "lucide-react";
import Layout from "@/components/Layout";
import loungeHero from "@/assets/lounge-hero.jpg";

const protocols = [
  {
    icon: Shield,
    title: "Face Verification Protocol",
    description: "DeepFace-powered recognition with 95%+ confidence threshold. Multi-angle detection with anti-spoofing measures including liveness detection.",
    status: "Active",
  },
  {
    icon: Lock,
    title: "Data Encryption",
    description: "AES-256 encryption for all biometric data at rest. TLS 1.3 for data in transit. Face embeddings stored as encrypted vectors, never raw images.",
    status: "Active",
  },
  {
    icon: Eye,
    title: "Privacy Compliance",
    description: "GDPR and CCPA compliant. Biometric data auto-purged after 90 days of inactivity. Opt-in consent required for all members.",
    status: "Active",
  },
  {
    icon: AlertTriangle,
    title: "Incident Response",
    description: "Automated alerts for repeated denied entries. Security team notification within 30 seconds. Full audit trail with video correlation.",
    status: "Active",
  },
];

const SecurityPage = () => {
  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Security Protocols</h1>
          <p className="text-muted-foreground mt-1">System security documentation and compliance</p>
        </div>

        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden mb-8 h-48">
          <img src={loungeHero} alt="Premium lounge" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/40 flex items-center p-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">SkyGate Premium Access</h2>
              <p className="text-muted-foreground mt-1 max-w-md">Enterprise-grade biometric verification ensuring seamless and secure lounge entry for premium passengers.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {protocols.map((p) => (
            <div key={p.title} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/20 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <p.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold text-foreground">{p.title}</h3>
                    <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">{p.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{p.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default SecurityPage;
