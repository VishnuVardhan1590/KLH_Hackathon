import { CheckCircle2, XCircle, Clock, Database } from "lucide-react";
import { TierBadge } from "@/components/MemberCard";
import Layout from "@/components/Layout";

const AccessLogPage = () => {
  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Access Log</h1>
          <p className="text-muted-foreground mt-1">Recent entry verification attempts</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <Database className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="font-display text-lg font-semibold text-foreground mb-2">Access logs coming soon</h2>
          <p className="text-sm text-muted-foreground">
            Register members and use face recognition to generate access logs.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default AccessLogPage;
