import { Member } from "@/lib/data";

const tierColors: Record<string, string> = {
  Platinum: "bg-primary/20 text-primary border-primary/30",
  Gold: "bg-warning/20 text-warning border-warning/30",
  Silver: "bg-muted text-muted-foreground border-border",
};

const TierBadge = ({ tier }: { tier: string }) => (
  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${tierColors[tier] || tierColors.Silver}`}>
    {tier}
  </span>
);

const MemberCard = ({ member, onClick }: { member: Member; onClick?: () => void }) => {
  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all duration-300 cursor-pointer group"
    >
      <div className="flex items-center gap-4">
        <img
          src={member.photo_url || "/placeholder.svg"}
          alt={member.name}
          className="w-14 h-14 rounded-full object-cover border-2 border-border group-hover:border-primary/50 transition-colors"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm font-semibold text-foreground truncate">{member.name}</h3>
            <TierBadge tier={member.tier} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{member.nationality} · {member.flights} flights</p>
          <p className="text-xs text-muted-foreground">{member.email}</p>
        </div>
        <div className="text-right">
          <div className={`w-2 h-2 rounded-full ml-auto mb-1 ${member.status === "active" ? "bg-success" : "bg-destructive"}`} />
          <p className="text-xs text-muted-foreground capitalize">{member.status}</p>
        </div>
      </div>
    </div>
  );
};

export { MemberCard, TierBadge };
