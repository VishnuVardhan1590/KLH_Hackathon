import { useState, useEffect } from "react";
import { Search, Plus, Filter, Trash2 } from "lucide-react";
import { Member, MAX_MEMBERS } from "@/lib/data";
import { MemberCard, TierBadge } from "@/components/MemberCard";
import Layout from "@/components/Layout";
import AddMemberModal from "@/components/AddMemberModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MembersPage = () => {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMembers = async () => {
    const { data } = await supabase.from("members").select("*").order("created_at", { ascending: false });
    if (data) setMembers(data);
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    const { error } = await supabase.from("members").delete().eq("id", id);
    setIsDeleting(false);

    if (error) {
      toast.error("Failed to delete member");
      console.error("Delete error:", error);
    } else {
      toast.success("Member deleted successfully");
      setSelectedMember(null);
      fetchMembers();
    }
  };

  const filtered = members.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
    const matchesTier = tierFilter === "all" || m.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  return (
    <Layout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Member Database</h1>
            <p className="text-muted-foreground mt-1">{members.length} / {MAX_MEMBERS} registered premium members</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={members.length >= MAX_MEMBERS}
            className="gold-gradient text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Add Member
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            {["all", "Platinum", "Gold", "Silver"].map((tier) => (
              <button
                key={tier}
                onClick={() => setTierFilter(tier)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  tierFilter === tier ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tier === "all" ? "All" : tier}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {filtered.map((member) => (
              <MemberCard key={member.id} member={member} onClick={() => setSelectedMember(member)} />
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                {members.length === 0 ? "No members yet. Click 'Add Member' to enroll." : "No members found"}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 h-fit sticky top-8">
            {selectedMember ? (
              <div className="fade-in space-y-5">
                <div className="text-center">
                  <img src={selectedMember.photo_url || ""} alt={selectedMember.name} className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-primary/30" />
                  <h2 className="font-display text-xl font-semibold text-foreground mt-3">{selectedMember.name}</h2>
                  <div className="mt-2"><TierBadge tier={selectedMember.tier} /></div>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    ["Email", selectedMember.email],
                    ["Passport", selectedMember.passport_number],
                    ["Nationality", selectedMember.nationality],
                    ["Member Since", selectedMember.member_since],
                    ["Total Flights", String(selectedMember.flights)],
                    ["Last Access", selectedMember.last_access || "—"],
                    ["Status", selectedMember.status],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between py-2 border-b border-border last:border-0">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="text-foreground font-medium">{value}</span>
                    </div>
                  ))}
                </div>
                
                <div className="pt-4 mt-4 border-t border-border">
                  <button
                    onClick={() => handleDelete(selectedMember.id)}
                    disabled={isDeleting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isDeleting ? "Deleting..." : "Delete Member"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Filter className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Select a member to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddMemberModal open={showAddModal} onClose={() => setShowAddModal(false)} onAdd={fetchMembers} memberCount={members.length} />
    </Layout>
  );
};

export default MembersPage;
